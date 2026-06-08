"use client";

import { useTranslations, useLocale } from "next-intl";
import { User, Mail, Briefcase, MapPin, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { useMyEmployee, useEmployeeBasic } from "@/lib/hooks/use-employees";
import { useMyLeaveBalances, useHourlyBalance } from "@/lib/hooks/use-leave-balances";
import { useMyHourlyUsedHours } from "@/lib/hooks/use-leave-requests";
import { AlertTriangle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-end flex-1">{value}</span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
  ON_LEAVE: "bg-blue-100 text-blue-800 border-blue-200",
  SUSPENDED: "bg-amber-100 text-amber-800 border-amber-200",
  TERMINATED: "bg-red-100 text-red-800 border-red-200",
};

const LOCALE_MAP: Record<string, string> = { ar: "ar-SA", en: "en-US", tr: "tr-TR" };

export default function MyProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const displayLocale = LOCALE_MAP[locale] ?? "en-US";

  const { data: employee, isLoading } = useMyEmployee();
  const emp = employee as any;
  const { data: basicData } = useEmployeeBasic(emp?.id);
  const deptWithParent = (basicData as any)?.department ?? (employee?.department as any);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const { data: balancesData, isLoading: balancesLoading } = useMyLeaveBalances(currentYear);
  const { data: hourlyMonthly } = useHourlyBalance(emp?.id ?? "", currentYear, currentMonth);
  const balances: any[] = Array.isArray(balancesData)
    ? balancesData
    : (balancesData as any)?.data?.items ?? (balancesData as any)?.data ?? [];

  const hourlyBalance = balances.find((b: any) => b.leaveType?.maxHoursPerMonth != null);
  const { data: hourlyStats } = useMyHourlyUsedHours(hourlyBalance?.leaveTypeId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.noData")}</p>
      </div>
    );
  }

  const statusLabel = {
    ACTIVE: t("employees.statuses.active"),
    INACTIVE: t("employees.statuses.inactive"),
    ON_LEAVE: t("employees.statuses.onLeave"),
    SUSPENDED: t("employees.statuses.suspended"),
    TERMINATED: t("employees.statuses.terminated"),
  }[employee.employmentStatus] || employee.employmentStatus;

  const monthLabel = new Date(currentYear, currentMonth - 1).toLocaleDateString(displayLocale, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("myProfile.title")}
        description={t("myProfile.description")}
        actions={
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[employee.employmentStatus] || ""}`}>
            {statusLabel}
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* Personal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {t("employees.tabs.personal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <InfoRow label={t("employees.fields.employeeNumber")} value={employee.employeeNumber} />
            <InfoRow label={t("employees.fields.firstNameAr")} value={employee.firstNameAr} />
            <InfoRow label={t("employees.fields.lastNameAr")} value={employee.lastNameAr} />
            <InfoRow label={t("employees.fields.firstNameEn")} value={employee.firstNameEn} />
            <InfoRow label={t("employees.fields.lastNameEn")} value={employee.lastNameEn} />
            <InfoRow label={t("employees.fields.nationalId")} value={employee.nationalId} />
            <InfoRow
              label={t("employees.fields.gender")}
              value={t(`employees.genders.${employee.gender.toLowerCase()}`)}
            />
            <InfoRow
              label={t("employees.fields.dateOfBirth")}
              value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString("en-GB") : undefined}
            />
            {emp.nationality && <InfoRow label={t("employees.fields.nationality")} value={emp.nationality} />}
            {emp.maritalStatus && (
              <InfoRow
                label={t("employees.fields.maritalStatus")}
                value={t(`myProfile.maritalStatuses.${emp.maritalStatus}` as any, { defaultValue: emp.maritalStatus })}
              />
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              {t("employees.tabs.contact")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <InfoRow label={t("employees.fields.email")} value={employee.email} />
            <InfoRow label={t("employees.fields.phone")} value={employee.phone} />
            <InfoRow label={t("employees.fields.mobile")} value={employee.mobile} />
            {emp.currentAddress && (
              <div className="flex items-start justify-between py-2">
                <span className="text-sm text-muted-foreground shrink-0 w-40">{t("employees.fields.currentAddress")}</span>
                <span className="text-sm font-medium text-end flex-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {emp.currentAddress}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {t("employees.tabs.employment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <InfoRow
              label={t("employees.fields.department")}
              value={deptWithParent ? (deptWithParent.parent?.nameAr ? `${deptWithParent.parent.nameAr} > ${deptWithParent.nameAr}` : deptWithParent.nameAr) : undefined}
            />
            <InfoRow label={t("employees.fields.jobTitle")} value={emp.jobTitle?.nameAr} />
            <InfoRow label={t("employees.fields.jobGrade")} value={emp.jobGrade?.nameAr} />
            <InfoRow
              label={t("employees.fields.hireDate")}
              value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("en-GB") : undefined}
            />
            <InfoRow
              label={t("employees.fields.contractType")}
              value={t(`myProfile.contractTypes.${employee.contractType}` as any, { defaultValue: employee.contractType })}
            />
            {employee.manager && (
              <InfoRow
                label={t("employees.fields.manager")}
                value={`${(employee.manager as any).firstNameAr} ${(employee.manager as any).lastNameAr}`}
              />
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground shrink-0 w-40">{t("employees.fields.status")}</span>
              <Badge variant={employee.employmentStatus === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                {statusLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Leave Balances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {t("myProfile.leaveBalancesTitle", { year: currentYear })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balancesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("common.noData")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {balances.map((b: any) => {
                const isHourly = b.leaveType?.maxHoursPerMonth != null;
                const monthlyLimit = b.leaveType?.maxHoursPerMonth ?? 0;
                const stats = isHourly && hourlyStats ? hourlyStats : null;

                return (
                  <div key={b.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="text-sm font-medium truncate">{b.leaveType?.nameAr ?? "—"}</div>

                    {isHourly ? (
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">✅ {t("myProfile.hourly.paid")}</span>
                          <span className="font-medium text-green-600">{monthlyLimit} {t("myProfile.hourly.hourPerMonth")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">📊 {t("myProfile.hourly.used")}</span>
                          <span className="font-medium">{stats ? stats.usedHours.toFixed(1) : (b.usedHours ?? 0)}</span>
                        </div>
                        {(stats ? stats.pendingHours : (b.pendingHours ?? 0)) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">⏳ {t("myProfile.hourly.pending")}</span>
                            <span className="font-medium text-amber-600">{stats ? stats.pendingHours.toFixed(1) : b.pendingHours}</span>
                          </div>
                        )}
                        {(stats?.deductedHours ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">⚠️ {t("myProfile.hourly.deducted")}</span>
                            <span className="font-medium text-red-600">{stats!.deductedHours.toFixed(1)} {t("myProfile.hourly.fromSalary")}</span>
                          </div>
                        )}
                      </div>
                    ) : b.leaveType?.isUnlimited ? (
                      <div className="text-xs text-blue-600 font-medium">{t("myProfile.hourly.unlimited")}</div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t("myProfile.hourly.remaining")}</span>
                          <span className={`font-semibold text-sm ${b.remainingDays > 0 ? "text-green-600" : "text-red-500"}`}>
                            {b.remainingDays} / {b.totalDays}
                          </span>
                        </div>
                        {b.pendingDays > 0 && (
                          <div className="text-xs text-amber-600">
                            {t("myProfile.hourly.pendingDays", { days: b.pendingDays })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hourly Leave Monthly Balance */}
      {hourlyMonthly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t("myProfile.hourlyLeaveTitle", { month: monthLabel })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const maxMin = hourlyMonthly.usedByRequestsMinutes + hourlyMonthly.usedByTardinessMinutes + hourlyMonthly.remainingMinutes;
              const usedMin = hourlyMonthly.usedByRequestsMinutes + hourlyMonthly.usedByTardinessMinutes;
              const remMin = hourlyMonthly.remainingMinutes;
              const pct = maxMin > 0 ? Math.round((usedMin / maxMin) * 100) : 0;
              const fmt = (m: number) => { const h = Math.floor(m / 60); const mm = m % 60; return h ? `${h}:${String(mm).padStart(2, "0")}` : `${mm}m`; };
              const isDepleted = remMin === 0 && maxMin > 0;
              const isLow = !isDepleted && remMin > 0 && remMin < 30;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">{t("myProfile.hourly.max")}</p>
                      <p className="text-sm font-semibold">{fmt(maxMin)}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground mb-1">{t("myProfile.hourly.used")}</p>
                      <p className="text-sm font-semibold">{fmt(usedMin)}</p>
                    </div>
                    <div className={`rounded-lg border p-3 ${isDepleted ? "bg-red-50 border-red-200" : isLow ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                      <p className="text-xs text-muted-foreground mb-1">{t("myProfile.hourly.remaining")}</p>
                      <p className={`text-sm font-semibold ${isDepleted ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"}`}>{fmt(remMin)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t("myProfile.hourly.leavesLabel", { value: fmt(hourlyMonthly.usedByRequestsMinutes) })}</span>
                      <span>{t("myProfile.hourly.tardinessLabel", { value: fmt(hourlyMonthly.usedByTardinessMinutes) })}</span>
                      <span>{t("myProfile.hourly.percentUsed", { pct })}</span>
                    </div>
                  </div>
                  {isDepleted && (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {t("myProfile.hourly.depletedWarning")}
                    </div>
                  )}
                  {isLow && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {t("myProfile.hourly.lowWarning", { value: fmt(remMin) })}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
