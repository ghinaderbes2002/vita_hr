"use client";

import { useState } from "react";
import { Download, Users, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, ResponsiveContainer,
} from "recharts";
import {
  useEmployeesSummary, useTurnoverReport, useSalariesReport, useExpiryDatesReport,
} from "@/lib/hooks/use-hr-reports";
import { downloadExcel } from "@/lib/utils/excel";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316","#ec4899"];

export default function HrReportsPage() {
  const t = useTranslations("reports");
  const tHr = useTranslations("reports.hr");
  const months = t.raw("months") as string[];

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: summary, isLoading: summaryLoading } = useEmployeesSummary();
  const { data: turnover, isLoading: turnoverLoading } = useTurnoverReport(year);
  const { data: salaries, isLoading: salariesLoading } = useSalariesReport();
  const { data: expiry, isLoading: expiryLoading } = useExpiryDatesReport(90);

  const sum = summary as any;
  const turn = turnover as any;
  const salList = (salaries as any[]) || [];
  const exp = expiry as any;

  // total قد يجي كـ string من Prisma أو يكون 0 بينما البيانات موجودة
  const totalEmployees = Number(sum?.total)
    || Number(sum?.totalCount)
    || (sum?.byGender || []).reduce((acc: number, g: any) => acc + (Number(g.count) || 0), 0)
    || 0;

  const turnoverData = months.map((name, i) => {
    const month = i + 1;
    const hired = (turn?.hired || []).find((h: any) => h.month === month)?.count || 0;
    const terminated = (turn?.terminated || []).find((t: any) => t.month === month)?.count || 0;
    return { name: name.slice(0, 3), hired, terminated };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tHr("title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{tHr("description")}</p>
        </div>
      </div>

      {/* ─── 1. Employee Distribution ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {tHr("employees.title")}
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
          onClick={() => {
            const rows = [
              ...((sum?.byDepartment || []).map((d: any) => ({ القسم: d.departmentAr, "عدد الموظفين": d.count }))),
            ];
            downloadExcel(rows, "employees-summary", "الموظفين");
          }}>
          <Download className="h-3.5 w-3.5" />Excel
        </Button>
      </div>

      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : sum ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* KPI */}
          <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center h-full gap-2">
              <p className="text-5xl font-bold text-primary">{totalEmployees}</p>
              <p className="text-muted-foreground text-sm">{tHr("employees.total")}</p>
            </CardContent>
          </Card>

          {/* Gender */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{tHr("employees.byGender")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={(sum.byGender || []).map((g: any) => ({ name: tHr(`gender.${g.gender}`) || g.gender, value: g.count }))}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value" labelLine={false}>
                    {(sum.byGender || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Contract */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{tHr("employees.byContract")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={(sum.byContractType || []).map((c: any) => ({ name: tHr(`contractType.${c.contractType}`) || c.contractType, value: c.count }))}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value" labelLine={false}>
                    {(sum.byContractType || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* By Department */}
          {(sum.byDepartment || []).length > 0 && (
            <Card className="sm:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{tHr("employees.byDepartment")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={(sum.byDepartment || []).map((d: any) => ({ name: d.departmentAr, count: d.count }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={false} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" name={tHr("employees.count")} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* ─── 2. Turnover ──────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {tHr("turnover.title")}
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
            onClick={() => {
              const rows = turnoverData.map(r => ({ الشهر: r.name, "موظفون جدد": r.hired, "منتهو الخدمة": r.terminated }));
              downloadExcel(rows, `turnover-${year}`, "الدوران الوظيفي");
            }}>
            <Download className="h-3.5 w-3.5" />Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {turnoverLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={turnoverData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="hired" stroke="#22c55e" name={tHr("turnover.hired")} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="terminated" stroke="#ef4444" name={tHr("turnover.terminated")} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── 3. Salaries ──────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          {tHr("salaries.title")}
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
          onClick={() => {
            const rows = salList.map((r: any) => ({
              القسم: r.departmentAr, "عدد الموظفين": r.employeeCount,
              "إجمالي الرواتب": r.totalSalary, "متوسط الراتب": r.avgSalary,
              "أدنى راتب": r.minSalary, "أعلى راتب": r.maxSalary, العملة: r.currency,
            }));
            downloadExcel(rows, "salaries", "الرواتب");
          }}>
          <Download className="h-3.5 w-3.5" />Excel
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {salariesLoading ? <Skeleton className="h-48 m-4" /> : salList.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">{tHr("salaries.department")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("salaries.employees")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("salaries.total")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("salaries.avg")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("salaries.min")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("salaries.max")}</th>
                  </tr>
                </thead>
                <tbody>
                  {salList.map((row: any, i: number) => (
                    <tr key={row.departmentId || i} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.departmentAr}</td>
                      <td className="px-4 py-3 text-center">{row.employeeCount}</td>
                      <td className="px-4 py-3 text-center">{row.totalSalary?.toLocaleString()} {row.currency}</td>
                      <td className="px-4 py-3 text-center">{row.avgSalary?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-green-600">{row.minSalary?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-primary font-semibold">{row.maxSalary?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 4. Expiry ───────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {tHr("expiry.title")}
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
          onClick={() => {
            const rows = (exp?.items || []).map((it: any) => ({
              "رقم الموظف": it.employeeNumber, الاسم: `${it.firstNameAr} ${it.lastNameAr}`,
              القسم: it.departmentAr, "نوع العقد": it.contractType,
              "تاريخ انتهاء العقد": new Date(it.contractEndDate).toLocaleDateString(),
              "الأيام المتبقية": it.daysRemaining,
            }));
            downloadExcel(rows, "expiry-dates", "انتهاء العقود");
          }}>
          <Download className="h-3.5 w-3.5" />Excel
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {expiryLoading ? <Skeleton className="h-48 m-4" /> : !exp?.items?.length ? (
            <p className="text-center py-8 text-sm text-muted-foreground">{tHr("expiry.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">{tHr("expiry.employee")}</th>
                    <th className="px-4 py-3 text-right font-medium">{tHr("expiry.department")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("expiry.contractType")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("expiry.endDate")}</th>
                    <th className="px-4 py-3 text-center font-medium">{tHr("expiry.daysRemaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  {exp.items.map((item: any) => {
                    const days = item.daysRemaining;
                    const urgency = days < 30 ? "text-red-600 font-bold" : days < 60 ? "text-amber-600 font-medium" : "text-green-600";
                    return (
                      <tr key={item.employeeId} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.firstNameAr} {item.lastNameAr}</p>
                          <p className="text-xs text-muted-foreground">{item.employeeNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.departmentAr}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-xs">{tHr(`contractType.${item.contractType}`) || item.contractType}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {new Date(item.contractEndDate).toLocaleDateString()}
                        </td>
                        <td className={`px-4 py-3 text-center ${urgency}`}>{tHr("expiry.daysUnit", { count: days })}</td>
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
