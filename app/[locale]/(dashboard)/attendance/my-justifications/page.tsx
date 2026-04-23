"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { useMyJustifications } from "@/lib/hooks/use-attendance-justifications";
import { AttendanceJustification } from "@/lib/api/attendance-justifications";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const STATUS_CLASS: Record<string, string> = {
  PENDING_MANAGER: "bg-yellow-100 text-yellow-800",
  MANAGER_APPROVED: "bg-blue-100 text-blue-800",
  PENDING_HR: "bg-orange-100 text-orange-800",
  HR_APPROVED: "bg-green-100 text-green-800",
  HR_REJECTED: "bg-red-100 text-red-800",
  AUTO_REJECTED: "bg-red-100 text-red-800",
};

export default function MyJustificationsPage() {
  const t = useTranslations();
  const [page, setPage] = useState(1);

  const typeLabels: Record<string, string> = {
    SICK: t("attendance.justificationTypes.sick"),
    EMERGENCY: t("attendance.justificationTypes.emergency"),
    OFFICIAL_MISSION: t("attendance.justificationTypes.officialMission"),
    TRANSPORTATION: t("attendance.justificationTypes.transportation"),
    OTHER: t("attendance.justificationTypes.other"),
  };

  const statusLabels: Record<string, string> = {
    PENDING_MANAGER: t("attendance.justificationStatuses.pendingManager"),
    MANAGER_APPROVED: t("attendance.justificationStatuses.managerApproved"),
    PENDING_HR: t("attendance.justificationStatuses.pendingHr"),
    HR_APPROVED: t("attendance.justificationStatuses.hrApproved"),
    HR_REJECTED: t("attendance.justificationStatuses.hrRejected"),
    AUTO_REJECTED: t("attendance.justificationStatuses.autoRejected"),
  };
  const LIMIT = 10;

  const { data, isLoading } = useMyJustifications({ page, limit: LIMIT });

  const items: AttendanceJustification[] = (data as any)?.items || (data as any)?.data?.items || (data as any)?.data || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? (data as any)?.data?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const formatDate = (d: string) => {
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ar }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("attendance.myJustificationsTitle")} description={t("attendance.myJustificationsDescription")} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("attendance.fields.date")}</TableHead>
              <TableHead>{t("attendance.submitJustification.typeLabel")}</TableHead>
              <TableHead>{t("attendance.alertFields.description")}</TableHead>
              <TableHead>{t("attendance.fields.status")}</TableHead>
              <TableHead>{t("attendance.alertFields.managerNotes")}</TableHead>
              <TableHead>{t("attendance.alertFields.hrNotes")}</TableHead>
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
                  <TableCell className="font-medium">
                    {item.alert?.date ? formatDate(item.alert.date) : "-"}
                  </TableCell>
                  <TableCell>{typeLabels[item.justificationType] || item.justificationType}</TableCell>
                  <TableCell className="max-w-48 truncate text-sm">{item.descriptionAr}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_CLASS[item.status] || "bg-gray-100 text-gray-700"}>
                      {statusLabels[item.status] || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-36 truncate text-sm text-muted-foreground">{item.managerNotesAr || "-"}</TableCell>
                  <TableCell className="max-w-36 truncate text-sm text-muted-foreground">{item.hrNotesAr || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
