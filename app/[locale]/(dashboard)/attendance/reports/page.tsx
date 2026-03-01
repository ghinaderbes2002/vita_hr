"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDailyReport, useMonthlyReport, useSummaryReport, useBreaksReport } from "@/lib/hooks/use-attendance-reports";
import { useDepartments } from "@/lib/hooks/use-departments";

const today = new Date().toISOString().split("T")[0];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;

const statusColors: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-800",
  LATE: "bg-amber-100 text-amber-800",
  ABSENT: "bg-red-100 text-red-800",
  EARLY_LEAVE: "bg-orange-100 text-orange-800",
  HALF_DAY: "bg-blue-100 text-blue-800",
  ON_LEAVE: "bg-purple-100 text-purple-800",
};

function minutesToHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}س ${m}د`;
}

// ─── Daily Report ────────────────────────────────────────────────────────────
function DailyReport() {
  const t = useTranslations();
  const [date, setDate] = useState(today);
  const [deptId, setDeptId] = useState("all");
  const [submitted, setSubmitted] = useState({ date: today, deptId: "" });

  const { data: deptData } = useDepartments({ limit: 200 });
  const departments = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const { data, isLoading } = useDailyReport({
    date: submitted.date,
    departmentId: submitted.deptId || undefined,
  });

  const report = (data as any)?.data;
  const records = report?.records || [];
  const summary = report?.statusSummary || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>{t("attendanceReports.date")}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>{t("attendanceReports.department")}</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("common.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSubmitted({ date, deptId: deptId === "all" ? "" : deptId })}>
          <Search className="h-4 w-4 ml-2" />
          {t("common.search")}
        </Button>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(summary).map(([status, count]) => (
            <Card key={status}>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{count as number}</div>
                <Badge className={statusColors[status] || ""} variant="outline">
                  {t(`attendance.statuses.${status}`)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("attendanceReports.employee")}</TableHead>
              <TableHead>{t("attendanceReports.clockIn")}</TableHead>
              <TableHead>{t("attendanceReports.clockOut")}</TableHead>
              <TableHead>{t("attendanceReports.workedHours")}</TableHead>
              <TableHead>{t("attendanceReports.lateMinutes")}</TableHead>
              <TableHead>{t("attendanceReports.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">{t("common.noData")}</TableCell>
              </TableRow>
            ) : (
              records.map((rec: any) => (
                <TableRow key={rec.id}>
                  <TableCell>
                    {rec.employee ? `${rec.employee.firstNameAr} ${rec.employee.lastNameAr}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rec.clockInTime ? new Date(rec.clockInTime).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </TableCell>
                  <TableCell>{rec.workedMinutes ? minutesToHours(rec.workedMinutes) : "—"}</TableCell>
                  <TableCell>{rec.lateMinutes ?? 0} د</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[rec.status] || ""}`}>
                      {t(`attendance.statuses.${rec.status}`)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Monthly Report ───────────────────────────────────────────────────────────
function MonthlyReport() {
  const t = useTranslations();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [deptId, setDeptId] = useState("all");
  const [submitted, setSubmitted] = useState({ year: currentYear, month: currentMonth, deptId: "" });

  const { data: deptData } = useDepartments({ limit: 200 });
  const departments = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const { data, isLoading } = useMonthlyReport({
    year: submitted.year,
    month: submitted.month,
    departmentId: submitted.deptId || undefined,
  });

  const report = (data as any)?.data;
  const employees = report?.employees || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>{t("attendanceReports.year")}</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" />
        </div>
        <div className="space-y-1">
          <Label>{t("attendanceReports.month")}</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(2000, m - 1).toLocaleString("ar-SA", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{t("attendanceReports.department")}</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("common.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSubmitted({ year: Number(year), month: Number(month), deptId: deptId === "all" ? "" : deptId })}>
          <Search className="h-4 w-4 ml-2" />
          {t("common.search")}
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("attendanceReports.employee")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.presentDays")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.absentDays")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.lateDays")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.onLeaveDays")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.totalWorkedHours")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.totalOvertimeHours")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.totalLateMinutes")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">{t("common.noData")}</TableCell>
              </TableRow>
            ) : (
              employees.map((row: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>
                    {row.employee ? `${row.employee.firstNameAr} ${row.employee.lastNameAr}` : "—"}
                  </TableCell>
                  <TableCell className="text-center text-green-700 font-medium">{row.presentDays}</TableCell>
                  <TableCell className="text-center text-red-600 font-medium">{row.absentDays}</TableCell>
                  <TableCell className="text-center text-amber-600 font-medium">{row.lateDays}</TableCell>
                  <TableCell className="text-center text-purple-600">{row.onLeaveDays}</TableCell>
                  <TableCell className="text-center">{row.totalWorkedHours?.toFixed(1)}</TableCell>
                  <TableCell className="text-center">{row.totalOvertimeHours?.toFixed(1)}</TableCell>
                  <TableCell className="text-center">{row.totalLateMinutes}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Summary Report ───────────────────────────────────────────────────────────
function SummaryReport() {
  const t = useTranslations();
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [deptId, setDeptId] = useState("all");
  const [submitted, setSubmitted] = useState({ dateFrom: firstOfMonth, dateTo: today, deptId: "" });

  const { data: deptData } = useDepartments({ limit: 200 });
  const departments = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const { data, isLoading } = useSummaryReport({
    dateFrom: submitted.dateFrom,
    dateTo: submitted.dateTo,
    departmentId: submitted.deptId || undefined,
  });

  const report = (data as any)?.data;
  const totals = report?.totals;

  const statCards = totals ? [
    { label: t("attendanceReports.totalRecords"), value: totals.totalRecords, color: "text-foreground" },
    { label: t("attendanceReports.presentDays"), value: totals.presentDays, color: "text-green-700" },
    { label: t("attendanceReports.absentDays"), value: totals.absentDays, color: "text-red-600" },
    { label: t("attendanceReports.lateDays"), value: totals.lateDays, color: "text-amber-600" },
    { label: t("attendanceReports.onLeaveDays"), value: totals.onLeaveDays, color: "text-purple-600" },
    { label: t("attendanceReports.totalWorkedHours"), value: totals.totalWorkedHours?.toFixed(1) + " " + t("attendanceReports.hours"), color: "text-blue-700" },
    { label: t("attendanceReports.totalOvertimeHours"), value: totals.totalOvertimeHours?.toFixed(1) + " " + t("attendanceReports.hours"), color: "text-indigo-600" },
    { label: t("attendanceReports.totalLateMinutes"), value: totals.totalLateMinutes + " د", color: "text-orange-600" },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>{t("attendanceReports.dateFrom")}</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>{t("attendanceReports.dateTo")}</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>{t("attendanceReports.department")}</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("common.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSubmitted({ dateFrom, dateTo, deptId: deptId === "all" ? "" : deptId })}>
          <Search className="h-4 w-4 ml-2" />
          {t("common.search")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : totals ? (
        <>
          <div className="text-sm text-muted-foreground">
            {t("attendanceReports.totalEmployees")}: <span className="font-semibold">{report.totalEmployees}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((card) => (
              <Card key={card.label}>
                <CardContent className="pt-4 text-center">
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          {t("common.noData")}
        </div>
      )}
    </div>
  );
}

// ─── Breaks Report ────────────────────────────────────────────────────────────
function BreaksReport() {
  const t = useTranslations();
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [deptId, setDeptId] = useState("all");
  const [submitted, setSubmitted] = useState({ dateFrom: firstOfMonth, dateTo: today, deptId: "" });

  const { data: deptData } = useDepartments({ limit: 200 });
  const departments = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const { data, isLoading } = useBreaksReport({
    dateFrom: submitted.dateFrom,
    dateTo: submitted.dateTo,
    departmentId: submitted.deptId || undefined,
  });

  const report = (data as any)?.data;
  const employees = report?.employees || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>{t("attendanceReports.dateFrom")}</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>{t("attendanceReports.dateTo")}</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label>{t("attendanceReports.department")}</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("common.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setSubmitted({ dateFrom, dateTo, deptId: deptId === "all" ? "" : deptId })}>
          <Search className="h-4 w-4 ml-2" />
          {t("common.search")}
        </Button>
      </div>

      {report && (
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>{t("attendanceReports.totalRecords")}: <strong>{report.totalRecords}</strong></span>
          <span>{t("attendanceReports.totalBreakHours")}: <strong>{report.totalBreakHours?.toFixed(1)}</strong></span>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("attendanceReports.employee")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.totalDays")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.totalBreakMinutes")}</TableHead>
              <TableHead className="text-center">{t("attendanceReports.avgBreakPerDay")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">{t("common.noData")}</TableCell>
              </TableRow>
            ) : (
              employees.map((row: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>
                    {row.employee ? `${row.employee.firstNameAr} ${row.employee.lastNameAr}` : "—"}
                  </TableCell>
                  <TableCell className="text-center">{row.totalDays}</TableCell>
                  <TableCell className="text-center">{row.totalBreakMinutes} د</TableCell>
                  <TableCell className="text-center">{row.avgBreakMinutesPerDay?.toFixed(1)} د</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendanceReportsPage() {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("attendanceReports.title")}
        description={t("attendanceReports.description")}
      />

      <Tabs defaultValue="daily">
        <TabsList className="mb-4">
          <TabsTrigger value="daily">{t("attendanceReports.daily")}</TabsTrigger>
          <TabsTrigger value="monthly">{t("attendanceReports.monthly")}</TabsTrigger>
          <TabsTrigger value="summary">{t("attendanceReports.summary")}</TabsTrigger>
          <TabsTrigger value="breaks">{t("attendanceReports.breaks")}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily"><DailyReport /></TabsContent>
        <TabsContent value="monthly"><MonthlyReport /></TabsContent>
        <TabsContent value="summary"><SummaryReport /></TabsContent>
        <TabsContent value="breaks"><BreaksReport /></TabsContent>
      </Tabs>
    </div>
  );
}
