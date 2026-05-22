"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { usePhysioCases } from "@/lib/hooks/use-clinic-physio";
import { PhysioCase, PhysioStatus } from "@/lib/api/clinic-physio";

const LIMIT = 15;

const STATUS_OPTIONS: { value: PhysioStatus; label: string }[] = [
  { value: "COMPLAINT", label: "شكوى" },
  { value: "PAIN_MAP", label: "خريطة الألم" },
  { value: "MEDICAL_HISTORY", label: "التاريخ الطبي" },
  { value: "GOALS", label: "الأهداف" },
  { value: "POSTURAL_ASSESSMENT", label: "التقييم الوضعي" },
  { value: "TREATMENT_PLAN", label: "خطة العلاج" },
  { value: "ACTIVE_SESSIONS", label: "جلسات نشطة" },
  { value: "COMPLETED", label: "مكتملة" },
  { value: "CANCELLED", label: "ملغاة" },
];

export default function PhysioListPage() {
  const router = useRouter();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PhysioStatus | "all">("all");

  const { data, isLoading } = usePhysioCases({
    page,
    limit: LIMIT,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const cases = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="العلاج الفيزيائي"
        description="حالات العلاج الفيزيائي في العيادة"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المريض</TableHead>
              <TableHead className="text-right">رقم المريض</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">المعالج</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState icon={Heart} title="لا توجد حالات" description="ستظهر هنا حالات العلاج الفيزيائي" />
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c: PhysioCase) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/${locale}/clinic/physio/${c.id}`)}
                >
                  <TableCell className="font-medium">
                    {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {c.patient?.patientNumber ?? "—"}
                  </TableCell>
                  <TableCell><CaseStatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.assignedTherapistId ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("ar")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
