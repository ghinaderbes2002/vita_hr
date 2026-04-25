"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDepartmentAttendanceReport } from "@/lib/hooks/use-attendance-reports";
import { useDepartments } from "@/lib/hooks/use-departments";
import { downloadExcel } from "@/lib/utils/excel";

const MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6"];

export default function DepartmentAttendancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deptId, setDeptId] = useState<string>("");

  const { data, isLoading } = useDepartmentAttendanceReport(year, month, deptId);
  const { data: deptsData } = useDepartments();

  const rows: any[] = data?.rows ?? [];
  const summary: any = data?.summary ?? {};
  const d = deptsData as any;
  const depts: any[] = Array.isArray(d?.data?.items) ? d.data.items
    : Array.isArray(d?.data) ? d.data
    : Array.isArray(d?.items) ? d.items
    : Array.isArray(d) ? d : [];

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const pieData = summary.employeeCount
    ? [
        { name: "حاضر", value: summary.totalPresent ?? 0 },
        { name: "غائب", value: summary.totalAbsent ?? 0 },
        { name: "متأخر", value: summary.totalLate ?? 0 },
        { name: "إجازة", value: summary.totalOnLeave ?? 0 },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">حضور القسم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ملخص الحضور لموظفي قسم محدد</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!deptId || rows.length === 0}
          onClick={() =>
            downloadExcel(
              rows.map((r: any) => ({
                الاسم: r.employeeName,
                "رقم الموظف": r.employeeNumber,
                "أيام الحضور": r.presentDays,
                "أيام الغياب": r.absentDays,
                "أيام التأخر": r.lateDays,
                "أيام الإجازة": r.onLeaveDays,
                "دقائق التأخر": r.lateMinutes,
                "دقائق إضافي": r.overtimeMinutes,
              })),
              `dept-attendance-${year}-${month}`,
              "حضور القسم"
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

        <Select value={deptId || ""} onValueChange={(v) => setDeptId(v)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="اختر القسم (مطلوب)" />
          </SelectTrigger>
          <SelectContent>
            {depts.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!deptId && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          الرجاء اختيار قسم لعرض البيانات
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && deptId && summary.employeeCount > 0 && (
        <>
          {/* بطاقات الملخص */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "حاضر", value: summary.totalPresent, color: "text-green-600" },
              { label: "غائب", value: summary.totalAbsent, color: "text-red-600" },
              { label: "متأخر", value: summary.totalLate, color: "text-amber-600" },
              { label: "إجازة", value: summary.totalOnLeave, color: "text-blue-600" },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardHeader className="pb-1">
                  <CardTitle className={`text-sm ${color}`}>{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* مخطط دائري */}
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* جدول الموظفين */}
      {!isLoading && deptId && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {rows.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">الموظف</th>
                    <th className="px-4 py-3 text-center font-medium">أيام الحضور</th>
                    <th className="px-4 py-3 text-center font-medium">أيام الغياب</th>
                    <th className="px-4 py-3 text-center font-medium">أيام التأخر</th>
                    <th className="px-4 py-3 text-center font-medium">أيام الإجازة</th>
                    <th className="px-4 py-3 text-center font-medium">دقائق التأخر</th>
                    <th className="px-4 py-3 text-center font-medium">دقائق إضافي</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.employeeId} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-green-600">{r.presentDays}</td>
                      <td className="px-4 py-3 text-center text-red-600">{r.absentDays}</td>
                      <td className="px-4 py-3 text-center text-amber-600">{r.lateDays}</td>
                      <td className="px-4 py-3 text-center text-blue-600">{r.onLeaveDays}</td>
                      <td className="px-4 py-3 text-center">{r.lateMinutes}</td>
                      <td className="px-4 py-3 text-center">{r.overtimeMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
