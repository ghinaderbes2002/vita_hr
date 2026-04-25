"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
import { useEmployeeCardReport } from "@/lib/hooks/use-attendance-reports";
import { downloadExcel } from "@/lib/utils/excel";

const MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PRESENT:       { label: "حاضر",          color: "bg-green-100 text-green-800" },
  ABSENT:        { label: "غائب",          color: "bg-red-100 text-red-800" },
  LATE:          { label: "متأخر",         color: "bg-amber-100 text-amber-800" },
  EARLY_LEAVE:   { label: "خروج مبكر",    color: "bg-orange-100 text-orange-800" },
  HALF_DAY:      { label: "نصف يوم",      color: "bg-blue-100 text-blue-800" },
  ON_LEAVE:      { label: "إجازة",         color: "bg-purple-100 text-purple-800" },
  PARTIAL_LEAVE: { label: "إجازة ساعية",  color: "bg-indigo-100 text-indigo-800" },
  WEEKEND:       { label: "إجازة أسبوعية", color: "bg-gray-100 text-gray-500" },
  HOLIDAY:       { label: "عطلة رسمية",   color: "bg-teal-100 text-teal-800" },
};

const PUNCH_CONFIG: Record<string, { icon: string; color: string }> = {
  VALID:   { icon: "✓", color: "text-green-600" },
  PARTIAL: { icon: "⚠", color: "text-amber-600" },
  INVALID: { icon: "✗", color: "text-red-600" },
};

export default function EmployeeCardPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useEmployeeCardReport(employeeId, year, month);

  const employee = (data as any)?.employee ?? {};
  const days: any[] = (data as any)?.days ?? [];
  const summary: any = (data as any)?.monthlySummary ?? {};

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const employeeName = employee.firstNameAr
    ? `${employee.firstNameAr} ${employee.lastNameAr}`
    : (data as any)?.employeeName ?? "";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">بطاقة الموظف</h1>
          {employeeName && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {employeeName} — {employee.departmentName}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={days.length === 0}
          onClick={() =>
            downloadExcel(
              days.map((d: any) => ({
                التاريخ: d.date,
                اليوم: d.dayOfWeek,
                الحالة: STATUS_CONFIG[d.status]?.label ?? d.status,
                الدخول: d.clockIn ?? "—",
                الخروج: d.clockOut ?? "—",
                "تأخر (د)": d.lateMinutes,
                "تعويض (د)": d.lateCompensatedMinutes,
                "إضافي (د)": d.overtimeMinutes,
                "استراحة (د)": d.breakMinutes,
                البصمات: d.punchSequenceStatus,
              })),
              `employee-card-${employeeId}-${year}-${month}`,
              "بطاقة الموظف"
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
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* ملخص شهري */}
          {summary.presentDays != null && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-sm text-green-600">أيام الحضور</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-green-600">{summary.presentDays ?? 0}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-sm text-red-600">أيام الغياب</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-red-600">{summary.absentDays ?? 0}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-sm text-amber-600">أيام التأخر</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-amber-600">{summary.lateDays ?? 0}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-sm text-purple-600">أيام الإجازة</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-purple-600">{summary.leaveDays ?? 0}</p></CardContent>
              </Card>
            </div>
          )}

          {/* جدول يومي */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {days.length === 0 ? (
                <p className="text-center py-10 text-sm text-muted-foreground">لا توجد بيانات</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 text-right font-medium">التاريخ</th>
                      <th className="px-3 py-3 text-center font-medium">الحالة</th>
                      <th className="px-3 py-3 text-center font-medium">الدخول</th>
                      <th className="px-3 py-3 text-center font-medium">الخروج</th>
                      <th className="px-3 py-3 text-center font-medium">تأخر</th>
                      <th className="px-3 py-3 text-center font-medium">تعويض</th>
                      <th className="px-3 py-3 text-center font-medium">إضافي</th>
                      <th className="px-3 py-3 text-center font-medium">استراحة</th>
                      <th className="px-3 py-3 text-center font-medium">البصمات</th>
                      <th className="px-3 py-3 text-center font-medium">نصف اليوم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((d: any, i: number) => {
                      const statusCfg = STATUS_CONFIG[d.status] ?? { label: d.status, color: "bg-gray-100 text-gray-700" };
                      const punchCfg = PUNCH_CONFIG[d.punchSequenceStatus];
                      return (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{d.date}</p>
                            <p className="text-xs text-muted-foreground">{d.dayOfWeek}</p>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground">{d.clockIn ?? "—"}</td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground">{d.clockOut ?? "—"}</td>
                          <td className="px-3 py-2.5 text-center">
                            {d.lateMinutes > 0 ? (
                              <span className="text-red-600">{d.lateMinutes}د</span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.lateCompensatedMinutes > 0 ? (
                              <span className="text-green-600">+{d.lateCompensatedMinutes}د</span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.overtimeMinutes > 0 ? `${d.overtimeMinutes}د` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">{d.breakMinutes > 0 ? `${d.breakMinutes}د` : "—"}</td>
                          <td className="px-3 py-2.5 text-center">
                            {punchCfg ? (
                              <span className={`font-bold ${punchCfg.color}`} title={d.punchSequenceStatus}>
                                {punchCfg.icon}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.halfDayPeriod ? (
                              <span className="rounded-full bg-blue-100 px-2 text-xs text-blue-700">
                                {d.halfDayPeriod === "AM" ? "صباحي" : "مسائي"}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
