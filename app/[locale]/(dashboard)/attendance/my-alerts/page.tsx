"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAlerts } from "@/lib/hooks/use-attendance-alerts";
import { AlertSeverityBadge } from "@/components/features/attendance/alert-severity-badge";
import { AlertStatusBadge } from "@/components/features/attendance/alert-status-badge";
import { AlertTypeBadge } from "@/components/features/attendance/alert-type-badge";
import { AttendanceAlert, AlertStatus } from "@/lib/api/attendance-alerts";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function MyAlertsPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<"all" | AlertStatus>("all");

  const queryParams = activeTab === "all" ? {} : { status: activeTab };
  const { data, isLoading } = useMyAlerts(queryParams);

  const alerts = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ar });
    } catch {
      return dateString;
    }
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              </TableRow>
            ))
          ) : filteredAlerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {t("common.noData")}
              </TableCell>
            </TableRow>
          ) : (
            filteredAlerts.map((alert: AttendanceAlert) => (
              <TableRow key={alert.id}>
                <TableCell className="font-medium">
                  {formatDate(alert.date)}
                </TableCell>
                <TableCell>
                  <AlertTypeBadge type={alert.alertType} />
                </TableCell>
                <TableCell className="max-w-md">
                  {alert.messageAr}
                </TableCell>
                <TableCell>
                  <AlertSeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell>
                  <AlertStatusBadge status={alert.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {alert.resolvedNotes || "-"}
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
      <PageHeader
        title="تنبيهاتي"
        description="عرض التنبيهات المتعلقة بحضوري وانصرافي"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="OPEN">مفتوحة</TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED">تم الإقرار</TabsTrigger>
          <TabsTrigger value="RESOLVED">محلولة</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {renderTable(alerts)}
        </TabsContent>

        <TabsContent value="OPEN" className="space-y-4">
          {renderTable(alerts.filter((a: AttendanceAlert) => a.status === "OPEN"))}
        </TabsContent>

        <TabsContent value="ACKNOWLEDGED" className="space-y-4">
          {renderTable(alerts.filter((a: AttendanceAlert) => a.status === "ACKNOWLEDGED"))}
        </TabsContent>

        <TabsContent value="RESOLVED" className="space-y-4">
          {renderTable(alerts.filter((a: AttendanceAlert) => a.status === "RESOLVED"))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
