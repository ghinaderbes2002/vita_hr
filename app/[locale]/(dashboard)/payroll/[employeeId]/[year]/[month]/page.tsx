"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowRight, DollarSign, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePayslip } from "@/lib/hooks/use-payroll";
import { useEmployeeAttendanceConfig } from "@/lib/hooks/use-employee-attendance-config";
import { useEmployee } from "@/lib/hooks/use-employees";
import { useLocale } from "next-intl";
import { Info } from "lucide-react";

const MONTHS = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function money(val: string | number | undefined): string {
  return "$" + (Number(val) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Row({ label, value, variant }: { label: string; value: string; variant?: "positive" | "negative" | "neutral" }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${
        variant === "positive" ? "text-green-700" :
        variant === "negative" ? "text-red-600" : ""
      }`}>
        {variant === "positive" ? "+" : variant === "negative" ? "-" : ""}{value}
      </span>
    </div>
  );
}

export default function PayslipPage() {
  const params = useParams();
  const router = useRouter();

  const employeeId = params.employeeId as string;
  const year = Number(params.year);
  const month = Number(params.month);

  const locale = useLocale();
  const { data, isLoading } = usePayslip(employeeId, year, month);
  const { data: attendanceConfig } = useEmployeeAttendanceConfig(employeeId);
  const { data: employeeData } = useEmployee(employeeId);
  const salaryLinked = (attendanceConfig as any)?.salaryLinked !== false;

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

  const s = data.salary;
  const bonusDetails = Array.isArray(s.bonusDetails) ? s.bonusDetails : [];
  const penaltyDetails = Array.isArray(s.penaltyDetails) ? s.penaltyDetails : [];
  const bonusAmount = Number(s.bonusAmount) || 0;
  const penaltyAmount = Number(s.penaltyAmount) || 0;
  const totalDeduction = Number(s.deductions?.totalDeduction) || 0;

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
      </div>

      {/* Fixed Salary Notice */}
      {!salaryLinked && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          هذا الموظف له راتب ثابت غير مرتبط بالحضور — لا تُطبق خصومات الغياب أو التأخر.
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
        <CardContent className="space-y-1 text-sm">
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
                  ? (employeeData as any)?.department?.nameAr || data.employee.department?.nameAr || "—"
                  : (employeeData as any)?.department?.nameEn || data.employee.department?.nameAr || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">المسمى:</span>{" "}
              <span className="font-medium">
                {locale === "ar"
                  ? (employeeData as any)?.jobTitle?.nameAr || data.employee.jobTitle?.nameAr || "—"
                  : (employeeData as any)?.jobTitle?.nameEn || data.employee.jobTitle?.nameAr || "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">تفاصيل الراتب</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label="الراتب الأساسي" value={money(s.basicSalary)} />
          <Row label={`البدلات (${money(s.allowances?.total)} إجمالي)`} value={money(s.allowances?.total)} />
          {Number(s.overtimePay) > 0 && (
            <Row label="أجر العمل الإضافي" value={money(s.overtimePay)} variant="positive" />
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold">الراتب الإجمالي</span>
            <span className="text-sm font-bold">{money(s.grossSalary)} ر.س</span>
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
                  +{money(s.bonusAmount)}                </Badge>
              </div>
              {bonusDetails.length > 0 && (
                <div className="pr-4 pb-2 space-y-1">
                  {bonusDetails.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-green-700">
                      <span>{b.reason}</span>
                      <span className="font-mono">+${(b.amount || 0).toLocaleString("en-US")} ر.س</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deductions */}
          {totalDeduction > 0 && (
            <Row
              label={`خصومات الحضور (${money(s.deductions?.attendanceDeduction)} + غياب ${money(s.deductions?.absenceDeduction)})`}
              value={money(totalDeduction)}
              variant="negative"
            />
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
                  -{money(s.penaltyAmount)}                </Badge>
              </div>
              {penaltyDetails.length > 0 && (
                <div className="pr-4 pb-2 space-y-1">
                  {penaltyDetails.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-red-700">
                      <span>{p.description}</span>
                      <span className="font-mono">-${(p.amount || 0).toLocaleString("en-US")} ر.س</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator className="my-1" />

          {/* Net Salary */}
          <div className="flex items-center justify-between py-3">
            <span className="text-base font-bold">صافي الراتب</span>
            <span className="text-lg font-bold text-primary">{money(s.netSalary)} ر.س</span>
          </div>

          {/* Formula note */}
          <div className="py-2">
            <p className="text-xs text-muted-foreground">
              المعادلة: الراتب الإجمالي ({money(s.grossSalary)}) + المكافآت ({money(bonusAmount)}) − الخصومات ({money(totalDeduction)}) − الجزاءات ({money(penaltyAmount)}) = {money(s.netSalary)}            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
