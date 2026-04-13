"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock, UserX, Coffee, Wallet, CreditCard,
  Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  useLatenessReport,
  useAbsencesReport,
  useTempExitsReport,
  useMonthlyPayrollReport,
  useEmployeeCardReport,
} from "@/lib/hooks/use-attendance-reports";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useEmployees } from "@/lib/hooks/use-employees";
import { LatenessReport, AbsenceReport, TempExitReport, MonthlyPayrollReport, EmployeeCardReport } from "@/lib/api/attendance-reports";

type TabKey = "lateness" | "absences" | "temp-exits" | "monthly-payroll" | "employee-card";

const TAB_ICONS: Record<TabKey, any> = {
  "lateness": Clock,
  "absences": UserX,
  "temp-exits": Coffee,
  "monthly-payroll": Wallet,
  "employee-card": CreditCard,
};

const TAB_KEYS: TabKey[] = ["lateness", "absences", "temp-exits", "monthly-payroll", "employee-card"];

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const todayStr = today.toISOString().split("T")[0];

export default function BiometricReportsPage() {
  const t = useTranslations("biometricReports");

  const [activeTab, setActiveTab] = useState<TabKey>("lateness");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [departmentId, setDepartmentId] = useState("all");
  const [employeeId, setEmployeeId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: departmentsData } = useDepartments({});
  const { data: employeesData } = useEmployees({ limit: 200 });

  const departments = (departmentsData as any)?.data?.items || [];
  const employees = (employeesData as any)?.data?.items || [];

  const isDateBased = !["monthly-payroll", "employee-card"].includes(activeTab);
  const filters = { from, to, departmentId: departmentId === "all" ? undefined : departmentId };

  const { data: latenessData, isLoading: latenessLoading } = useLatenessReport(filters, hasSearched && activeTab === "lateness");
  const { data: absencesData, isLoading: absencesLoading } = useAbsencesReport(filters, hasSearched && activeTab === "absences");
  const { data: tempExitsData, isLoading: tempExitsLoading } = useTempExitsReport(filters, hasSearched && activeTab === "temp-exits");
  const { data: payrollData, isLoading: payrollLoading } = useMonthlyPayrollReport(year, month, departmentId === "all" ? undefined : departmentId, hasSearched && activeTab === "monthly-payroll");
  const { data: cardData, isLoading: cardLoading } = useEmployeeCardReport(employeeId, year, month, hasSearched && activeTab === "employee-card");

  const isLoading = latenessLoading || absencesLoading || tempExitsLoading || payrollLoading || cardLoading;

  const months = t.raw("months") as string[];

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleSearch() {
    setExpandedRows(new Set());
    setHasSearched(true);
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setHasSearched(false);
    setExpandedRows(new Set());
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TAB_KEYS.map((key) => {
          const Icon = TAB_ICONS[key];
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`tabs.${key}`)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            {isDateBased ? (
              <>
                <div className="space-y-1.5">
                  <Label>{t("filters.from")}</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("filters.to")}</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("filters.department")}</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className="w-44"><SelectValue placeholder={t("filters.allDepartments")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.allDepartments")}</SelectItem>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>{t("filters.year")}</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" min={2020} max={2030} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("filters.month")}</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeTab === "employee-card" ? (
                  <div className="space-y-1.5">
                    <Label>{t("filters.employee")} *</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger className="w-52"><SelectValue placeholder={t("filters.selectEmployee")} /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>{t("filters.department")}</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="w-44"><SelectValue placeholder={t("filters.allDepartments")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("filters.allDepartments")}</SelectItem>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            <Button onClick={handleSearch} className="gap-2" disabled={activeTab === "employee-card" && !employeeId}>
              <Search className="h-4 w-4" />
              {t("showReport")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!hasSearched ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{t("hint")}</div>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Lateness */}
          {activeTab === "lateness" && (() => {
            const _ld = latenessData as any;
            const data: LatenessReport[] = Array.isArray(_ld) ? _ld : _ld?.items || _ld?.data || [];
            const totalInstances = data.reduce((s, r) => s + r.totalLateInstances, 0);
            const totalMinutes = data.reduce((s, r) => s + r.totalLateMinutes, 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("lateness.lateEmployees")}</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("lateness.totalInstances")}</span>
                    <span className="text-2xl font-bold text-amber-600">{totalInstances}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("lateness.totalMinutes")}</span>
                    <span className="text-2xl font-bold text-red-600">{t("lateness.minutesUnit", { count: totalMinutes })}</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{t("lateness.noData")}</div>
                ) : (
                  <Card><CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("lateness.employee")}</TableHead>
                          <TableHead>{t("lateness.instances")}</TableHead>
                          <TableHead>{t("lateness.minutes")}</TableHead>
                          <TableHead>{t("lateness.details")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((row) => (
                          <>
                            <TableRow key={row.employeeId}>
                              <TableCell className="font-medium">{row.employeeName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  {t("lateness.times", { count: row.totalLateInstances })}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-red-600 font-medium">{t("lateness.minutesUnit", { count: row.totalLateMinutes })}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => toggleRow(row.employeeId)}>
                                  {expandedRows.has(row.employeeId)
                                    ? <><ChevronUp className="h-3 w-3" />{t("lateness.hide")}</>
                                    : <><ChevronDown className="h-3 w-3" />{t("lateness.show")}</>}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {expandedRows.has(row.employeeId) && (
                              <TableRow key={`${row.employeeId}-details`} className="bg-muted/30">
                                <TableCell colSpan={4} className="p-0">
                                  <div className="p-3">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{t("lateness.date")}</TableHead>
                                          <TableHead>{t("lateness.clockIn")}</TableHead>
                                          <TableHead>{t("lateness.expected")}</TableHead>
                                          <TableHead>{t("lateness.lateMinutes")}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {row.records.map((rec) => (
                                          <TableRow key={rec.date}>
                                            <TableCell>{rec.date}</TableCell>
                                            <TableCell>{formatTime(rec.clockInTime)}</TableCell>
                                            <TableCell>{rec.expectedTime}</TableCell>
                                            <TableCell className="text-amber-600 font-medium">{t("lateness.minutesUnit", { count: rec.lateMinutes })}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent></Card>
                )}
              </div>
            );
          })()}

          {/* Absences */}
          {activeTab === "absences" && (() => {
            const _ad = absencesData as any;
            const data: AbsenceReport[] = Array.isArray(_ad) ? _ad : _ad?.items || _ad?.data || [];
            const totalDays = data.reduce((s, r) => s + r.totalAbsenceDays, 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("absences.absentEmployees")}</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("absences.totalDays")}</span>
                    <span className="text-2xl font-bold text-red-600">{totalDays}</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{t("absences.noData")}</div>
                ) : (
                  <Card><CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("absences.employee")}</TableHead>
                          <TableHead>{t("absences.absenceDays")}</TableHead>
                          <TableHead>{t("absences.dates")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((row) => (
                          <TableRow key={row.employeeId}>
                            <TableCell className="font-medium">{row.employeeName}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{t("absences.days", { count: row.totalAbsenceDays })}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.dates.slice(0, 5).map((d) => (
                                  <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                                ))}
                                {row.dates.length > 5 && (
                                  <Badge variant="secondary" className="text-xs">+{row.dates.length - 5}</Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent></Card>
                )}
              </div>
            );
          })()}

          {/* Temp Exits */}
          {activeTab === "temp-exits" && (() => {
            const _td = tempExitsData as any;
            const data: TempExitReport[] = Array.isArray(_td) ? _td : _td?.items || _td?.data || [];
            const totalExcess = data.reduce((s, r) => s + r.excessMinutes, 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("tempExits.employeesWithExits")}</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("tempExits.totalExcess")}</span>
                    <span className="text-2xl font-bold text-amber-600">{t("tempExits.minutesUnit", { count: totalExcess })}</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{t("tempExits.noData")}</div>
                ) : (
                  <Card><CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("tempExits.employee")}</TableHead>
                          <TableHead>{t("tempExits.exitCount")}</TableHead>
                          <TableHead>{t("tempExits.breakMinutes")}</TableHead>
                          <TableHead>{t("tempExits.allowed")}</TableHead>
                          <TableHead>{t("tempExits.excess")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((row) => (
                          <TableRow key={row.employeeId}>
                            <TableCell className="font-medium">{row.employeeName}</TableCell>
                            <TableCell>{row.totalExits}</TableCell>
                            <TableCell>{t("tempExits.minutesUnit", { count: row.totalBreakMinutes })}</TableCell>
                            <TableCell>{t("tempExits.minutesUnit", { count: row.allowedBreakMinutes })}</TableCell>
                            <TableCell>
                              {row.excessMinutes > 0
                                ? <Badge variant="destructive">{t("tempExits.minutesUnit", { count: row.excessMinutes })}</Badge>
                                : <Badge variant="default" className="bg-green-600">{t("tempExits.withinLimit")}</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent></Card>
                )}
              </div>
            );
          })()}

          {/* Monthly Payroll */}
          {activeTab === "monthly-payroll" && (() => {
            const _pd = payrollData as any;
            const data: any[] = Array.isArray(_pd) ? _pd : _pd?.items || _pd?.data || [];
            const totalAbsent = data.reduce((s: number, r: any) => s + (r.absentDays || 0), 0);
            const totalLateMin = data.reduce((s: number, r: any) => s + (r.totalLateMinutes || 0), 0);
            const totalDeductMin = data.reduce((s: number, r: any) => s + (r.deductions?.totalDeductionMinutes || r.totalDeductions || 0), 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("payroll.employeeCount")}</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي أيام الغياب</span>
                    <span className="text-2xl font-bold text-red-600">{totalAbsent}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي دقائق التأخر</span>
                    <span className="text-2xl font-bold text-amber-600">{totalLateMin}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي دقائق الخصم</span>
                    <span className="text-2xl font-bold text-red-600">{totalDeductMin}</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{t("payroll.noData")}</div>
                ) : (
                  <Card><CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("payroll.employee")}</TableHead>
                          <TableHead>أيام العمل</TableHead>
                          <TableHead>أيام الحضور</TableHead>
                          <TableHead>أيام الغياب</TableHead>
                          <TableHead>دقائق التأخر</TableHead>
                          <TableHead>دقائق الخصم</TableHead>
                          <TableHead>صافي الدقائق</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((row: any) => (
                          <TableRow key={row.employeeId}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{row.employeeName}</span>
                                {row.salaryLinked && (
                                  <Badge variant="outline" className="mr-2 text-[10px] px-1 py-0 bg-green-50 text-green-600 border-green-200">مرتبط بالراتب</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{row.workingDays || 0}</TableCell>
                            <TableCell className="text-green-600 font-medium">{row.presentDays || 0}</TableCell>
                            <TableCell>
                              {(row.absentDays || 0) > 0
                                ? <Badge variant="destructive">{row.absentDays}</Badge>
                                : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell>
                              {(row.totalLateMinutes || 0) > 0
                                ? <span className="text-amber-600 font-medium">{row.totalLateMinutes} د</span>
                                : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell>
                              {(row.deductions?.totalDeductionMinutes || row.totalDeductions || 0) > 0
                                ? <span className="text-red-600 font-medium">{row.deductions?.totalDeductionMinutes || row.totalDeductions} د</span>
                                : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell className="font-bold">{formatMinutes(row.netWorkedMinutes || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent></Card>
                )}
              </div>
            );
          })()}

          {/* Employee Card */}
          {activeTab === "employee-card" && (() => {
            const card = cardData as (EmployeeCardReport & { days?: any[] }) | undefined;
            if (!card) return <div className="text-center py-12 text-muted-foreground">{t("employeeCard.noData")}</div>;
            const attendancePct = card.workingDays > 0
              ? Math.round((card.presentDays / card.workingDays) * 100)
              : 0;
            const days = (card as any).days || [];
            const activeDays = days.filter((d: any) => d.status);
            return (
              <div className="space-y-4">
                <Card className="max-w-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{t("employeeCard.title")}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {months[card.month - 1]} {card.year}
                      </span>
                    </CardTitle>
                    <p className="text-lg font-semibold">{card.employeeName}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { key: "workingDays", value: t("employeeCard.dayUnit", { count: card.workingDays }), color: "" },
                        { key: "presentDays", value: t("employeeCard.dayUnit", { count: card.presentDays }), color: "text-green-600" },
                        { key: "absentDays", value: t("employeeCard.dayUnit", { count: card.absentDays }), color: "text-red-600" },
                        { key: "lateDays", value: t("employeeCard.dayUnit", { count: card.lateDays }), color: "text-amber-600" },
                        { key: "totalLateMinutes", value: t("employeeCard.minuteUnit", { count: card.totalLateMinutes }), color: "text-amber-600" },
                        { key: "breakMinutes", value: t("employeeCard.breakUnit", { actual: card.totalBreakMinutes, allowed: card.allowedBreakMinutes }), color: "" },
                        { key: "netWorkedMinutes", value: formatMinutes(card.netWorkedMinutes), color: "text-primary" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between rounded-lg border p-3">
                          <span className="text-sm text-muted-foreground">{t(`employeeCard.${item.key}`)}</span>
                          <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("employeeCard.attendanceRate")}</span>
                        <span>{attendancePct}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${attendancePct}%` }} />
                        <div className="h-full bg-red-400" style={{ width: `${100 - attendancePct}%` }} />
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />{t("employeeCard.present")}</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />{t("employeeCard.absent")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Breakdown */}
                {activeDays.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">تفاصيل الأيام</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>اليوم</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الدخول</TableHead>
                            <TableHead>الخروج</TableHead>
                            <TableHead>التأخر</TableHead>
                            <TableHead>الدقائق</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeDays.map((day: any) => {
                            const statusColors: Record<string, string> = {
                              PRESENT: "bg-green-100 text-green-700",
                              ABSENT: "bg-red-100 text-red-700",
                              LATE: "bg-amber-100 text-amber-700",
                              ON_LEAVE: "bg-blue-100 text-blue-700",
                              HOLIDAY: "bg-gray-200 text-gray-700",
                              EARLY_LEAVE: "bg-yellow-100 text-yellow-700",
                            };
                            const statusLabels: Record<string, string> = {
                              PRESENT: "حاضر", ABSENT: "غائب", LATE: "متأخر",
                              ON_LEAVE: "إجازة", HOLIDAY: "عطلة", EARLY_LEAVE: "خروج مبكر",
                            };
                            return (
                              <TableRow key={day.date}>
                                <TableCell className="font-medium">{day.date}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{day.dayName}</TableCell>
                                <TableCell>
                                  <Badge className={`text-xs ${statusColors[day.status] || "bg-gray-100 text-gray-600"}`}>
                                    {statusLabels[day.status] || day.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{day.clockIn || "—"}</TableCell>
                                <TableCell>{day.clockOut || "—"}</TableCell>
                                <TableCell>
                                  {(day.lateMinutes || 0) > 0
                                    ? <span className="text-amber-600 font-medium">{day.lateMinutes} د</span>
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {day.workedMinutes != null
                                    ? <span className="font-medium">{formatMinutes(day.workedMinutes)}</span>
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
