"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useDepartments } from "@/lib/hooks/use-departments";
import { isClinicalDepartmentCode, isClinicalDepartmentName } from "@/lib/clinic/departments";
import {
  useAppointmentStatistics, useExportAppointmentStatistics,
} from "@/lib/hooks/use-clinic-appointments";
import { AppointmentStatisticsRow } from "@/lib/api/clinic-appointments";

/** أول وآخر يوم من الشهر الحالي، بصيغة YYYY-MM-DD. */
function currentMonthRange() {
  const now = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    to:   iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

// الرد يسمّي بعض الأعمدة بأكثر من اسم محتمل، فتُقرأ بأول اسم موجود.
const patientOf    = (r: AppointmentStatisticsRow) => r.patientName ?? r.patientNumber ?? "—";
const departmentOf = (r: AppointmentStatisticsRow) => r.department ?? r.departmentName ?? "—";
const serviceOf    = (r: AppointmentStatisticsRow) => r.serviceType ?? r.appointmentType ?? "—";
const technicianOf = (r: AppointmentStatisticsRow) => r.technicianName ?? r.practitionerName ?? "—";
const visitDateOf  = (r: AppointmentStatisticsRow) => (r.visitDate ?? r.date ?? "").slice(0, 10) || "—";

interface DepartmentOption {
  id: string;
  code?: string;
  nameAr: string;
  nameEn?: string;
}

function Tick({ on, reason }: { on?: boolean; reason?: string | null }) {
  // The reason rides on the tick itself, so hovering the cancelled mark explains it.
  const hint = on && reason ? reason.trim() : "";
  return (
    <span
      title={hint || undefined}
      className={[
        on ? "font-bold text-primary" : "text-muted-foreground",
        hint ? "cursor-help underline decoration-dotted underline-offset-4" : "",
      ].join(" ")}
    >
      {on ? "✓" : "—"}
    </span>
  );
}

export default function AppointmentStatisticsPage() {
  return (
    <PageGuard permission={PERMISSIONS.CLINIC_APPOINTMENTS.STATISTICS_VIEW}>
      <AppointmentStatisticsReport />
    </PageGuard>
  );
}

function AppointmentStatisticsReport() {
  const locale = useLocale();
  const initial = useMemo(() => currentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [departmentId, setDepartmentId] = useState("ALL");
  const [patientSearch, setPatientSearch] = useState("");

  const { data: depsData } = useDepartments({ limit: 200 }, 30 * 60 * 1000);
  const clinicDepartments = useMemo(() => {
    const raw = depsData as
      | { data?: { items?: DepartmentOption[] }; items?: DepartmentOption[] }
      | undefined;
    const all = raw?.data?.items ?? raw?.items ?? [];
    return all.filter((dep) => isClinicalDepartmentCode(dep.code) || isClinicalDepartmentName(dep.nameAr));
  }, [depsData]);

  const params = {
    dateFrom,
    dateTo,
    ...(departmentId !== "ALL" ? { departmentId } : {}),
  };
  const { data, isLoading, isFetching } = useAppointmentStatistics(params);
  const exportXlsx = useExportAppointmentStatistics();

  const allRows = data?.rows ?? [];
  const totals = data?.totals ?? {};
  // البحث بالاسم يتم هنا: الرد يأتي كاملاً لهذه الفترة، فلا حاجة لطلب جديد.
  const term = patientSearch.trim().toLowerCase();
  const rows = term
    ? allRows.filter((r) => patientOf(r).toLowerCase().includes(term))
    : allRows;
  const filtered = rows.length !== allRows.length;
  // بند "العدد الكلي" يأتي من الباك؛ ومع البحث يُحسب من الأسطر الظاهرة وحدها.
  const count = (key: "attended" | "cancelled" | "postponed" | "noShow") =>
    filtered ? rows.filter((r) => r[key]).length : (totals[key] ?? rows.filter((r) => r[key]).length);

  return (
    <div className="space-y-4">
      <PageHeader
        title="إحصائيات المواعيد"
        description="حضور المرضى وإلغاءاتهم وتأجيلاتهم خلال فترة محددة"
        actions={
          <Button
            variant="outline"
            onClick={() => exportXlsx.mutate(params)}
            disabled={exportXlsx.isPending || !dateFrom || !dateTo}
            className="gap-1.5"
          >
            {exportXlsx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            تصدير Excel
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>من تاريخ</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>إلى تاريخ</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>القسم</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الأقسام</SelectItem>
                {clinicDepartments.map((dep) => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {locale === "ar" ? dep.nameAr : (dep.nameEn ?? dep.nameAr)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Search sits over the table it filters, not among the filters that
              re-fetch — it only narrows what is already on screen. */}
          <div className="relative w-full">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="ابحث باسم المريض..."
              className="ps-9"
            />
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {term ? "لا توجد مواعيد لهذا المريض ضمن الفترة" : "لا توجد مواعيد ضمن هذه الفترة"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المريض</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>نوع الخدمة</TableHead>
                    <TableHead>اسم الفني</TableHead>
                    <TableHead>تاريخ الزيارة</TableHead>
                    <TableHead className="text-center">حضر</TableHead>
                    <TableHead className="text-center">ألغى</TableHead>
                    <TableHead className="text-center">أجّل</TableHead>
                    <TableHead className="text-center">لم يحضر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.id ?? i}>
                      <TableCell className="font-medium">{patientOf(r)}</TableCell>
                      <TableCell>{departmentOf(r)}</TableCell>
                      <TableCell>{serviceOf(r)}</TableCell>
                      <TableCell>{technicianOf(r)}</TableCell>
                      <TableCell className="font-mono text-xs">{visitDateOf(r)}</TableCell>
                      <TableCell className="text-center"><Tick on={r.attended} /></TableCell>
                      <TableCell className="text-center"><Tick on={r.cancelled} reason={r.cancelledReason} /></TableCell>
                      <TableCell className="text-center"><Tick on={r.postponed} /></TableCell>
                      <TableCell className="text-center"><Tick on={r.noShow} /></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5}>
                      العدد الكلي ({filtered ? rows.length : (data?.total ?? rows.length)})
                      {filtered && <span className="font-normal text-muted-foreground"> — من أصل {data?.total ?? allRows.length}</span>}
                    </TableCell>
                    <TableCell className="text-center">{count("attended")}</TableCell>
                    <TableCell className="text-center">{count("cancelled")}</TableCell>
                    <TableCell className="text-center">{count("postponed")}</TableCell>
                    <TableCell className="text-center">{count("noShow")}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          {isFetching && !isLoading && (
            <p className="text-xs text-muted-foreground mt-2">جارِ التحديث...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
