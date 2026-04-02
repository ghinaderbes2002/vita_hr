"use client";

import { useState } from "react";
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

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "lateness", label: "التأخر", icon: Clock },
  { key: "absences", label: "الغياب", icon: UserX },
  { key: "temp-exits", label: "الخروج المؤقت", icon: Coffee },
  { key: "monthly-payroll", label: "كشف الرواتب", icon: Wallet },
  { key: "employee-card", label: "بطاقة الموظف", icon: CreditCard },
];

const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                 "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}س ${m}د`;
}

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
const todayStr = today.toISOString().split("T")[0];

export default function BiometricReportsPage() {
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

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      <PageHeader
        title="تقارير البصمة"
        description="تقارير الحضور والانصراف المبنية على بيانات أجهزة البصمة"
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
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
                  <Label>من تاريخ</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label>إلى تاريخ</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label>القسم</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="كل الأقسام" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأقسام</SelectItem>
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
                  <Label>السنة</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-24"
                    min={2020}
                    max={2030}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الشهر</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeTab === "employee-card" ? (
                  <div className="space-y-1.5">
                    <Label>الموظف *</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="اختر موظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.firstNameAr} {e.lastNameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>القسم</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="كل الأقسام" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الأقسام</SelectItem>
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
              عرض التقرير
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!hasSearched ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          اختر الفلاتر واضغط "عرض التقرير" لعرض النتائج
        </div>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Lateness Report */}
          {activeTab === "lateness" && (() => {
            const data = (latenessData as LatenessReport[]) || [];
            const totalInstances = data.reduce((s, r) => s + r.totalLateInstances, 0);
            const totalMinutes = data.reduce((s, r) => s + r.totalLateMinutes, 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">الموظفون المتأخرون</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي حالات التأخر</span>
                    <span className="text-2xl font-bold text-amber-600">{totalInstances}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي دقائق التأخر</span>
                    <span className="text-2xl font-bold text-red-600">{totalMinutes} د</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا توجد بيانات تأخر في هذه الفترة</div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>مرات التأخر</TableHead>
                            <TableHead>إجمالي الدقائق</TableHead>
                            <TableHead>التفاصيل</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((row) => (
                            <>
                              <TableRow key={row.employeeId}>
                                <TableCell className="font-medium">{row.employeeName}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                                    {row.totalLateInstances} مرة
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-red-600 font-medium">{row.totalLateMinutes} د</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 h-7 text-xs"
                                    onClick={() => toggleRow(row.employeeId)}
                                  >
                                    {expandedRows.has(row.employeeId) ? (
                                      <><ChevronUp className="h-3 w-3" />إخفاء</>
                                    ) : (
                                      <><ChevronDown className="h-3 w-3" />عرض</>
                                    )}
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
                                            <TableHead>التاريخ</TableHead>
                                            <TableHead>وقت الدخول</TableHead>
                                            <TableHead>الوقت المتوقع</TableHead>
                                            <TableHead>الدقائق</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {row.records.map((rec) => (
                                            <TableRow key={rec.date}>
                                              <TableCell>{rec.date}</TableCell>
                                              <TableCell>{formatTime(rec.clockInTime)}</TableCell>
                                              <TableCell>{rec.expectedTime}</TableCell>
                                              <TableCell className="text-amber-600 font-medium">{rec.lateMinutes} د</TableCell>
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
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* Absences Report */}
          {activeTab === "absences" && (() => {
            const data = (absencesData as AbsenceReport[]) || [];
            const totalDays = data.reduce((s, r) => s + r.totalAbsenceDays, 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">موظفون غائبون</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي أيام الغياب</span>
                    <span className="text-2xl font-bold text-red-600">{totalDays}</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا توجد بيانات غياب في هذه الفترة</div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>أيام الغياب</TableHead>
                            <TableHead>التواريخ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((row) => (
                            <TableRow key={row.employeeId}>
                              <TableCell className="font-medium">{row.employeeName}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">{row.totalAbsenceDays} يوم</Badge>
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
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* Temp Exits Report */}
          {activeTab === "temp-exits" && (() => {
            const data = (tempExitsData as TempExitReport[]) || [];
            const totalExcess = data.reduce((s, r) => s + r.excessMinutes, 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">موظفون بخروج مؤقت</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي الدقائق الزائدة</span>
                    <span className="text-2xl font-bold text-amber-600">{totalExcess} د</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا توجد بيانات خروج مؤقت</div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>عدد الخروجات</TableHead>
                            <TableHead>دقائق الاستراحة</TableHead>
                            <TableHead>المسموح</TableHead>
                            <TableHead>الزائد</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((row) => (
                            <TableRow key={row.employeeId}>
                              <TableCell className="font-medium">{row.employeeName}</TableCell>
                              <TableCell>{row.totalExits}</TableCell>
                              <TableCell>{row.totalBreakMinutes} د</TableCell>
                              <TableCell>{row.allowedBreakMinutes} د</TableCell>
                              <TableCell>
                                {row.excessMinutes > 0 ? (
                                  <Badge variant="destructive">{row.excessMinutes} د</Badge>
                                ) : (
                                  <Badge variant="default" className="bg-green-600">ضمن الحد</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* Monthly Payroll Report */}
          {activeTab === "monthly-payroll" && (() => {
            const data = (payrollData as MonthlyPayrollReport[]) || [];
            const totalNet = data.reduce((s, r) => s + r.netSalary, 0);
            const totalDeductions = data.reduce((s, r) => s + r.totalDeductions, 0);
            return (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">عدد الموظفين</span>
                    <span className="text-2xl font-bold">{data.length}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">إجمالي الخصومات</span>
                    <span className="text-2xl font-bold text-red-600">{totalDeductions.toLocaleString()}</span>
                  </CardContent></Card>
                  <Card><CardContent className="py-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">صافي الرواتب</span>
                    <span className="text-2xl font-bold text-green-600">{totalNet.toLocaleString()}</span>
                  </CardContent></Card>
                </div>
                {data.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">لا توجد بيانات رواتب لهذا الشهر</div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>الموظف</TableHead>
                            <TableHead>الراتب الأساسي</TableHead>
                            <TableHead>الخصومات</TableHead>
                            <TableHead>الصافي</TableHead>
                            <TableHead>الحالة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((row) => (
                            <TableRow key={row.employeeId}>
                              <TableCell className="font-medium">{row.employeeName}</TableCell>
                              <TableCell>{Number(row.baseSalary).toLocaleString()} ل.س</TableCell>
                              <TableCell className="text-red-600">
                                {row.totalDeductions > 0 ? `-${Number(row.totalDeductions).toLocaleString()}` : "—"}
                              </TableCell>
                              <TableCell className="font-bold text-green-700">
                                {Number(row.netSalary).toLocaleString()} ل.س
                              </TableCell>
                              <TableCell>
                                <Badge variant={row.status === "CONFIRMED" ? "default" : "secondary"}>
                                  {{ DRAFT: "مسودة", CONFIRMED: "مؤكد", EXPORTED: "مُصدَّر" }[row.status]}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* Employee Card */}
          {activeTab === "employee-card" && (() => {
            const card = cardData as EmployeeCardReport | undefined;
            if (!card) return <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>;
            const attendancePct = card.workingDays > 0
              ? Math.round((card.presentDays / card.workingDays) * 100)
              : 0;
            return (
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>بطاقة الموظف الشهرية</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {MONTHS[card.month - 1]} {card.year}
                    </span>
                  </CardTitle>
                  <p className="text-lg font-semibold">{card.employeeName}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "أيام العمل المقررة", value: `${card.workingDays} يوم`, color: "" },
                      { label: "أيام الحضور", value: `${card.presentDays} يوم`, color: "text-green-600" },
                      { label: "أيام الغياب", value: `${card.absentDays} يوم`, color: "text-red-600" },
                      { label: "أيام التأخر", value: `${card.lateDays} يوم`, color: "text-amber-600" },
                      { label: "إجمالي دقائق التأخر", value: `${card.totalLateMinutes} دقيقة`, color: "text-amber-600" },
                      { label: "دقائق الاستراحة", value: `${card.totalBreakMinutes} / ${card.allowedBreakMinutes} د`, color: "" },
                      { label: "صافي ساعات العمل", value: formatMinutes(card.netWorkedMinutes), color: "text-primary" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Attendance bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>نسبة الحضور</span>
                      <span>{attendancePct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${attendancePct}%` }}
                      />
                      <div
                        className="h-full bg-red-400"
                        style={{ width: `${100 - attendancePct}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />حضور</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />غياب</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
}
