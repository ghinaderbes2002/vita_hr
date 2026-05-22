"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import {
  AlertTriangle, TrendingDown, Users, FileBarChart, ExternalLink, FileSpreadsheet,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { payrollApi } from "@/lib/api/payroll";
import { attendanceReportsApi } from "@/lib/api/reports";
import { attendanceRecordsApi } from "@/lib/api/attendance-records";
import { useExportPayrollXlsx } from "@/lib/hooks/use-payroll";
import { formatUSD } from "@/lib/utils";

const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

function StatCard({
  label, value, sub, icon: Icon, highlight = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-amber-200 bg-amber-50/30" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${highlight ? "text-amber-500" : "text-muted-foreground"}`} />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AttendanceMonthlySummaryPage() {
  const router = useRouter();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const exportXlsx = useExportPayrollXlsx();

  const dateFrom = useMemo(
    () => `${year}-${String(month).padStart(2, "0")}-01`,
    [year, month],
  );
  const dateTo = useMemo(() => {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }, [year, month]);

  const { data: payrollData, isLoading: loadingPayroll } = useQuery({
    queryKey: ["payroll-monthly-summary", year, month],
    queryFn: () => payrollApi.getAll({ year, month, limit: 500 }),
    enabled: !!(year && month),
  });

  const { data: topAbsences, isLoading: loadingAbsences } = useQuery({
    queryKey: ["top-absences-summary", year, month],
    queryFn: () => attendanceReportsApi.getTopAbsences({ year, month, limit: 20 }),
    enabled: !!(year && month),
  });

  const { data: needsReviewData } = useQuery({
    queryKey: ["needs-review-count-summary", dateFrom, dateTo],
    queryFn: () => attendanceRecordsApi.getNeedsReview({ dateFrom, dateTo, limit: 5 }),
    enabled: !!(dateFrom && dateTo),
  });

  const payrollItems = payrollData?.items ?? [];
  const lateItems: any[] = topAbsences?.items ?? [];
  const needsReviewItems: any[] = (needsReviewData?.items ?? []).slice(0, 5);
  const needsReviewTotal = needsReviewData?.total ?? 0;

  // Compute summary stats
  const totalEmployees = payrollItems.length;
  const employeesWithDeduction = payrollItems.filter(
    (i) => Number(i.grossSalary) > Number(i.netSalary),
  ).length;
  const totalDeductionAmount = payrollItems.reduce(
    (sum, i) => sum + Math.max(0, Number(i.grossSalary) - Number(i.netSalary)),
    0,
  );

  // Chart: employees with deductions grouped by department
  const deptMap = new Map<string, { nameAr: string; count: number }>();
  payrollItems.forEach((item) => {
    const key = item.employee?.department?.id ?? "other";
    const nameAr = item.employee?.department?.nameAr ?? "غير محدد";
    const deduction = Math.max(0, Number(item.grossSalary) - Number(item.netSalary));
    if (!deptMap.has(key)) deptMap.set(key, { nameAr, count: 0 });
    if (deduction > 0) deptMap.get(key)!.count++;
  });

  const chartData = [...deptMap.values()]
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((d) => ({ name: d.nameAr, موظفون: d.count }));

  const isLoading = loadingPayroll || loadingAbsences;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير الحضور الشهري"
        description="ملخص التأخيرات والخصومات لجميع الموظفين"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportXlsx.mutate({ year, month })}
            disabled={exportXlsx.isPending || payrollItems.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportXlsx.isPending ? "جاري التصدير..." : "تصدير Excel"}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS_AR.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{MONTHS_AR[month - 1]} {year}</span>
      </div>

      {/* Summary stats */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="موظفون في الكشف"  value={totalEmployees}              icon={Users} />
          <StatCard label="لديهم خصومات"      value={employeesWithDeduction}     icon={TrendingDown} highlight={employeesWithDeduction > 0} />
          <StatCard label="إجمالي الخصومات"   value={formatUSD(totalDeductionAmount)} icon={TrendingDown} highlight={totalDeductionAmount > 0} />
        </div>
      )}

      {/* Bar chart */}
      {!isLoading && chartData.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="text-sm font-semibold mb-4">الموظفون ذوو الخصومات — حسب القسم</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val) => [String(val), "عدد الموظفين"]} />
              <Bar dataKey="موظفون" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top late employees */}
      {!isLoading && lateItems.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3">أعلى المتأخرين ({lateItems.length})</p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>عدد مرات التأخر</TableHead>
                  <TableHead>إجمالي دقائق التأخر</TableHead>
                  <TableHead>أيام الغياب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lateItems.map((item) => (
                  <TableRow key={item.employee?.id}>
                    <TableCell className="text-sm">
                      <div>{item.employee?.firstNameAr} {item.employee?.lastNameAr}</div>
                      <div className="text-xs text-muted-foreground">{item.employee?.employeeNumber}</div>
                    </TableCell>
                    <TableCell>
                      {item.lateCount > 0 ? (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                          {item.lateCount} مرة
                        </Badge>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.totalLateMinutes > 0 ? `${item.totalLateMinutes} د` : "—"}
                    </TableCell>
                    <TableCell>
                      {item.absenceCount > 0 ? (
                        <Badge variant="outline" className="text-xs border-red-300 text-red-700 bg-red-50">
                          {item.absenceCount} يوم
                        </Badge>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Needs review */}
      {needsReviewTotal > 0 && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              سجلات بحاجة لمراجعة ({needsReviewTotal})
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => router.push("/attendance/needs-review")}
            >
              <ExternalLink className="h-3 w-3" />
              عرض الكل
            </Button>
          </div>
          <div className="space-y-1.5">
            {needsReviewItems.map((record) => {
              const empName = record.employee
                ? `${record.employee.firstNameAr} ${record.employee.lastNameAr}`
                : record.employeeId;
              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between text-sm rounded-md bg-amber-50/50 border border-amber-100 px-3 py-2"
                >
                  <span>{empName}</span>
                  <span className="text-xs text-muted-foreground">
                    {record.date ? new Date(record.date).toLocaleDateString("ar") : ""}
                  </span>
                </div>
              );
            })}
            {needsReviewTotal > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                و {needsReviewTotal - 5} سجل آخر...
              </p>
            )}
          </div>
        </div>
      )}

      {!isLoading && payrollItems.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
          لا توجد بيانات رواتب لـ {MONTHS_AR[month - 1]} {year}
        </div>
      )}
    </div>
  );
}
