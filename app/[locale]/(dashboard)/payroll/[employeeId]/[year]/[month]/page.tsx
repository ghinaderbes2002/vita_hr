"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, Clock, Calendar, Briefcase, Info, Percent,
  FileEdit, CheckCircle2, Coffee, Download, Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePayslip, useUpdatePayrollNote, usePayrollByEmployee, useDownloadPayslipPDF } from "@/lib/hooks/use-payroll";
import { useEmployeeAttendanceConfig } from "@/lib/hooks/use-employee-attendance-config";
import { useEmployee } from "@/lib/hooks/use-employees";
import { useLocale } from "next-intl";
import { formatUSD, formatUSDRounded } from "@/lib/utils";
import { AddOtherDeductionDialog } from "@/components/features/payroll/add-other-deduction-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

const MONTHS = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function Row({
  label,
  value,
  variant,
  sub,
}: {
  label: string;
  value: string;
  variant?: "positive" | "negative";
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="text-sm text-muted-foreground">{label}</span>
        {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
      </div>
      <span className={`text-sm font-medium ${
        variant === "positive" ? "text-green-700" :
        variant === "negative" ? "text-red-600" : ""
      }`}>
        {value}
      </span>
    </div>
  );
}

export default function PayslipPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const { hasPermission } = usePermissions();

  const employeeId = params.employeeId as string;
  const year = Number(params.year);
  const month = Number(params.month);

  const { data, isLoading } = usePayslip(employeeId, year, month);
  const { data: monthly } = usePayrollByEmployee(employeeId, year, month);
  const { data: attendanceConfig } = useEmployeeAttendanceConfig(employeeId);
  const { data: employeeData } = useEmployee(employeeId);
  const updateNote = useUpdatePayrollNote();
  const downloadPDF = useDownloadPayslipPDF();

  const [deductionOpen, setDeductionOpen] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteValue, setNoteValue] = useState("");

  const salaryLinked = (attendanceConfig as any)?.salaryLinked !== false;
  const canEdit = hasPermission(PERMISSIONS.ATTENDANCE_PAYROLL.GENERATE);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">لا توجد بيانات للراتب</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة
        </Button>
      </div>
    );
  }

  const now = new Date();
  const isCurrentOrFutureMonth =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  const s = data.salary;
  const leaves = data.leaves;
  const attendance = data.attendance;
  const missions = data.missions;
  const deductions = s.deductions;

  const bonusDetails = Array.isArray(s.bonusDetails) ? s.bonusDetails : [];
  const penaltyDetails = Array.isArray(s.penaltyDetails) ? s.penaltyDetails : [];
  const bonusAmount = Number(s.bonusAmount) || 0;
  const penaltyAmount = Number(s.penaltyAmount) || 0;
  const totalDeduction = Number(deductions?.totalDeduction) || 0;
  const unpaidLeaveAmt = Number(deductions?.unpaidLeaveAmount) || 0;
  const hourlyLeaveAmt = Number(deductions?.hourlyLeaveAmount) || 0;
  const advanceDeduction = Number(deductions?.advanceDeduction) || 0;
  const otherDeduction = Number(deductions?.otherDeductionAmount) || 0;
  const commissionAmt = Number(s.commissionAmount) || 0;
  const breakdown = s.deductionBreakdown ?? null;
  const hbs = monthly?.hourlyBalanceSummary;
  const bol = monthly?.deductionBreakdown?.breakOverLimit as any;

  const fmMin = (min: number | null | undefined): string => {
    const n = Number(min);
    if (!n || isNaN(n)) return "—";
    const h = Math.floor(n / 60);
    const m = n % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")} س` : `${n} د`;
  };
  const proRation = s.proRationFactor ?? null;
  const excluded = Number(s.excludedAllowancesAmount ?? 0);
  const deductibleBase = Number(s.deductibleBaseSalary ?? 0);
  const workDaysInMonth = s.workingDaysInMonth ?? attendance?.workingDays ?? null;
  const empWorkDays = s.employeeWorkingDays ?? attendance?.presentDays ?? null;
  const totalLateEffective = s.totalLateMinutesEffective ?? null;
  const compensationMins = s.totalCompensationMinutes ?? null;

  const roundedNet = s.roundedNetSalary != null
    ? Number(s.roundedNetSalary)
    : null;
  const netDisplay = roundedNet != null ? formatUSDRounded(roundedNet) : formatUSD(s.netSalary);

  const handleNoteSave = async () => {
    if (!data.payrollId) return;
    await updateNote.mutateAsync({ payrollId: data.payrollId, notes: noteValue });
    setNoteEditing(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة
        </Button>
        <div>
          <h1 className="text-xl font-bold">كشف راتب — {MONTHS[month]} {year}</h1>
          <p className="text-sm text-muted-foreground">
            {data.employee.firstNameAr} {data.employee.lastNameAr} · {data.employee.employeeNumber}
          </p>
        </div>
        <div className="mr-auto flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          {data.payrollId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => downloadPDF.mutate({
                payrollId: data.payrollId,
                filename: `كشف-راتب-${data.employee?.firstNameAr ?? ""}-${MONTHS[month]}-${year}.pdf`,
              })}
              disabled={downloadPDF.isPending}
            >
              <Download className="h-4 w-4" />
              {downloadPDF.isPending ? "جاري التنزيل..." : "تنزيل PDF"}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setDeductionOpen(true)}
            >
              <TrendingDown className="h-4 w-4" />
              خصم إضافي
            </Button>
          )}
        </div>
      </div>

      {/* Warnings */}
      {isCurrentOrFutureMonth && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">تحذير: الشهر لم ينته بعد</p>
            <p className="text-xs mt-0.5 text-amber-700">
              هذا الراتب محسوب على أساس الشهر كاملاً، الأرقام غير نهائية.
            </p>
          </div>
        </div>
      )}

      {!salaryLinked && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          هذا الموظف له راتب ثابت غير مرتبط بالحضور.
        </div>
      )}

      {/* Employee Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            بيانات الموظف
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">الاسم:</span>{" "}
              <span className="font-medium">{data.employee.firstNameAr} {data.employee.lastNameAr}</span>
            </div>
            <div>
              <span className="text-muted-foreground">رقم الموظف:</span>{" "}
              <span className="font-medium">{data.employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">القسم:</span>{" "}
              <span className="font-medium">
                {locale === "ar"
                  ? (employeeData as any)?.department?.nameAr || data.employee.department || "—"
                  : (employeeData as any)?.department?.nameEn || data.employee.department || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">المسمى:</span>{" "}
              <span className="font-medium">
                {locale === "ar"
                  ? (employeeData as any)?.jobTitle?.nameAr || data.employee.jobTitle || "—"
                  : (employeeData as any)?.jobTitle?.nameEn || data.employee.jobTitle || "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates */}
      {monthly && (monthly.dailyRate || monthly.hourlyRate) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4" />
              المعدلات المُطبَّقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "تكلفة اليوم",   val: `${formatUSD(monthly.dailyRate)}` },
                { label: "تكلفة الساعة",  val: `${formatUSD(monthly.hourlyRate)}` },
                { label: "تكلفة الدقيقة", val: `${Number(monthly.minuteRate).toFixed(4)}` },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-md bg-muted/30 p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium mt-0.5 tabular-nums">{val}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Card */}
      {attendance && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              الحضور والغياب
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {workDaysInMonth != null && <Row label="أيام العمل في الشهر" value={String(workDaysInMonth)} />}
            {empWorkDays != null && <Row label="أيام الحضور الفعلية" value={String(empWorkDays)} />}
            {attendance.absentDays > 0 && (
              <Row label="أيام الغياب" value={String(attendance.absentDays)} variant="negative" />
            )}
            {attendance.lateDays > 0 && (
              <Row label="أيام التأخر" value={String(attendance.lateDays)} />
            )}
            {totalLateEffective != null && totalLateEffective > 0 && (
              <Row label="دقائق التأخر الفعلية" value={`${totalLateEffective} د`} variant="negative" />
            )}
            {compensationMins != null && compensationMins > 0 && (
              <Row label="دقائق التعويض" value={`${compensationMins} د`} variant="positive" />
            )}
            {attendance.overtimeWorkdayMinutes > 0 && (
              <Row label="أوفرتايم أيام عمل" value={`${attendance.overtimeWorkdayMinutes} د`} variant="positive" />
            )}
            {attendance.overtimeHolidayMinutes > 0 && (
              <Row label="أوفرتايم أيام إجازة" value={`${attendance.overtimeHolidayMinutes} د`} variant="positive" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaves Card */}
      {leaves && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              الإجازات
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {leaves.paidLeaveDays > 0 && (
              <Row label="إجازة مدفوعة" value={`${leaves.paidLeaveDays} يوم`} />
            )}
            {leaves.sickLeaveDays > 0 && (
              <Row label="إجازة مرضية" value={`${leaves.sickLeaveDays} يوم`} />
            )}
            {leaves.unpaidLeaveDays > 0 && (
              <Row
                label="إجازة غير مدفوعة"
                value={`${leaves.unpaidLeaveDays} يوم (${formatUSD(unpaidLeaveAmt)})`}
                variant="negative"
              />
            )}
            {leaves.hourlyLeaveMinutes > 0 && (
              <Row
                label="إجازات ساعية"
                value={`${leaves.hourlyLeaveMinutes} د (${formatUSD(hourlyLeaveAmt)})`}
                variant="negative"
              />
            )}
            {leaves.paidLeaveDays === 0 && leaves.sickLeaveDays === 0 &&
             leaves.unpaidLeaveDays === 0 && leaves.hourlyLeaveMinutes === 0 && (
              <p className="text-sm text-muted-foreground py-2">لا إجازات هذا الشهر</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missions Card */}
      {missions && (missions.internalMissionDays > 0 || missions.externalMissionDays > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              المهمات
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {missions.internalMissionDays > 0 && (
              <Row
                label="مهمات داخلية"
                value={`${missions.internalMissionDays} يوم (${formatUSD(missions.internalMissionAmount)})`}
                variant="positive"
              />
            )}
            {missions.externalMissionDays > 0 && (
              <Row
                label="مهمات خارجية"
                value={`${missions.externalMissionDays} يوم (${formatUSD(missions.externalMissionAmount)})`}
                variant="positive"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Overtime Card */}
      {attendance && (attendance.overtimeWorkdayMinutes > 0 || attendance.overtimeHolidayMinutes > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              العمل الإضافي
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {attendance.overtimeWorkdayMinutes > 0 && (
              <Row
                label="إضافي أيام العمل"
                value={`${attendance.overtimeWorkdayMinutes} د — ${formatUSD(s.overtimeWorkdayPay ?? 0)}`}
                variant="positive"
              />
            )}
            {attendance.overtimeHolidayMinutes > 0 && (
              <Row
                label="إضافي أيام الإجازة"
                value={`${attendance.overtimeHolidayMinutes} د — ${formatUSD(s.overtimeHolidayPay ?? 0)}`}
                variant="positive"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tardiness breakdown */}
      {monthly && monthly.totalLateMinutes > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              التأخير — تفصيل
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <Row label="إجمالي دقائق التأخير"           value={fmMin(monthly.totalLateMinutes)} />
            {monthly.tardinessCompensatedMinutes > 0 && (
              <Row label="معوَّض بنفس اليوم (عمل إضافي)" value={fmMin(monthly.tardinessCompensatedMinutes)} variant="positive" />
            )}
            {monthly.tardinessJustifiedMinutes > 0 && (
              <Row label="مبرَّر باعتماد"                value={fmMin(monthly.tardinessJustifiedMinutes)} variant="positive" />
            )}
            {monthly.tardinessOffsetMinutes > 0 && (
              <Row label="مغطى من رصيد الإجازة الساعية"  value={fmMin(monthly.tardinessOffsetMinutes)} variant="positive" />
            )}
            <Row
              label="يُحسم من الراتب"
              value={fmMin(monthly.tardinessUncompensatedMinutes)}
              variant={monthly.tardinessUncompensatedMinutes > 0 ? "negative" : undefined}
            />
            <Row
              label="مبلغ الحسم"
              value={formatUSD(monthly.tardinessDeductionAmount)}
              variant={monthly.tardinessDeductionAmount > 0 ? "negative" : undefined}
            />
            {monthly.tardinessDeductionAmount === 0 && (
              <div className="flex items-center gap-1.5 py-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                لا حسم تأخير هذا الشهر
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hourly balance summary */}
      {hbs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              رصيد الإجازة الساعية — الشهر
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <Row label="الحد الأقصى الشهري"       value={fmMin(hbs.maxMonthlyMinutes)} />
            <Row label="استخدمت كإجازة"           value={fmMin(hbs.usedByEmployeeRequests)} />
            <Row label="استخدمت كتعويض تأخير"     value={fmMin(hbs.usedByTardinessOffset)} />
            <Row label="إجمالي المستخدم"          value={fmMin(hbs.totalUsed)} />
            <Row
              label="المتبقي"
              value={fmMin(hbs.remaining)}
              variant={hbs.remaining === 0 ? "negative" : "positive"}
            />
          </CardContent>
        </Card>
      )}

      {/* Break over limit */}
      {bol && (Number(bol.overLimitMinutes) > 0 || Number(bol.deductionAmount) > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coffee className="h-4 w-4 text-orange-500" />
              البريكات — تجاوز الحد
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {bol.totalBreakMinutes != null && <Row label="إجمالي وقت البريك"   value={fmMin(bol.totalBreakMinutes)} />}
            {bol.allowedBreakMinutes != null && <Row label="الحد المسموح"       value={fmMin(bol.allowedBreakMinutes)} />}
            <Row label="الوقت الزائد"         value={fmMin(bol.overLimitMinutes)} variant="negative" />
            {bol.deductibleMinutes != null && <Row label="الدقائق المحسومة"   value={fmMin(bol.deductibleMinutes)} variant="negative" />}
            <Row label="مبلغ الحسم"           value={formatUSD(bol.deductionAmount)} variant="negative" />
          </CardContent>
        </Card>
      )}

      {/* Salary Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">تفاصيل الراتب</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label="الراتب الأساسي" value={formatUSD(s.basicSalary)} />
          {Number(s.allowances?.total) > 0 && (
            <Row label="البدلات" value={formatUSD(s.allowances?.total)} />
          )}
          {Number(s.overtimePay) > 0 && (
            <Row label="أجر العمل الإضافي" value={formatUSD(s.overtimePay)} variant="positive" />
          )}
          {((missions?.internalMissionAmount ?? 0) > 0 || (missions?.externalMissionAmount ?? 0) > 0) && (
            <Row
              label="بدل المهمات"
              value={formatUSD((missions?.internalMissionAmount || 0) + (missions?.externalMissionAmount || 0))}
              variant="positive"
            />
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold">الراتب الإجمالي</span>
            <span className="text-sm font-bold">{formatUSD(s.grossSalary)}</span>
          </div>

          <Separator className="my-1" />

          {/* Bonuses */}
          {bonusAmount > 0 && (
            <div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  المكافآت
                </span>
                <Badge className="bg-green-50 text-green-700 border-green-200 font-mono text-xs">
                  +{formatUSD(bonusAmount)}
                </Badge>
              </div>
              {bonusDetails.length > 0 && (
                <div className="pr-4 pb-2 space-y-1">
                  {bonusDetails.map((b: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs text-green-700">
                      <span>{b.reason}</span>
                      <span className="font-mono">+{formatUSD(b.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Commission */}
          {commissionAmt > 0 && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-emerald-700 font-medium">عمولة المبيعات</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs">
                +{formatUSD(commissionAmt)}
              </Badge>
            </div>
          )}

          <Separator className="my-1" />

          {/* Deductions */}
          {totalDeduction > 0 && (
            <div className="py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  خصومات الحضور
                </span>
                <span className="text-sm font-medium text-red-600">-{formatUSD(totalDeduction)}</span>
              </div>
              {Number(deductions?.attendanceDeduction) > 0 && (
                <div className="flex justify-between text-xs text-red-600 pr-4">
                  <span>تأخر</span>
                  <span>-{formatUSD(deductions?.attendanceDeduction)}</span>
                </div>
              )}
              {Number(deductions?.absenceDeduction) > 0 && (
                <div className="flex justify-between text-xs text-red-600 pr-4">
                  <span>غياب</span>
                  <span>-{formatUSD(deductions?.absenceDeduction)}</span>
                </div>
              )}
              {unpaidLeaveAmt > 0 && (
                <div className="flex justify-between text-xs text-red-600 pr-4">
                  <span>إجازة غير مدفوعة</span>
                  <span>-{formatUSD(unpaidLeaveAmt)}</span>
                </div>
              )}
              {hourlyLeaveAmt > 0 && (
                <div className="flex justify-between text-xs text-red-600 pr-4">
                  <span>إجازة ساعية</span>
                  <span>-{formatUSD(hourlyLeaveAmt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Penalties */}
          {penaltyAmount > 0 && (
            <div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  الجزاءات
                </span>
                <Badge className="bg-red-50 text-red-700 border-red-200 font-mono text-xs">
                  -{formatUSD(penaltyAmount)}
                </Badge>
              </div>
              {penaltyDetails.length > 0 && (
                <div className="pr-4 pb-2 space-y-1">
                  {penaltyDetails.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs text-red-700">
                      <span>{p.description}</span>
                      <span className="font-mono">-{formatUSD(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advance Deduction */}
          {advanceDeduction > 0 && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-orange-700 font-medium">خصم السلفة</span>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-mono text-xs">
                -{formatUSD(advanceDeduction)}
              </Badge>
            </div>
          )}

          {/* Other Deduction */}
          {otherDeduction > 0 && (
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-red-600 font-medium">خصم إضافي</span>
                {deductions?.otherDeductionNotes && (
                  <p className="text-xs text-muted-foreground">{deductions.otherDeductionNotes}</p>
                )}
              </div>
              <Badge className="bg-red-50 text-red-700 border-red-200 font-mono text-xs">
                -{formatUSD(otherDeduction)}
              </Badge>
            </div>
          )}

          <Separator className="my-1" />

          {/* Net Salary */}
          <div className="flex items-center justify-between py-3">
            <span className="text-base font-bold">صافي الراتب</span>
            <span className="text-lg font-bold text-primary">{netDisplay}</span>
          </div>
          {roundedNet != null && Math.abs(roundedNet - Number(s.netSalary)) > 0.01 && (
            <p className="text-xs text-muted-foreground pb-2">
              المبلغ الدقيق: {formatUSD(s.netSalary)} — تم التقريب
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pro-ration / Calculation Details */}
      {(proRation !== null || workDaysInMonth !== null) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4" />
              تفاصيل الاحتساب
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            {proRation !== null && (
              <Row
                label="نسبة الاحتساب"
                value={proRation < 1 ? `${(proRation * 100).toFixed(0)}%` : "شهر كامل (100%)"}
              />
            )}
            {deductibleBase > 0 && (
              <Row label="وعاء الخصم الفعلي" value={formatUSD(deductibleBase)} />
            )}
            {excluded > 0 && (
              <Row label="مستثنى من الوعاء (بدل طعام)" value={formatUSD(excluded)} variant="positive" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Breakdown */}
      {breakdown && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              تفصيل خصومات الحضور
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <Row
              label="خصم التأخر"
              value={formatUSD(breakdown.lateDeduction)}
              variant={breakdown.lateDeduction > 0 ? "negative" : undefined}
            />
            <Row
              label="خصم الغياب"
              value={formatUSD(breakdown.absenceDeduction)}
              variant={breakdown.absenceDeduction > 0 ? "negative" : undefined}
            />
            {breakdown.breakOverLimitDeduction > 0 && (
              <Row
                label="خصم الاستراحة الزائدة"
                value={formatUSD(breakdown.breakOverLimitDeduction)}
                variant="negative"
              />
            )}
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-semibold">إجمالي الخصومات</span>
              <span className="text-sm font-bold text-red-700">{formatUSD(breakdown.totalDeduction)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              ملاحظات
            </span>
            {canEdit && !noteEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setNoteValue(data.notes || ""); setNoteEditing(true); }}
              >
                تعديل
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {noteEditing ? (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm min-h-20 bg-background"
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="أضف ملاحظة..."
                dir="rtl"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setNoteEditing(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleNoteSave} disabled={updateNote.isPending}>حفظ</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {data.notes || "لا توجد ملاحظات"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deduction Dialog */}
      {data.payrollId && (
        <AddOtherDeductionDialog
          open={deductionOpen}
          onOpenChange={setDeductionOpen}
          payrollId={data.payrollId}
          currentAmount={otherDeduction}
          currentNotes={deductions?.otherDeductionNotes || ""}
        />
      )}
    </div>
  );
}
