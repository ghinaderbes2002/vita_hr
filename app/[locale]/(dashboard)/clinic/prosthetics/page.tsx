"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Search, Eye, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { useProstheticsCases } from "@/lib/hooks/use-clinic-prosthetics";
import { ProstheticsCase, ProstheticsStatus } from "@/lib/api/clinic-prosthetics";

const LIMIT = 15;

const AMPUTATION_TYPE_LABEL: Record<string, string> = { UPPER: "طرف علوي", LOWER: "طرف سفلي" };
const AMPUTATION_SIDE_LABEL: Record<string, string> = { RIGHT: "أيمن", LEFT: "أيسر", BILATERAL: "ثنائي" };

const STATUS_OPTIONS: { value: ProstheticsStatus; label: string }[] = [
  { value: "INTAKE", label: "استقبال" },
  { value: "ASSESSMENT", label: "تقييم" },
  { value: "COMMITTEE_REVIEW", label: "مراجعة اللجنة" },
  { value: "COMMITTEE_APPROVED", label: "اعتمدت اللجنة" },
  { value: "FITTING", label: "تركيب" },
  { value: "GAIT_ANALYSIS", label: "تحليل مشي" },
  { value: "FINAL_EVALUATION", label: "تقييم نهائي" },
  { value: "DELIVERED", label: "تم التسليم" },
  { value: "FOLLOW_UP", label: "متابعة" },
  { value: "CLOSED", label: "مغلقة" },
  { value: "CANCELLED", label: "ملغاة" },
];

export default function ProstheticsListPage() {
  const router = useRouter();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProstheticsStatus | "all">("all");

  const { data, isLoading } = useProstheticsCases({
    page,
    limit: LIMIT,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const cases = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأطراف الصناعية"
        description="حالات الأطراف الصناعية في العيادة"
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
              <TableHead className="text-right">نوع البتر</TableHead>
              <TableHead className="text-right">الجانب</TableHead>
              <TableHead className="text-right">مستوى البتر</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState icon={Activity} title="لا توجد حالات" description="ستظهر هنا حالات الأطراف الصناعية" />
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c: ProstheticsCase) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/${locale}/clinic/prosthetics/${c.id}`)}
                >
                  <TableCell className="font-medium">
                    {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {c.patient?.patientNumber ?? "—"}
                  </TableCell>
                  <TableCell><CaseStatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    {c.amputationType
                      ? <Badge variant="outline" className="text-xs">{AMPUTATION_TYPE_LABEL[c.amputationType]}</Badge>
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {c.amputationSide ? AMPUTATION_SIDE_LABEL[c.amputationSide] : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{c.amputationLevel ?? "—"}</TableCell>
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
