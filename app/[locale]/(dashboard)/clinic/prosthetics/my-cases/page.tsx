"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Search, Eye, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { useProstheticsCases } from "@/lib/hooks/use-clinic-prosthetics";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ProstheticsCase, ProstheticsStatus } from "@/lib/api/clinic-prosthetics";

const STATUS_VALUES: ProstheticsStatus[] = [
  "INTAKE", "ASSESSMENT", "COMMITTEE_REVIEW", "COMMITTEE_APPROVED",
  "FITTING", "GAIT_ANALYSIS", "FINAL_EVALUATION", "DELIVERED",
  "FOLLOW_UP", "CLOSED", "CANCELLED",
];

const STATUS_LABEL: Record<ProstheticsStatus, string> = {
  INTAKE: "استقبال", ASSESSMENT: "تقييم", COMMITTEE_REVIEW: "مراجعة اللجنة",
  COMMITTEE_APPROVED: "اعتمدت اللجنة", FITTING: "تركيب", GAIT_ANALYSIS: "تحليل مشي",
  FINAL_EVALUATION: "تقييم نهائي", DELIVERED: "تسليم", FOLLOW_UP: "متابعة",
  CLOSED: "مغلقة", CANCELLED: "ملغاة",
};

const fmt = (d: string) => new Date(d).toLocaleDateString("ar");

export default function MyCasesPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuthStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProstheticsStatus | "all">("all");

  // Fetch all cases — filtered client-side by assigned prosthetist
  // ⚠️ Backend doesn't support practitioner filter yet — add ?assignedProsthetistId= when available
  const { data, isLoading } = useProstheticsCases({ limit: 200 });

  const all = (data?.items ?? []) as ProstheticsCase[];

  const mine = all.filter((c) => c.assignedProsthetistId === user?.id);

  const filtered = mine.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    if (!matchStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = c.patient ? `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase() : "";
    return name.includes(q) || (c.patient?.patientNumber ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="حالاتي"
        description={isLoading ? "جاري التحميل..." : `${mine.length} حالة مسندة إليك`}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="بحث باسم المريض أو رقمه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProstheticsStatus | "all")}
        >
          <option value="all">كل المراحل</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Activity className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{filtered.length} حالة</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Activity className="h-12 w-12 opacity-20" />
          <p className="text-sm">
            {mine.length === 0 ? "لا توجد حالات مسندة إليك" : "لا توجد نتائج للبحث"}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المريض</TableHead>
                  <TableHead>رقم المريض</TableHead>
                  <TableHead>نوع البتر</TableHead>
                  <TableHead>المرحلة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/${locale}/clinic/prosthetics/${c.id}`)}
                  >
                    <TableCell className="font-medium">
                      {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.patient?.patientNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.amputationType === "UPPER" ? "طرف علوي" : c.amputationType === "LOWER" ? "طرف سفلي" : "—"}
                      {c.amputationSide && ` · ${c.amputationSide === "RIGHT" ? "يمين" : c.amputationSide === "LEFT" ? "يسار" : "ثنائي"}`}
                    </TableCell>
                    <TableCell><CaseStatusBadge status={c.status} size="sm" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(c.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/clinic/prosthetics/${c.id}`); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
