"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  useManagerReviewJustification,
  useHrReviewJustification,
} from "@/lib/hooks/use-attendance-justifications";
import { AttendanceJustification, JustificationStatus } from "@/lib/api/attendance-justifications";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  SICK: "مرض",
  EMERGENCY: "طارئ",
  OFFICIAL_MISSION: "مهمة رسمية",
  TRANSPORTATION: "مشكلة مواصلات",
  OTHER: "أخرى",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING_MANAGER: { label: "بانتظار المدير", className: "bg-yellow-100 text-yellow-800" },
  MANAGER_APPROVED: { label: "موافقة المدير", className: "bg-blue-100 text-blue-800" },
  PENDING_HR: { label: "بانتظار HR", className: "bg-orange-100 text-orange-800" },
  HR_APPROVED: { label: "موافقة HR", className: "bg-green-100 text-green-800" },
  HR_REJECTED: { label: "مرفوض من HR", className: "bg-red-100 text-red-800" },
  AUTO_REJECTED: { label: "مرفوض تلقائياً", className: "bg-red-100 text-red-800" },
};

function StatusBadge({ status }: { status: JustificationStatus }) {
  const cfg = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export default function JustificationsPage() {
  const t = useTranslations();
  const { hasPermission } = usePermissions();

  const canManagerReview = hasPermission("attendance.justifications.manager-review");
  const canHrReview = hasPermission("attendance.justifications.hr-review");

  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AttendanceJustification | null>(null);
  const [reviewType, setReviewType] = useState<"manager" | "hr">("manager");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [notes, setNotes] = useState("");

  const LIMIT = 10;
  const statusFilter = activeTab === "all" ? undefined : activeTab as JustificationStatus;
  const { data, isLoading } = useAllJustifications({ status: statusFilter, page, limit: LIMIT });
  const managerReview = useManagerReviewJustification();
  const hrReview = useHrReviewJustification();

  const items: AttendanceJustification[] = (data as any)?.items || (data as any)?.data?.items || (data as any)?.data || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? (data as any)?.data?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ar }); }
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
      <PageHeader title="تبريرات الحضور" description="مراجعة تبريرات الموظفين" />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="PENDING_MANAGER">بانتظار المدير</TabsTrigger>
          <TabsTrigger value="PENDING_HR">بانتظار HR</TabsTrigger>
          <TabsTrigger value="HR_APPROVED">موافق</TabsTrigger>
          <TabsTrigger value="HR_REJECTED">مرفوض</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>نوع التبرير</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الحالة</TableHead>
                  {(canManagerReview || canHrReview) && <TableHead>إجراء</TableHead>}
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
                      <TableCell>{typeLabels[item.justificationType] || item.justificationType}</TableCell>
                      <TableCell className="max-w-xs text-sm">{item.descriptionAr}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      {(canManagerReview || canHrReview) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {canManagerReview && item.status === "PENDING_MANAGER" && (
                              <>
                                <Button size="sm" variant="default" onClick={() => openReview(item, "manager", "APPROVE")}>
                                  <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                                  قبول
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openReview(item, "manager", "REJECT")}>
                                  <XCircle className="h-3.5 w-3.5 ml-1" />
                                  رفض
                                </Button>
                              </>
                            )}
                            {canHrReview && item.status === "PENDING_HR" && (
                              <>
                                <Button size="sm" variant="default" onClick={() => openReview(item, "hr", "APPROVE")}>
                                  <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                                  قبول
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openReview(item, "hr", "REJECT")}>
                                  <XCircle className="h-3.5 w-3.5 ml-1" />
                                  رفض
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
              {decision === "APPROVE" ? "قبول التبرير" : "رفض التبرير"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.descriptionAr}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظاتك..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>إلغاء</Button>
            <Button
              variant={decision === "APPROVE" ? "default" : "destructive"}
              onClick={submitReview}
              disabled={isPending}
            >
              {isPending ? "جاري الإرسال..." : decision === "APPROVE" ? "قبول" : "رفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
