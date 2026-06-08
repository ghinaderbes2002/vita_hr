"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import {
  useAllJustifications,
  useMyTeamJustifications,
  useManagerReviewJustification,
  useHrReviewJustification,
} from "@/lib/hooks/use-attendance-justifications";
import { useAuthStore } from "@/lib/stores/auth-store";
import { AttendanceJustification, JustificationStatus } from "@/lib/api/attendance-justifications";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";

const STATUS_CLASSES: Record<string, string> = {
  PENDING_MANAGER: "bg-yellow-100 text-yellow-800",
  PENDING_HR:      "bg-orange-100 text-orange-800",
  HR_APPROVED:     "bg-green-100 text-green-800",
  HR_REJECTED:     "bg-red-100 text-red-800",
  AUTO_REJECTED:   "bg-red-100 text-red-800",
};

const toCamelCase = (s: string) =>
  s.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export default function JustificationsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;
  const { user } = useAuthStore();
  const { hasPermission } = usePermissions();

  const isDirectManager = (user as any)?.roles?.some((r: any) =>
    ["DIRECT_MANAGER", "مدير مباشر"].includes(typeof r === "string" ? r : r?.name)
  );

  const canManagerReview = hasPermission("attendance.justifications.manager-review");
  const canHrReview = hasPermission("attendance.justifications.hr-review");

  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AttendanceJustification | null>(null);
  const [reviewType, setReviewType] = useState<"manager" | "hr">("manager");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [notes, setNotes] = useState("");

  const LIMIT = 10;
  const statusFilter = activeTab === "all" ? undefined : activeTab as JustificationStatus;
  const { data: allData, isLoading: allLoading } = useAllJustifications({ status: statusFilter, page, limit: LIMIT });
  const { data: teamData, isLoading: teamLoading } = useMyTeamJustifications({ status: statusFilter, page, limit: LIMIT });
  const data = isDirectManager ? teamData : allData;
  const isLoading = isDirectManager ? teamLoading : allLoading;
  const managerReview = useManagerReviewJustification();
  const hrReview = useHrReviewJustification();

  const items: AttendanceJustification[] = (data as any)?.items || (data as any)?.data?.items || (data as any)?.data || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? (data as any)?.data?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd/MM/yyyy", { locale: dateLocale }); }
    catch { return d; }
  };

  const openReview = (item: AttendanceJustification, type: "manager" | "hr", dec: "APPROVE" | "REJECT") => {
    setSelectedItem(item);
    setReviewType(type);
    setDecision(dec);
    setNotes("");
    setReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (!selectedItem) return;
    const payload = { id: selectedItem.id, data: { decision, notesAr: notes, notes } };
    if (reviewType === "manager") await managerReview.mutateAsync(payload);
    else await hrReview.mutateAsync(payload);
    setReviewDialogOpen(false);
  };

  const isPending = managerReview.isPending || hrReview.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("attendance.justificationsTitle")}
        description={t("attendance.justificationsDescription")}
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">{t("attendance.tabs.all")}</TabsTrigger>
          <TabsTrigger value="PENDING_MANAGER">{t("attendance.justificationStatuses.pendingManager")}</TabsTrigger>
          <TabsTrigger value="PENDING_HR">{t("attendance.justificationStatuses.pendingHr")}</TabsTrigger>
          <TabsTrigger value="HR_APPROVED">{t("attendance.justificationStatuses.hrApproved")}</TabsTrigger>
          <TabsTrigger value="HR_REJECTED">{t("attendance.justificationStatuses.hrRejected")}</TabsTrigger>
          <TabsTrigger value="AUTO_REJECTED">{t("attendance.justificationStatuses.autoRejected")}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("attendance.fields.employee")}</TableHead>
                  <TableHead>{t("attendance.fields.date")}</TableHead>
                  <TableHead>{t("attendance.justificationTypeLabel")}</TableHead>
                  <TableHead>{t("attendance.alertFields.description")}</TableHead>
                  <TableHead>{t("attendance.fields.status")}</TableHead>
                  {(canManagerReview || canHrReview) && <TableHead>{t("common.actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">{t("common.noData")}</TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">
                          {item.employee?.firstNameAr} {item.employee?.lastNameAr}
                        </div>
                        <div className="text-xs text-muted-foreground">{item.employee?.employeeNumber}</div>
                      </TableCell>
                      <TableCell>{item.alert?.date ? formatDate(item.alert.date) : "-"}</TableCell>
                      <TableCell>
                        {t(`attendance.justificationTypes.${toCamelCase(item.justificationType)}` as any, { defaultValue: item.justificationType })}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-sm">{item.descriptionAr}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CLASSES[item.status] || "bg-gray-100 text-gray-700"}>
                          {t(`attendance.justificationStatuses.${toCamelCase(item.status)}` as any, { defaultValue: item.status })}
                        </Badge>
                      </TableCell>
                      {(canManagerReview || canHrReview) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {canManagerReview && item.status === "PENDING_MANAGER" && (
                              <>
                                <Button size="sm" variant="default" onClick={() => openReview(item, "manager", "APPROVE")}>
                                  <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                                  {t("requests.actions.approve")}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openReview(item, "manager", "REJECT")}>
                                  <XCircle className="h-3.5 w-3.5 ml-1" />
                                  {t("requests.actions.reject")}
                                </Button>
                              </>
                            )}
                            {canHrReview && item.status === "PENDING_HR" && (
                              <>
                                <Button size="sm" variant="default" onClick={() => openReview(item, "hr", "APPROVE")}>
                                  <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                                  {t("requests.actions.approve")}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openReview(item, "hr", "REJECT")}>
                                  <XCircle className="h-3.5 w-3.5 ml-1" />
                                  {t("requests.actions.reject")}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {meta && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision === "APPROVE" ? t("attendance.approveJustification") : t("attendance.rejectJustification")}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.descriptionAr}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("attendance.reviewNotesLabel")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("attendance.reviewNotesPlaceholder")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={decision === "APPROVE" ? "default" : "destructive"}
              onClick={submitReview}
              disabled={isPending}
            >
              {isPending
                ? t("attendance.submitting")
                : decision === "APPROVE"
                  ? t("requests.actions.approve")
                  : t("requests.actions.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
