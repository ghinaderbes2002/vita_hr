"use client";

import { useTranslations } from "next-intl";
import { User, Mail, Briefcase, MapPin, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { useMyEmployee } from "@/lib/hooks/use-employees";
import { useMyLeaveBalances } from "@/lib/hooks/use-leave-balances";

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

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  FIXED_TERM: "عقد محدد المدة",
  INDEFINITE: "عقد غير محدد المدة",
  TEMPORARY: "مؤقت",
  TRAINEE: "متدرب",
  CONSULTANT: "استشاري",
  SERVICE_PROVIDER: "مزود خدمة",
};

const MARITAL_STATUS_LABELS: Record<string, string> = {
  SINGLE: "أعزب",
  MARRIED: "متزوج",
  DIVORCED: "مطلق",
  WIDOWED: "أرمل",
};

export default function MyProfilePage() {
  const t = useTranslations();
  const { data: employee, isLoading } = useMyEmployee();
  const emp = employee as any;
  const currentYear = new Date().getFullYear();
  const { data: balancesData, isLoading: balancesLoading } = useMyLeaveBalances(currentYear);
  const balances: any[] = Array.isArray(balancesData)
    ? balancesData
    : (balancesData as any)?.data?.items ?? (balancesData as any)?.data ?? [];

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="شؤون الموظف"
        description="بياناتك الشخصية والوظيفية"
        actions={
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[employee.employmentStatus] || ""}`}>
            {statusLabel}
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* البيانات الشخصية */}
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
              <InfoRow label={t("employees.fields.maritalStatus")} value={MARITAL_STATUS_LABELS[emp.maritalStatus] || emp.maritalStatus} />
            )}
          </CardContent>
        </Card>

        {/* بيانات التواصل */}
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

        {/* البيانات الوظيفية */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {t("employees.tabs.employment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <InfoRow label={t("employees.fields.department")} value={(employee.department as any)?.nameAr} />
            <InfoRow label={t("employees.fields.jobTitle")} value={emp.jobTitle?.nameAr} />
            <InfoRow label={t("employees.fields.jobGrade")} value={emp.jobGrade?.nameAr} />
            <InfoRow
              label={t("employees.fields.hireDate")}
              value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("en-GB") : undefined}
            />
            <InfoRow
              label={t("employees.fields.contractType")}
              value={CONTRACT_TYPE_LABELS[employee.contractType] || employee.contractType}
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

      {/* أرصدة الإجازات */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            أرصدة الإجازات ({currentYear})
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
              {balances.map((b: any) => (
                <div key={b.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="text-sm font-medium truncate">{b.leaveType?.nameAr ?? "—"}</div>
                  {b.leaveType?.isUnlimited ? (
                    <div className="text-xs text-blue-600 font-medium">غير محدود</div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>متبقي</span>
                      <span className={`font-semibold text-sm ${b.remainingDays > 0 ? "text-green-600" : "text-red-500"}`}>
                        {b.remainingDays} / {b.totalDays}
                      </span>
                    </div>
                  )}
                  {((b.usedHours ?? 0) > 0 || (b.pendingHours ?? 0) > 0) && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {(b.usedHours ?? 0) > 0 && <div>مستخدمة: <span className="font-medium text-foreground">{b.usedHours}س</span></div>}
                      {(b.pendingHours ?? 0) > 0 && <div>معلقة: <span className="font-medium text-amber-600">{b.pendingHours}س</span></div>}
                    </div>
                  )}
                  {b.pendingDays > 0 && (
                    <div className="text-xs text-amber-600">معلق: {b.pendingDays} يوم</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
