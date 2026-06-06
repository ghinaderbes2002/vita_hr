"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Search, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { usePhysioCases } from "@/lib/hooks/use-clinic-physio";
import { useAuthStore } from "@/lib/stores/auth-store";
import { PhysioCase, PhysioStatus } from "@/lib/api/clinic-physio";

const STATUS_VALUES: PhysioStatus[] = [
  "INTAKE", "COMPLAINT", "PAIN_MAP", "MEDICAL_HISTORY", "GOALS",
  "POSTURAL_ASSESSMENT", "TREATMENT_PLAN", "SUPERVISOR_REVIEW",
  "DOCTOR_SIGN", "ACTIVE_TREATMENT", "COMPLETED", "DISCHARGED", "CANCELLED",
];

const STATUS_LABEL: Record<PhysioStatus, string> = {
  INTAKE: "استقبال", COMPLAINT: "شكوى", PAIN_MAP: "خريطة الألم",
  MEDICAL_HISTORY: "التاريخ الطبي", GOALS: "الأهداف",
  POSTURAL_ASSESSMENT: "تقييم وضعي", TREATMENT_PLAN: "خطة العلاج",
  SUPERVISOR_REVIEW: "رئيس القسم", DOCTOR_SIGN: "توقيع الطبيب",
  ACTIVE_TREATMENT: "جلسات نشطة", COMPLETED: "مكتملة",
  DISCHARGED: "مُخرَّج", CANCELLED: "ملغاة",
};

const fmt = (d: string) => new Date(d).toLocaleDateString("ar");

export default function MyPhysioCasesPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuthStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PhysioStatus | "all">("all");

  // Fetch all cases — filtered client-side by assigned therapist
  // ⚠️ Backend doesn't support practitioner filter yet — add ?assignedTherapistId= when available
  const { data, isLoading } = usePhysioCases({ limit: 200 });

  const all = (data?.items ?? []) as PhysioCase[];

  const mine = all.filter((c) => c.physiotherapistId === user?.id || c.physiotherapistId === user?.employeeId);

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
        title="حالاتي — فيزيائي"
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
          onChange={(e) => setStatusFilter(e.target.value as PhysioStatus | "all")}
        >
          <option value="all">كل المراحل</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Heart className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{filtered.length} حالة</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Heart className="h-12 w-12 opacity-20" />
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
                  <TableHead>المرحلة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/${locale}/clinic/physio/${c.id}`)}
                  >
                    <TableCell className="font-medium">
                      {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.patient?.patientNumber ?? "—"}
                    </TableCell>
                    <TableCell><CaseStatusBadge status={c.status} size="sm" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(c.createdAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(c.updatedAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/clinic/physio/${c.id}`); }}
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
