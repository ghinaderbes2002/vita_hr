"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayrollSummaryReport } from "@/lib/hooks/use-attendance-reports";
import { useDepartments } from "@/lib/hooks/use-departments";
import { formatCurrency } from "@/lib/utils";
import { downloadExcel } from "@/lib/utils/excel";

const MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

export default function PayrollSummaryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deptId, setDeptId] = useState<string>("");

  const { data, isLoading } = usePayrollSummaryReport(year, month, deptId || undefined);
  const { data: deptsData } = useDepartments();

  const rows: any[] = data?.rows ?? [];
  const d = deptsData as any;
  const depts: any[] = Array.isArray(d?.data?.items) ? d.data.items
    : Array.isArray(d?.data) ? d.data
    : Array.isArray(d?.items) ? d.items
    : Array.isArray(d) ? d : [];

  const totals = rows.reduce(
    (acc: any, r: any) => ({
      gross: acc.gross + (r.grossSalary ?? 0),
      net: acc.net + (r.netSalary ?? 0),
      deduction: acc.deduction + (r.deductionBreakdown?.totalDeduction ?? 0),
    }),
    { gross: 0, net: 0, deduction: 0 }
  );

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ملخص الرواتب الشهرية</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تقرير تفصيلي بالرواتب والخصومات لكل موظف</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            downloadExcel(
              rows.map((r) => ({
                "الرقم الوظيفي": r.employeeNumber,
                الاسم: r.employeeName,
                القسم: r.departmentName,
                "الراتب الإجمالي": r.grossSalary,
                "إجمالي الخصومات": r.deductionBreakdown?.totalDeduction ?? 0,
                "الراتب الصافي": r.netSalary,
                الحالة: r.status === "CONFIRMED" ? "مؤكد" : "مسودة",
              })),
              `payroll-summary-${year}-${month}`,
              "ملخص الرواتب"
            )
          }
        >
          <Download className="h-4 w-4" />
          Excel
        </Button>
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={deptId || "all"} onValueChange={(v) => setDeptId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="كل الأقسام" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأقسام</SelectItem>
            {depts.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* بطاقات الإجماليات */}
      {!isLoading && rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">إجمالي الرواتب</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totals.gross)}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-600">إجمالي الخصومات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.deduction)}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-600">الصافي للصرف</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.net)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* الجدول */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">الرقم</th>
                  <th className="px-4 py-3 text-right font-medium">الاسم</th>
                  <th className="px-4 py-3 text-right font-medium">القسم</th>
                  <th className="px-4 py-3 text-center font-medium">نسبة الاحتساب</th>
                  <th className="px-4 py-3 text-center font-medium">الإجمالي</th>
                  <th className="px-4 py-3 text-center font-medium">خصم التأخر</th>
                  <th className="px-4 py-3 text-center font-medium">خصم الغياب</th>
                  <th className="px-4 py-3 text-center font-medium">إجمالي الخصومات</th>
                  <th className="px-4 py-3 text-center font-medium">الصافي</th>
                  <th className="px-4 py-3 text-center font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.employeeId} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{r.employeeNumber}</td>
                    <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                    <td className="px-4 py-3">{r.departmentName}</td>
                    <td className="px-4 py-3 text-center">
                      {r.proRationFactor < 1
                        ? `${(r.proRationFactor * 100).toFixed(0)}%`
                        : "كامل"}
                    </td>
                    <td className="px-4 py-3 text-center">{formatCurrency(r.grossSalary)}</td>
                    <td className="px-4 py-3 text-center text-red-600">
                      {formatCurrency(r.deductionBreakdown?.lateDeduction ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600">
                      {formatCurrency(r.deductionBreakdown?.absenceDeduction ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-red-700">
                      {formatCurrency(r.deductionBreakdown?.totalDeduction ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-700">
                      {formatCurrency(r.netSalary)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === "CONFIRMED" ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">مؤكد</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">مسودة</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
