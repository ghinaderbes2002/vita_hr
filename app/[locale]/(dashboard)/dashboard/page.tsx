"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Clock, AlertCircle, PlusCircle, ClipboardList,
  Package, Briefcase, TrendingUp, FileWarning, UserX, ChevronRight, UserPlus, Hourglass, Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useEmployeesSummary, useExpiryDatesReport } from "@/lib/hooks/use-hr-reports";
import { useLeaveRequests } from "@/lib/hooks/use-leave-requests";
import { usePendingMyApproval } from "@/lib/hooks/use-requests";
import { useJobApplicationStats } from "@/lib/hooks/use-job-applications";
import { useTopAbsencesReport } from "@/lib/hooks/use-attendance-reports";
import { useEmployees } from "@/lib/hooks/use-employees";
import { EmployeeDialog } from "@/components/features/employees/employee-dialog";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user } = useAuthStore();
  const locale = useLocale();
  const router = useRouter();
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { data: summary, isLoading: summaryLoading } = useEmployeesSummary();
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ limit: 1 });
  const { data: pendingLeaves, isLoading: leavesLoading } = useLeaveRequests({ status: "PENDING_MANAGER", limit: 1 });
  const { data: pendingHrLeaves } = useLeaveRequests({ status: "PENDING_HR", limit: 1 });
  const { data: jobStats, isLoading: jobStatsLoading } = useJobApplicationStats();
  const { data: expiryData, isLoading: expiryLoading } = useExpiryDatesReport(30);
  const { data: topAbsences, isLoading: absencesLoading } = useTopAbsencesReport({ year, month, limit: 5 });
  const { data: pendingRequestsData } = usePendingMyApproval({ limit: 1 });

  const s = summary as any;
  const employeeTotal =
    s?.total ??
    s?.totalEmployees ??
    (employeesData as any)?.meta?.total ??
    (employeesData as any)?.data?.meta?.total ??
    (employeesData as any)?.data?.total ??
    "—";

  const pl = pendingLeaves as any;
  const pendingManagerCount = pl?.total ?? pl?.data?.total ?? pl?.meta?.total ?? pl?.data?.meta?.total ?? 0;
  const plHr = pendingHrLeaves as any;
  const pendingHrCount = plHr?.total ?? plHr?.data?.total ?? plHr?.meta?.total ?? plHr?.data?.meta?.total ?? 0;
  const pendingLeavesCount = leavesLoading ? "—" : (Number(pendingManagerCount) + Number(pendingHrCount)) || 0;
  const totalPendingLeaves = typeof pendingLeavesCount === "number" ? pendingLeavesCount : 0;

  const pendingApplications = (jobStats as any)?.PENDING ?? (jobStats as any)?.pending ?? "—";
  const pr = pendingRequestsData as any;
  const pendingRequestsCount = Number(pr?.total ?? pr?.data?.total ?? pr?.meta?.total ?? pr?.data?.meta?.total ?? 0);
  const expiryCount = (expiryData as any)?.count ?? 0;
  const expiryItems: any[] = (expiryData as any)?.items || [];
  const absenceItems: any[] = (topAbsences as any)?.items || [];

  const stats = [
    {
      title: t("stats.totalEmployees"),
      value: (summaryLoading && employeesLoading) ? null : employeeTotal,
      icon: Users,
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
      onClick: () => router.push(`/${locale}/employees`),
    },
    {
      title: "الإجازات المعلقة",
      value: leavesLoading ? null : pendingLeavesCount,
      icon: Hourglass,
      iconBg: "bg-amber-50 dark:bg-amber-950",
      iconColor: "text-amber-600 dark:text-amber-400",
      onClick: () => router.push(`/${locale}/leaves/pending-approval`),
    },
    {
      title: "الطلبات الإدارية المعلقة",
      value: pendingRequestsCount,
      icon: Bell,
      iconBg: "bg-sky-50 dark:bg-sky-950",
      iconColor: "text-sky-600 dark:text-sky-400",
      onClick: () => router.push(`/${locale}/requests/pending-manager`),
    },
    {
      title: t("stats.pendingApplications"),
      value: jobStatsLoading ? null : pendingApplications,
      icon: Briefcase,
      iconBg: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-600 dark:text-purple-400",
      onClick: () => router.push(`/${locale}/job-applications`),
    },
    {
      title: t("stats.expiringContracts"),
      value: expiryLoading ? null : expiryCount,
      icon: AlertCircle,
      iconBg: expiryCount > 0 ? "bg-red-50 dark:bg-red-950" : "bg-gray-50 dark:bg-gray-900",
      iconColor: expiryCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400",
      onClick: () => router.push(`/${locale}/reports/hr`),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("welcomeMessage", { name: user?.fullName || user?.username || "—" })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={stat.onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground font-medium truncate">{stat.title}</p>
                  {stat.value === null ? (
                    <Skeleton className="h-9 w-16 mt-2" />
                  ) : (
                    <p className="text-3xl font-bold mt-2 tracking-tight">{stat.value}</p>
                  )}
                </div>
                <div className={`p-3 rounded-xl shrink-0 ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expiring Contracts */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-red-500" />
              {t("sections.expiringContracts")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push(`/${locale}/reports/hr`)}>
              {t("viewAll")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {expiryLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : expiryItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("sections.noExpiring")}</p>
            ) : (
              <div className="space-y-2">
                {expiryItems.slice(0, 5).map((item) => (
                  <div key={item.employeeId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{item.firstNameAr} {item.lastNameAr}</p>
                      <p className="text-xs text-muted-foreground">{item.departmentAr} · {item.employeeNumber}</p>
                    </div>
                    <Badge variant={item.daysRemaining <= 7 ? "destructive" : "outline"} className="shrink-0 text-xs">
                      {item.daysRemaining} {t("sections.days")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Absences */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserX className="h-4 w-4 text-amber-500" />
              {t("sections.topAbsences")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push(`/${locale}/reports/attendance`)}>
              {t("viewAll")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {absencesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : absenceItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("sections.noAbsences")}</p>
            ) : (
              <div className="space-y-2">
                {absenceItems.map((item, i) => (
                  <div key={item.employee?.id ?? i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <div>
                        <p className="font-medium">
                          {item.employee?.firstNameAr} {item.employee?.lastNameAr}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.employee?.employeeNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                        {item.absenceCount} {t("sections.absenceDays")}
                      </Badge>
                      {item.lateCount > 0 && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                          {item.lateCount} {t("sections.lateTimes")}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Distribution */}
      {!summaryLoading && (summary as any)?.byDepartment?.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t("sections.byDepartment")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push(`/${locale}/departments`)}>
              {t("viewAll")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {((summary as any).byDepartment as { departmentAr: string; count: number }[])
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
                .map((dept) => {
                  const pct = employeeTotal > 0 ? Math.round((dept.count / employeeTotal) * 100) : 0;
                  return (
                    <div key={dept.departmentAr} className="flex items-center gap-3 text-sm">
                      <span className="w-36 truncate text-muted-foreground shrink-0">{dept.departmentAr}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right font-medium shrink-0">{dept.count}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/employees`)}>
              <Users className="h-5 w-5" />
              <span className="text-xs">{t("actions.employees")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4 border-primary/40 text-primary hover:bg-primary/5" onClick={() => setAddEmployeeOpen(true)}>
              <UserPlus className="h-5 w-5" />
              <span className="text-xs">{t("actions.addEmployee")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/reports/leave`)}>
              <Calendar className="h-5 w-5" />
              <span className="text-xs">{t("actions.leaves")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/job-applications`)}>
              <Briefcase className="h-5 w-5" />
              <span className="text-xs">{t("actions.recruitment")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/custodies`)}>
              <Package className="h-5 w-5" />
              <span className="text-xs">{t("actions.custodies")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/requests/new`)}>
              <PlusCircle className="h-5 w-5" />
              <span className="text-xs">{t("actions.newRequest")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/requests/all`)}>
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs">{t("actions.allRequests")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/reports/hr`)}>
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">{t("actions.reports")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/attendance`)}>
              <Clock className="h-5 w-5" />
              <span className="text-xs">{t("actions.attendance")}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen} />
    </div>
  );
}
