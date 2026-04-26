"use client";

import { useState } from "react";
import { Download, CalendarDays, PieChartIcon, BarChart2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  useLeaveBalancesReport, useLeaveDistributionReport, useLeaveSummaryReport,
} from "@/lib/hooks/use-leave-reports";
import { downloadExcel } from "@/lib/utils/excel";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316","#ec4899"];
const STATUS_COLORS: Record<string, string> = {
  APPROVED:            "bg-green-100 text-green-700",
  PENDING_MANAGER:     "bg-amber-100 text-amber-700",
  PENDING_HR:          "bg-orange-100 text-orange-700",
  PENDING_SUBSTITUTE:  "bg-yellow-100 text-yellow-700",
  DRAFT:               "bg-slate-100 text-slate-600",
  REJECTED:            "bg-red-100 text-red-700",
  CANCELLED:           "bg-gray-100 text-gray-600",
};

export default function LeaveReportsPage() {
  const t = useTranslations("reports");
  const tLeave = useTranslations("reports.leave");
  const months = t.raw("months") as string[];

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");

  const { data: balances, isLoading: balLoading } = useLeaveBalancesReport(year);
  const { data: distribution, isLoading: distLoading } = useLeaveDistributionReport(year);
  const { data: summary, isLoading: sumLoading } = useLeaveSummaryReport(year);

  const bal = balances as any;
  const dist = distribution as any;
  const sum = summary as any;

  const requestsKey = tLeave("distribution.requestsKey");
  const daysKey = tLeave("distribution.daysKey");

  const monthlyData = months.map((name, i) => {
    const m = (dist?.byMonth || []).find((x: any) => x.month === i + 1);
    return { name: name.slice(0, 3), [requestsKey]: m?.requestCount || 0, [daysKey]: m?.totalDays || 0 };
  });

  const balDetails = (bal?.details || []).filter((d: any) =>
    !search || d.leaveTypeName?.includes(search)
  );

  const YearSelector = () => (
    <select
      value={year}
      onChange={(e) => setYear(Number(e.target.value))}
      className="h-8 rounded-md border bg-background px-2 text-sm"
    >
      {[currentYear, currentYear - 1, currentYear - 2].map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tLeave("title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{tLeave("description")}</p>
        </div>
        <YearSelector />
      </div>

      {/* ─── 1. Summary ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          {tLeave("summary.title")}
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
          onClick={() => {
            const rows = (sum?.byStatus || []).map((s: any) => ({
              الحالة: s.status, "عدد الطلبات": s.count, "إجمالي الأيام": s.totalDays,
            }));
            downloadExcel(rows, `leave-summary-${year}`, "ملخص الإجازات");
          }}>
          <Download className="h-3.5 w-3.5" />Excel
        </Button>
      </div>

      {sumLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {(sum?.byStatus || []).map((s: any) => (
              <Card key={s.status}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`text-xs ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>
                      {tLeave(`status.${s.status}`) || s.status}
                    </Badge>
                    <span className="text-2xl font-bold text-primary">{s.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{tLeave("summary.totalDays", { count: s.totalDays })}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending requests table */}
          {(sum?.pendingRequests?.items || []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {tLeave("summary.pendingTitle", { count: sum.pendingRequests.count })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2.5 text-right font-medium">{tLeave("summary.leaveType")}</th>
                        <th className="px-4 py-2.5 text-center font-medium">{tLeave("summary.from")}</th>
                        <th className="px-4 py-2.5 text-center font-medium">{tLeave("summary.to")}</th>
                        <th className="px-4 py-2.5 text-center font-medium">{tLeave("summary.days")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sum.pendingRequests.items.map((req: any) => (
                        <tr key={req.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium">{req.leaveTypeName}</td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {new Date(req.startDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {new Date(req.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2.5 text-center font-semibold text-primary">{req.totalDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ─── 2. Distribution ───────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          {tLeave("distribution.title")}
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
          onClick={() => {
            const rows = (dist?.byType || []).map((d: any) => ({
              "نوع الإجازة": d.leaveTypeName, "عدد الطلبات": d.requestCount, "إجمالي الأيام": d.totalDays,
            }));
            downloadExcel(rows, `leave-distribution-${year}`, "توزيع الإجازات");
          }}>
          <Download className="h-3.5 w-3.5" />Excel
        </Button>
      </div>

      {distLoading ? (
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Pie by type */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{tLeave("distribution.byType")}</CardTitle></CardHeader>
            <CardContent>
              {(dist?.byType || []).length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">{t("noData")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={(dist.byType || []).map((tp: any) => ({ name: tp.leaveTypeName, value: tp.requestCount }))}
                      cx="50%" cy="50%" outerRadius={75} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                    >
                      {(dist.byType || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} ${tLeave("distribution.requestUnit")}`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar monthly */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{tLeave("distribution.monthly")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={requestsKey} fill="#6366f1" radius={[3,3,0,0]} />
                  <Bar dataKey={daysKey} fill="#22c55e" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── 3. Balances ───────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {tLeave("balances.title")}
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
          onClick={() => {
            const rows = (bal?.details || []).map((d: any) => ({
              "نوع الإجازة": d.leaveTypeName, "أيام مستحقة": d.totalDays,
              "أيام مستخدمة": d.usedDays, "أيام متبقية": d.remainingDays,
            }));
            downloadExcel(rows, `leave-balances-${year}`, "أرصدة الإجازات");
          }}>
          <Download className="h-3.5 w-3.5" />Excel
        </Button>
      </div>

      {/* Summary by type */}
      {!balLoading && (bal?.byType || []).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bal.byType.map((tp: any) => (
            <Card key={tp.leaveTypeName}>
              <CardContent className="p-4">
                <p className="font-medium text-sm">{tp.leaveTypeName}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{tLeave("balances.employees", { count: tp.totalEmployees })}</span>
                  <span className="font-semibold text-primary">{tLeave("balances.avgRemaining", { count: tp.avgRemaining })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">
              {tLeave("balances.details")} {bal?.totalRecords ? tLeave("balances.records", { count: bal.totalRecords }) : ""}
            </CardTitle>
            <input
              type="text"
              placeholder={tLeave("balances.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-44 rounded-md border bg-background px-2 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {balLoading ? <Skeleton className="h-48 m-4" /> : balDetails.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-right font-medium">{tLeave("balances.leaveType")}</th>
                    <th className="px-4 py-2.5 text-center font-medium">{tLeave("balances.totalDays")}</th>
                    <th className="px-4 py-2.5 text-center font-medium">{tLeave("balances.used")}</th>
                    <th className="px-4 py-2.5 text-center font-medium">{tLeave("balances.remaining")}</th>
                    <th className="px-4 py-2.5 text-center font-medium">{tLeave("balances.consumption")}</th>
                  </tr>
                </thead>
                <tbody>
                  {balDetails.map((d: any, i: number) => {
                    const pct = d.totalDays > 0 ? Math.round((d.usedDays / d.totalDays) * 100) : 0;
                    return (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium">{d.leaveTypeName}</td>
                        <td className="px-4 py-2.5 text-center">{d.totalDays}</td>
                        <td className="px-4 py-2.5 text-center text-amber-600">{d.usedDays}</td>
                        <td className="px-4 py-2.5 text-center text-green-600 font-semibold">{d.remainingDays}</td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
