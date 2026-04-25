"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeductionBreakdownReport } from "@/lib/hooks/use-attendance-reports";
import { useDepartments } from "@/lib/hooks/use-departments";
import { formatCurrency } from "@/lib/utils";
import { downloadExcel } from "@/lib/utils/excel";

const MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

export default function DeductionBreakdownPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deptId, setDeptId] = useState<string>("");

  const { data, isLoading } = useDeductionBreakdownReport(
    year,
    month,
    { departmentId: deptId || undefined }
  );
  const { data: deptsData } = useDepartments();

  const rows: any[] = data?.rows ?? data ?? [];
  const d = deptsData as any;
  const depts: any[] = Array.isArray(d?.data?.items) ? d.data.items
    : Array.isArray(d?.data) ? d.data
    : Array.isArray(d?.items) ? d.items
    : Array.isArray(d) ? d : [];

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تفصيل الخصومات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تحليل مفصّل لخصومات التأخر والغياب والاستراحة</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            downloadExcel(
              rows.map((r: any) => ({
                الاسم: r.employeeName,
                "رقم الموظف": r.employeeNumber,
                القسم: r.departmentName,
                "دقائق التأخر الكلية": r.totalLateMinutes,
                "تعويض": r.compensationMinutes,
                "مبررات": r.justifiedMinutes,
                "القابل للخصم": r.deductibleLateMinutes,
                "خصم التأخر": r.lateDeductionAmount,
                "أيام الغياب": r.absenceDays,
                "خصم الغياب": r.absenceDeductionAmount,
                "دقائق استراحة زائدة": r.breakOverLimitMinutes,
                "خصم الاستراحة": r.breakDeductionAmount,
                "إجمالي الخصم": r.totalDeduction,
              })),
              `deduction-breakdown-${year}-${month}`,
              "تفصيل الخصومات"
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
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
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
                  <th className="px-4 py-3 text-right font-medium">الموظف</th>
                  <th className="px-4 py-3 text-center font-medium">دقائق التأخر</th>
                  <th className="px-4 py-3 text-center font-medium">التعويض</th>
                  <th className="px-4 py-3 text-center font-medium">المبررات</th>
                  <th className="px-4 py-3 text-center font-medium">القابل للخصم</th>
                  <th className="px-4 py-3 text-center font-medium">خصم التأخر</th>
                  <th className="px-4 py-3 text-center font-medium">أيام الغياب</th>
                  <th className="px-4 py-3 text-center font-medium">خصم الغياب</th>
                  <th className="px-4 py-3 text-center font-medium">خصم الاستراحة</th>
                  <th className="px-4 py-3 text-center font-medium">إجمالي الخصم</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.employeeId} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{r.employeeNumber} — {r.departmentName}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{r.totalLateMinutes}</td>
                    <td className="px-4 py-3 text-center text-green-600">
                      {r.compensationMinutes > 0 ? `-${r.compensationMinutes}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-600">
                      {r.justifiedMinutes > 0 ? `-${r.justifiedMinutes}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.deductibleLateMinutes > 0 ? (
                        <span className="font-medium text-red-600">{r.deductibleLateMinutes} دقيقة</span>
                      ) : (
                        <span className="text-green-600">ضمن السماحية</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600">{formatCurrency(r.lateDeductionAmount)}</td>
                    <td className="px-4 py-3 text-center">{r.absenceDays}</td>
                    <td className="px-4 py-3 text-center text-red-600">{formatCurrency(r.absenceDeductionAmount)}</td>
                    <td className="px-4 py-3 text-center text-red-600">{formatCurrency(r.breakDeductionAmount)}</td>
                    <td className="px-4 py-3 text-center font-bold text-red-700">{formatCurrency(r.totalDeduction)}</td>
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
