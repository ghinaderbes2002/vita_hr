"use client";

import { useState } from "react";
import { Download, CalendarDays, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  useDailyReport, useMonthlyReport, useTopAbsencesReport, useOvertimeReport,
} from "@/lib/hooks/use-attendance-reports";
import { downloadExcel } from "@/lib/utils/excel";

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

  const COL_LABELS: Record<string, string> = {
    // minutes → hours
    netMinutes: "ساعات العمل", totalMinutes: "ساعات العمل", workMinutes: "ساعات العمل",
    totalWorkMinutes: "ساعات العمل", netWorkMinutes: "ساعات العمل",
    lateMinutes: "دقائق التأخر", totalLateMinutes: "دقائق التأخر",
    overtimeMinutes: "دقائق الإضافي", totalOvertimeMinutes: "دقائق الإضافي",
    totalBreakMinutes: "دقائق الاستراحة", breakMinutes: "دقائق الاستراحة",
    earlyLeaveMinutes: "دقائق الخروج المبكر", totalEarlyLeaveMinutes: "دقائق الخروج المبكر",
    // time / status
    checkIn: "وقت الدخول", checkOut: "وقت الخروج",
    status: "الحالة", date: "التاريخ",
    // counts / days
    totalEmployees: "إجمالي الموظفين", employeeCount: "عدد الموظفين",
    presentCount: "الحاضرون", absentCount: "الغائبون",
    lateCount: "عدد التأخرات", earlyLeaveCount: "المغادرون مبكراً",
    onLeaveCount: "في إجازة", presentDays: "أيام الحضور",
    absentDays: "أيام الغياب", lateDays: "أيام التأخر",
    workDays: "أيام العمل", workingDays: "أيام العمل",
    earlyLeaveDays: "أيام الخروج المبكر",
    // rates / hours
    attendanceRate: "نسبة الحضور %", overtimeDays: "أيام الإضافي",
    totalOvertimeHours: "ساعات الإضافي", overtimeHours: "ساعات الإضافي",
    avgAttendanceRate: "متوسط نسبة الحضور %",
    totalWorkedHours: "ساعات العمل الكلية", avgWorkedHours: "متوسط ساعات العمل",
  };

  const MINUTE_COLS = new Set(["netMinutes","totalMinutes","workMinutes","totalWorkMinutes","netWorkMinutes"]);

  function colLabel(k: string) { return COL_LABELS[k] || k; }
  function colValue(k: string, v: any): string {
    if (v == null) return "—";
    if (MINUTE_COLS.has(k) && typeof v === "number") {
      const h = Math.floor(v / 60);
      const m = v % 60;
      return m > 0 ? `${h}س ${m}د` : `${h}س`;
    }
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(1);
    return String(v);
  }

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
                onClick={() => {
                  const rows = (abs?.items || []).map((it: any) => ({
                    "رقم الموظف": it.employee.employeeNumber,
                    الاسم: `${it.employee.firstNameAr} ${it.employee.lastNameAr}`,
                    "أيام الغياب": it.absenceCount, "عدد التأخرات": it.lateCount,
                    "ساعات التأخر": it.totalLateHours?.toFixed(1),
                  }));
                  downloadExcel(rows, `top-absences-${absYear}`, "الغياب");
                }}>
                <Download className="h-3.5 w-3.5" />Excel
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
                onClick={() => {
                  const rows = (ot?.items || []).map((it: any) => ({
                    "رقم الموظف": it.employee.employeeNumber,
                    الاسم: `${it.employee.firstNameAr} ${it.employee.lastNameAr}`,
                    "أيام الإضافي": it.overtimeDays, "ساعات الإضافي": it.totalOvertimeHours?.toFixed(1),
                  }));
                  downloadExcel(rows, `overtime-${otYear}`, "العمل الإضافي");
                }}>
                <Download className="h-3.5 w-3.5" />Excel
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
                onClick={() => {
                  const rows: any[] = day?.records || day?.items || day?.data || [];
                  downloadExcel(rows.map(r => {
                    const emp = r.employee ? `${r.employee.firstNameAr} ${r.employee.lastNameAr}` : "—";
                    const { employee: _e, ...rest } = r;
                    return { الموظف: emp, ...rest };
                  }), `daily-${dailyDate}`, "يومي");
                }}>
                <Download className="h-3.5 w-3.5" />Excel
              </Button>
            </div>
          </div>

          {dailyLoading ? <Skeleton className="h-48 w-full" /> : !day ? (
            <Card><CardContent className="p-4">
              <p className="text-center py-8 text-sm text-muted-foreground">{tAtt("daily.noData")}</p>
            </CardContent></Card>
          ) : (
            <>
              {/* Summary stats */}
              {(() => {
                const stats = Object.entries(day).filter(([, v]) => typeof v === "number" || typeof v === "string" && !["date","month","year"].includes(String(v)));
                const summaryFields = day.summary ? Object.entries(day.summary) : stats.filter(([k]) => !["date","year","month"].includes(k) && !Array.isArray((day as any)[k]));
                if (!summaryFields.length) return null;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {summaryFields.map(([k, v]) => (
                      <Card key={k}>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{typeof v === "number" ? (Number.isInteger(v) ? v : (v as number).toFixed(1)) : String(v)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{colLabel(k)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}

              {/* Records table */}
              {(() => {
                const rows: any[] = day.records || day.items || day.data || [];
                if (!rows.length) return null;
                const first = rows[0];
                const cols = Object.keys(first).filter(k => k !== "employee" && typeof first[k] !== "object");
                return (
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-right font-medium">{tAtt("absences.employee")}</th>
                            {cols.map(c => <th key={c} className="px-4 py-3 text-center font-medium whitespace-nowrap">{colLabel(c)}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any, i: number) => (
                            <tr key={i} className="border-t hover:bg-muted/30">
                              <td className="px-4 py-3">
                                {row.employee ? (
                                  <>
                                    <p className="font-medium">{row.employee.firstNameAr} {row.employee.lastNameAr}</p>
                                    <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>
                                  </>
                                ) : "—"}
                              </td>
                              {cols.map(c => (
                                <td key={c} className="px-4 py-3 text-center text-muted-foreground">
                                  {colValue(c, row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                );
              })()}
            </>
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
                onClick={() => {
                  const rows: any[] = mon?.items || mon?.records || mon?.data || [];
                  downloadExcel(rows.map(r => {
                    const emp = r.employee ? `${r.employee.firstNameAr} ${r.employee.lastNameAr}` : "—";
                    const { employee: _e, ...rest } = r;
                    return { الموظف: emp, ...rest };
                  }), `monthly-${monthlyYear}-${monthlyMonth}`, "شهري");
                }}>
                <Download className="h-3.5 w-3.5" />Excel
              </Button>
            </div>
          </div>

          {monthlyLoading ? <Skeleton className="h-48 w-full" /> : !mon ? (
            <Card><CardContent className="p-4">
              <p className="text-center py-8 text-sm text-muted-foreground">{tAtt("monthly.noData")}</p>
            </CardContent></Card>
          ) : (
            <>
              {/* Summary stats */}
              {(() => {
                const summaryFields = mon.summary ? Object.entries(mon.summary) : Object.entries(mon).filter(([k, v]) => !["year","month"].includes(k) && !Array.isArray(v) && typeof v !== "object");
                if (!summaryFields.length) return null;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {summaryFields.map(([k, v]) => (
                      <Card key={k}>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{typeof v === "number" ? (Number.isInteger(v) ? v : (v as number).toFixed(1)) : String(v)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{colLabel(k)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}

              {/* Items table */}
              {(() => {
                const rows: any[] = mon.items || mon.records || mon.data || [];
                if (!rows.length) return null;
                const first = rows[0];
                const cols = Object.keys(first).filter(k => k !== "employee" && typeof first[k] !== "object");
                return (
                  <Card>
                    <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-right font-medium">{tAtt("absences.employee")}</th>
                            {cols.map(c => <th key={c} className="px-4 py-3 text-center font-medium whitespace-nowrap">{colLabel(c)}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any, i: number) => (
                            <tr key={i} className="border-t hover:bg-muted/30">
                              <td className="px-4 py-3">
                                {row.employee ? (
                                  <>
                                    <p className="font-medium">{row.employee.firstNameAr} {row.employee.lastNameAr}</p>
                                    <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>
                                  </>
                                ) : "—"}
                              </td>
                              {cols.map(c => (
                                <td key={c} className="px-4 py-3 text-center text-muted-foreground">
                                  {colValue(c, row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
