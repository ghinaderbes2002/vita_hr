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
import { AttendanceJustification, JustificationStatus } from "@/lib/api/attendance-justifications";
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
  HR_APPROVED: { label: "مقبول", className: "bg-green-100 text-green-800" },
  HR_REJECTED: { label: "مرفوض", className: "bg-red-100 text-red-800" },
  AUTO_REJECTED: { label: "مرفوض تلقائياً", className: "bg-red-100 text-red-800" },
};

function StatusBadge({ status }: { status: JustificationStatus }) {
  const cfg = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export default function MyJustificationsPage() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
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
      <PageHeader title="تبريراتي" description="تبريرات الحضور الخاصة بك" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>نوع التبرير</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>ملاحظات المدير</TableHead>
              <TableHead>ملاحظات HR</TableHead>
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
                  <TableCell className="max-w-xs text-sm">{item.descriptionAr}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.managerNotesAr || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.hrNotesAr || "-"}</TableCell>
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
