"use client";

import { useState } from "react";
import { Download, CalendarDays, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  useDailyReport, useMonthlyReport, useTopAbsencesReport, useOvertimeReport,
} from "@/lib/hooks/use-attendance-reports";
import { downloadCsv } from "@/lib/api/reports";

export default function AttendanceReportsPage() {
  const t = useTranslations("reports");
  const tAtt = useTranslations("reports.attendance");
  const months = t.raw("months") as string[];

  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "absences" | "overtime">("absences");
  const [dailyDate, setDailyDate] = useState(today);
  const [monthlyYear, setMonthlyYear] = useState(currentYear);
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);
  const [absYear, setAbsYear] = useState(currentYear);
  const [absMonth, setAbsMonth] = useState<number | undefined>(undefined);
  const [otYear, setOtYear] = useState(currentYear);
  const [otMonth, setOtMonth] = useState<number | undefined>(undefined);

  const { data: daily, isLoading: dailyLoading } = useDailyReport({ date: dailyDate });
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyReport({ year: monthlyYear, month: monthlyMonth });
  const { data: absences, isLoading: absLoading } = useTopAbsencesReport({ year: absYear, month: absMonth, limit: 10 });
  const { data: overtime, isLoading: otLoading } = useOvertimeReport({ year: otYear, month: otMonth });

  const abs = absences as any;
  const ot = overtime as any;
  const day = daily as any;
  const mon = monthly as any;

  const absenceKey = tAtt("absences.absenceKey");
  const lateKey = tAtt("absences.lateKey");

  const tabs = [
    { key: "absences" as const, icon: AlertTriangle },
    { key: "overtime" as const, icon: TrendingUp },
    { key: "daily" as const, icon: CalendarDays },
    { key: "monthly" as const, icon: Clock },
  ];

  const YearMonthFilter = ({
    year, setYear, month, setMonth, showMonth = true,
  }: { year: number; setYear: (y: number) => void; month?: number; setMonth?: (m?: number) => void; showMonth?: boolean }) => (
    <div className="flex items-center gap-2">
      <select value={year} onChange={(e) => setYear(Number(e.target.value))}
        className="h-8 rounded-md border bg-background px-2 text-sm">
        {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      {showMonth && setMonth && (
        <select value={month ?? ""} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 rounded-md border bg-background px-2 text-sm">
          <option value="">{tAtt("allMonths")}</option>
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{tAtt("title")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{tAtt("description")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit flex-wrap">
        {tabs.map(({ key, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="h-3.5 w-3.5" />{tAtt(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* ─── Most Absent ──────────────────────────────────── */}
      {activeTab === "absences" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{tAtt("absences.title")}</h2>
            <div className="flex items-center gap-2">
              <YearMonthFilter year={absYear} setYear={setAbsYear} month={absMonth} setMonth={setAbsMonth} />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/attendance-reports/top-absences?year=${absYear}${absMonth ? `&month=${absMonth}` : ""}`, `top-absences-${absYear}`)}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {absLoading ? <Skeleton className="h-64 w-full" /> : (
            <>
              {(abs?.items || []).length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={(abs.items || []).map((it: any) => ({
                          name: `${it.employee.firstNameAr} ${it.employee.lastNameAr}`.slice(0, 10),
                          [absenceKey]: it.absenceCount,
                          [lateKey]: it.lateCount,
                        }))}
                        margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={absenceKey} fill="#ef4444" radius={[3,3,0,0]} />
                        <Bar dataKey={lateKey} fill="#f59e0b" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-0">
                  {!(abs?.items?.length) ? (
                    <p className="text-center py-8 text-sm text-muted-foreground">{tAtt("noData")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-right font-medium">#</th>
                            <th className="px-4 py-3 text-right font-medium">{tAtt("absences.employee")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tAtt("absences.absenceDays")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tAtt("absences.lateCount")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tAtt("absences.lateHours")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abs.items.map((it: any, i: number) => (
                            <tr key={it.employee.id} className="border-t hover:bg-muted/30">
                              <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium">{it.employee.firstNameAr} {it.employee.lastNameAr}</p>
                                <p className="text-xs text-muted-foreground">{it.employee.employeeNumber}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={`text-xs ${it.absenceCount > 5 ? "bg-red-100 text-red-700" : it.absenceCount > 2 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                  {tAtt("absences.daysUnit", { count: it.absenceCount })}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={`text-xs ${it.lateCount > 10 ? "bg-red-100 text-red-700" : it.lateCount > 5 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                  {tAtt("absences.timesUnit", { count: it.lateCount })}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center text-muted-foreground">
                                {tAtt("absences.hoursUnit", { count: it.totalLateHours?.toFixed(1) })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── Overtime ─────────────────────────────────────── */}
      {activeTab === "overtime" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{tAtt("overtime.title")}</h2>
            <div className="flex items-center gap-2">
              <YearMonthFilter year={otYear} setYear={setOtYear} month={otMonth} setMonth={setOtMonth} />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/attendance-reports/overtime?year=${otYear}${otMonth ? `&month=${otMonth}` : ""}`, `overtime-${otYear}`)}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {otLoading ? <Skeleton className="h-64 w-full" /> : (
            <>
              {ot?.totalOvertimeHours != null && (
                <Card>
                  <CardContent className="p-6 flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-primary">{ot.totalOvertimeHours?.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{tAtt("overtime.totalHoursLabel")}</p>
                    </div>
                    <div className="h-12 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-bold">{(ot.items || []).length}</p>
                      <p className="text-sm text-muted-foreground mt-1">{tAtt("overtime.employeeCountLabel")}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-0">
                  {!(ot?.items?.length) ? (
                    <p className="text-center py-8 text-sm text-muted-foreground">{tAtt("noData")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-right font-medium">{tAtt("overtime.employee")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tAtt("overtime.overtimeDays")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tAtt("overtime.totalHours")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ot.items.map((it: any) => (
                            <tr key={it.employee.id} className="border-t hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <p className="font-medium">{it.employee.firstNameAr} {it.employee.lastNameAr}</p>
                                <p className="text-xs text-muted-foreground">{it.employee.employeeNumber}</p>
                              </td>
                              <td className="px-4 py-3 text-center">{tAtt("overtime.daysUnit", { count: it.overtimeDays })}</td>
                              <td className="px-4 py-3 text-center font-semibold text-primary">
                                {tAtt("overtime.hoursUnit", { count: it.totalOvertimeHours?.toFixed(1) })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── Daily ──────────────────────────────────── */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{tAtt("daily.title")}</h2>
            <div className="flex items-center gap-2">
              <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-sm" />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/attendance-reports/daily?date=${dailyDate}`, `daily-${dailyDate}`)}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {dailyLoading ? <Skeleton className="h-48 w-full" /> : (
            <Card>
              <CardContent className="p-4">
                {!day ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">{tAtt("daily.noData")}</p>
                ) : (
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-96 whitespace-pre-wrap">
                    {JSON.stringify(day, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Monthly ──────────────────────────────────── */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{tAtt("monthly.title")}</h2>
            <div className="flex items-center gap-2">
              <YearMonthFilter year={monthlyYear} setYear={setMonthlyYear}
                month={monthlyMonth} setMonth={(m) => setMonthlyMonth(m ?? currentMonth)} showMonth />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/attendance-reports/monthly?year=${monthlyYear}&month=${monthlyMonth}`, `monthly-${monthlyYear}-${monthlyMonth}`)}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {monthlyLoading ? <Skeleton className="h-48 w-full" /> : (
            <Card>
              <CardContent className="p-4">
                {!mon ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">{tAtt("monthly.noData")}</p>
                ) : (
                  <pre className="text-xs text-muted-foreground overflow-auto max-h-96 whitespace-pre-wrap">
                    {JSON.stringify(mon, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
