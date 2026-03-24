"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { useMyAlerts } from "@/lib/hooks/use-attendance-alerts";
import { useCreateJustification } from "@/lib/hooks/use-attendance-justifications";
import { AlertSeverityBadge } from "@/components/features/attendance/alert-severity-badge";
import { AlertStatusBadge } from "@/components/features/attendance/alert-status-badge";
import { AlertTypeBadge } from "@/components/features/attendance/alert-type-badge";
import { AttendanceAlert, AlertStatus } from "@/lib/api/attendance-alerts";
import { JustificationType } from "@/lib/api/attendance-justifications";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const JUSTIFIABLE_TYPES = ["LATE", "ABSENT", "EARLY_LEAVE", "MISSING_CLOCK_OUT"];

export default function MyAlertsPage() {
  const t = useTranslations();

  const justificationTypeLabels: Record<JustificationType, string> = {
    SICK: t("attendance.justificationTypes.sick"),
    EMERGENCY: t("attendance.justificationTypes.emergency"),
    OFFICIAL_MISSION: t("attendance.justificationTypes.officialMission"),
    TRANSPORTATION: t("attendance.justificationTypes.transportation"),
    OTHER: t("attendance.justificationTypes.other"),
  };
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"all" | AlertStatus>("all");

  // Justify dialog state
  const [justifyDialogOpen, setJustifyDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AttendanceAlert | null>(null);
  const [justType, setJustType] = useState<JustificationType>("SICK");
  const [descAr, setDescAr] = useState("");

  const LIMIT = 10;
  const queryParams = activeTab === "all" ? { page, limit: LIMIT } : { status: activeTab, page, limit: LIMIT };
  const { data, isLoading } = useMyAlerts(queryParams);
  const createJustification = useCreateJustification();

  const alerts = (data as any)?.items || (data as any)?.data?.items || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? (data as any)?.data?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const formatDate = (dateString: string) => {
    try { return format(new Date(dateString), "dd/MM/yyyy", { locale: ar }); }
    catch { return dateString; }
  };

  const openJustify = (alert: AttendanceAlert) => {
    setSelectedAlert(alert);
    setJustType("SICK");
    setDescAr("");
    setJustifyDialogOpen(true);
  };

  const submitJustification = async () => {
    if (!selectedAlert || !descAr.trim()) return;
    await createJustification.mutateAsync({
      alertId: selectedAlert.id,
      justificationType: justType,
      descriptionAr: descAr.trim(),
    });
    setJustifyDialogOpen(false);
    setSelectedAlert(null);
  };

  const renderTable = (filteredAlerts: AttendanceAlert[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("attendance.fields.date")}</TableHead>
            <TableHead>{t("attendance.alertFields.type")}</TableHead>
            <TableHead>{t("attendance.alertFields.message")}</TableHead>
            <TableHead>{t("attendance.alertFields.severity")}</TableHead>
            <TableHead>{t("attendance.fields.status")}</TableHead>
            <TableHead>{t("attendance.alertFields.resolutionNotes")}</TableHead>
            <TableHead className="w-[100px]">{t("attendance.justify")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : filteredAlerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">{t("common.noData")}</TableCell>
            </TableRow>
          ) : (
            filteredAlerts.map((alert: AttendanceAlert) => (
              <TableRow key={alert.id}>
                <TableCell className="font-medium">{formatDate(alert.date)}</TableCell>
                <TableCell><AlertTypeBadge type={alert.alertType} /></TableCell>
                <TableCell className="max-w-md">{alert.messageAr}</TableCell>
                <TableCell><AlertSeverityBadge severity={alert.severity} /></TableCell>
                <TableCell><AlertStatusBadge status={alert.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{alert.resolvedNotes || "-"}</TableCell>
                <TableCell>
                  {alert.status === "OPEN" && JUSTIFIABLE_TYPES.includes(alert.alertType) && (
                    <Button variant="outline" size="sm" onClick={() => openJustify(alert)}>
                      <FileText className="h-3.5 w-3.5 ml-1" />
                      {t("attendance.justify")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("attendance.myAlerts")} description={t("attendance.myAlertsDescription")} />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">{t("attendance.tabs.all")}</TabsTrigger>
          <TabsTrigger value="OPEN">{t("attendance.tabs.open")}</TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED">{t("attendance.tabs.acknowledged")}</TabsTrigger>
          <TabsTrigger value="RESOLVED">{t("attendance.tabs.resolved")}</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderTable(alerts)}</TabsContent>
        <TabsContent value="OPEN">{renderTable(alerts.filter((a: AttendanceAlert) => a.status === "OPEN"))}</TabsContent>
        <TabsContent value="ACKNOWLEDGED">{renderTable(alerts.filter((a: AttendanceAlert) => a.status === "ACKNOWLEDGED"))}</TabsContent>
        <TabsContent value="RESOLVED">{renderTable(alerts.filter((a: AttendanceAlert) => a.status === "RESOLVED"))}</TabsContent>
      </Tabs>

      {meta && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
      )}

      {/* Justify Dialog */}
      <Dialog open={justifyDialogOpen} onOpenChange={setJustifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("attendance.submitJustification.title")}</DialogTitle>
            <DialogDescription>
              {selectedAlert && `${selectedAlert.messageAr} — ${formatDate(selectedAlert.date)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("attendance.submitJustification.typeLabel")}</Label>
              <Select value={justType} onValueChange={(v) => setJustType(v as JustificationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(justificationTypeLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("attendance.submitJustification.descLabel")} *</Label>
              <Textarea
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder={t("attendance.submitJustification.placeholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustifyDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={submitJustification}
              disabled={!descAr.trim() || createJustification.isPending}
            >
              {createJustification.isPending ? t("attendance.submitJustification.submitting") : t("attendance.submitJustification.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
