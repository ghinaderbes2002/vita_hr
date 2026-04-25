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
import { useLatenessAccumulatedReport } from "@/lib/hooks/use-attendance-reports";
import { useDepartments } from "@/lib/hooks/use-departments";
import { downloadExcel } from "@/lib/utils/excel";

const MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

export default function LatenessAccumulatedPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deptId, setDeptId] = useState<string>("");

  const { data, isLoading } = useLatenessAccumulatedReport(year, month, deptId || undefined);
  const { data: deptsData } = useDepartments();

  const rows: any[] = data?.rows ?? [];
  const tolerance: number = data?.monthlyTolerance ?? 120;
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
          <h1 className="text-2xl font-bold">التأخر التراكمي الشهري</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تتبع دقائق التأخر والسماحية لكل موظف</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() =>
            downloadExcel(
              rows.map((r) => ({
                الاسم: r.employeeName,
                "رقم الموظف": r.employeeNumber,
                "إجمالي التأخر (دقيقة)": r.totalLateMinutes,
                "التعويض (دقيقة)": r.compensationMinutes,
                "التأخر الفعلي (دقيقة)": r.effectiveLateMinutes,
                "تجاوز السماحية": r.exceedsToleranceBy,
                "سيُخصم": r.willBeDeducted ? "نعم" : "لا",
              })),
              `lateness-accumulated-${year}-${month}`,
              "التأخر التراكمي"
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

      {/* بانر السماحية */}
      {!isLoading && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
          <span className="font-medium">سماحية التأخير الشهرية: </span>
          <span className="text-amber-700 font-bold">{tolerance} دقيقة</span>
          <span className="text-gray-500 mr-2">— الموظفون الذين يتجاوزونها فقط يُخصم منهم</span>
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
                  <th className="px-4 py-3 text-right font-medium">الموظف</th>
                  <th className="px-4 py-3 text-center font-medium">إجمالي التأخر</th>
                  <th className="px-4 py-3 text-center font-medium">التعويض</th>
                  <th className="px-4 py-3 text-center font-medium">المبررات</th>
                  <th className="px-4 py-3 text-center font-medium">الفعلي</th>
                  <th className="px-4 py-3 text-center font-medium">تجاوز السماحية</th>
                  <th className="px-4 py-3 text-center font-medium">سيُخصم؟</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.employeeId} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-center">{r.totalLateMinutes} د</td>
                    <td className="px-4 py-3 text-center text-green-600">
                      {r.compensationMinutes > 0 ? `-${r.compensationMinutes} د` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-600">
                      {r.justifiedMinutes > 0 ? `-${r.justifiedMinutes} د` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{r.effectiveLateMinutes} د</td>
                    <td className="px-4 py-3 text-center">
                      {r.exceedsToleranceBy > 0 ? (
                        <span className="text-red-600 font-medium">{r.exceedsToleranceBy} دقيقة</span>
                      ) : (
                        <span className="text-green-600">ضمن الحد</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.willBeDeducted ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">نعم</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">لا</span>
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
