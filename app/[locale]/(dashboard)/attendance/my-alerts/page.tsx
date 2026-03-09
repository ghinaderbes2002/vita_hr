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

const justificationTypeLabels: Record<JustificationType, string> = {
  SICK: "مرض",
  EMERGENCY: "طارئ",
  OFFICIAL_MISSION: "مهمة رسمية",
  TRANSPORTATION: "مشكلة مواصلات",
  OTHER: "أخرى",
};

export default function MyAlertsPage() {
  const t = useTranslations();
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
            <TableHead>التاريخ</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الرسالة</TableHead>
            <TableHead>الشدة</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>ملاحظات الحل</TableHead>
            <TableHead className="w-[100px]">تبرير</TableHead>
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
                      تبرير
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
      <PageHeader title="تنبيهاتي" description="عرض التنبيهات المتعلقة بحضوري وانصرافي" />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="OPEN">مفتوحة</TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED">تم الإقرار</TabsTrigger>
          <TabsTrigger value="RESOLVED">محلولة</TabsTrigger>
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
            <DialogTitle>تقديم تبرير</DialogTitle>
            <DialogDescription>
              {selectedAlert && `${selectedAlert.messageAr} — ${formatDate(selectedAlert.date)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع التبرير</Label>
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
              <Label>وصف التبرير *</Label>
              <Textarea
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder="اكتب سبب التأخير أو الغياب..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustifyDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={submitJustification}
              disabled={!descAr.trim() || createJustification.isPending}
            >
              {createJustification.isPending ? "جاري الإرسال..." : "إرسال التبرير"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
