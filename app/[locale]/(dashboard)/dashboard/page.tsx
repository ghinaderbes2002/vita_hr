"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Clock, AlertCircle, PlusCircle,
  Package, Briefcase, TrendingUp, FileWarning, UserX, ChevronRight, ChevronDown,
  UserPlus, Bell, FileText, ExternalLink, Hourglass, ClipboardCheck,
  CheckCircle2, UserCheck, BarChart3, DollarSign, ShieldCheck, ClipboardEdit, CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useQuery } from "@tanstack/react-query";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { usePendingMyApproval } from "@/lib/hooks/use-requests";
import { usePendingManagerLeaveRequests } from "@/lib/hooks/use-leave-requests";
import { useProbationEvaluations, useProbationEvaluationsByEmployee } from "@/lib/hooks/use-probation-evaluations";
import { useMyEmployee, useSubordinates } from "@/lib/hooks/use-employees";
import { useJobTitle } from "@/lib/hooks/use-job-titles";
import { EmployeeDialog } from "@/components/features/employees/employee-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const CONDUCT_DOC_KEY = "conduct_document";
const DEFAULT_CONDUCT_DOC = { url: "/assets/images/مدونة السلوك.pdf", name: "مدونة السلوك" };

function StatCard({
  title, value, icon: Icon, iconBg, onClick,
}: {
  title: string; value: any; icon: any;
  iconBg: string; onClick?: () => void;
}) {
  const [navigating, setNavigating] = useState(false);

  const handleClick = () => {
    if (!onClick || navigating) return;
    setNavigating(true);
    onClick();
  };

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
      onClick={handleClick}
    >
      {navigating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            {value === null || value === undefined ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-3xl font-bold mt-1.5 tracking-tight">{value}</p>
            )}
          </div>
          <div className={`p-3.5 rounded-full shrink-0 ${iconBg}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── EMPLOYEE Dashboard ────────────────────────────────────────────────────────
function EmployeeDashboard({ d, locale, router }: { d: any; locale: string; router: any }) {
  const t = useTranslations("dashboard");
  const employeeId = d?.employee?.id ?? "";
  const { data: myEvals } = useProbationEvaluationsByEmployee(employeeId);
  const evalList = Array.isArray(myEvals) ? myEvals : [];
  const selfEvalPending = evalList.filter((e: any) => e.status === "PENDING_SELF_EVALUATION");
  const meetingPending = evalList.filter(
    (e: any) => e.status === "PENDING_MEETING_SCHEDULE" && e.meetingProposedAt && !e.meetingConfirmedByEmployee,
  );

  return (
    <div className="space-y-6">
      {/* Self-evaluation alert banner */}
      {selfEvalPending.map((ev: any) => (
        <div
          key={ev.id}
          className="flex items-center justify-between gap-4 rounded-xl border-2 border-indigo-300 bg-indigo-50 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-2.5 shrink-0">
              <ClipboardEdit className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-indigo-900 text-sm">لديك تقييم ذاتي معلق</p>
              <p className="text-xs text-indigo-700 mt-0.5">
                فترة التجربة — ينتهي في{" "}
                {ev.probationEndDate
                  ? new Date(ev.probationEndDate).toLocaleDateString("ar-SA")
                  : "—"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            onClick={() => router.push(`/${locale}/probation-evaluations/${ev.id}`)}
          >
            <ClipboardEdit className="h-4 w-4" />
            ابدأ التقييم الآن
          </Button>
        </div>
      ))}

      {/* Meeting confirmation banner */}
      {meetingPending.map((ev: any) => (
        <div
          key={ev.id}
          className="flex items-center justify-between gap-4 rounded-xl border-2 border-orange-300 bg-orange-50 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2.5 shrink-0">
              <CalendarCheck className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-900 text-sm">لديك اجتماع تقييم بانتظار تأكيدك</p>
              <p className="text-xs text-orange-700 mt-0.5">
                موعد مقترح:{" "}
                {ev.meetingProposedAt
                  ? new Date(ev.meetingProposedAt).toLocaleString("ar-SA")
                  : "—"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white gap-2"
            onClick={() => router.push(`/${locale}/probation-evaluations/${ev.id}`)}
          >
            <CalendarCheck className="h-4 w-4" />
            تأكيد الموعد
          </Button>
        </div>
      ))}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("employee.leaveBalance")} value={d.leaveBalance?.[0]?.balance ?? "—"} icon={Calendar}
          iconBg="bg-blue-500" onClick={() => router.push(`/${locale}/my-profile`)} />
        <StatCard title={t("employee.pendingRequests")} value={d.pendingRequests?.length ?? 0} icon={Hourglass}
          iconBg="bg-amber-500" onClick={() => router.push(`/${locale}/requests/my-requests`)} />
        <StatCard title={t("employee.myAttendance")} value="" icon={AlertCircle}
          iconBg="bg-red-500" onClick={() => router.push(`/${locale}/attendance/my-attendance`)} />
        <StatCard title={t("employee.myAlerts")} value="" icon={TrendingUp}
          iconBg="bg-green-500" onClick={() => router.push(`/${locale}/attendance/my-alerts`)} />
      </div>

      {d.todayAttendance && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t("employee.todayAttendance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">{t("employee.checkIn")}:</span>
                <span className="font-semibold mr-2">{d.todayAttendance.checkIn ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("employee.expectedCheckOut")}:</span>
                <span className="font-semibold mr-2">{d.todayAttendance.expectedCheckOut ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── MANAGER Dashboard ─────────────────────────────────────────────────────────
function ManagerDashboard({ d, locale, router, employeeId }: { d: any; locale: string; router: any; employeeId?: string }) {
  const t = useTranslations("dashboard");
  const { data: subordinatesData } = useSubordinates(employeeId || "");
  const subordinatesCount = Array.isArray(subordinatesData)
    ? subordinatesData.length
    : ((subordinatesData as any)?.data?.length ?? (subordinatesData as any)?.length ?? "—");

  const { data: allEvals } = useProbationEvaluations();
  const subordinateIds = new Set(
    (Array.isArray(subordinatesData) ? subordinatesData : []).map((e: any) => e.id),
  );
  const probationPendingCount = Array.isArray(allEvals)
    ? allEvals.filter((e: any) => e.status === "PENDING_SENIOR_MANAGER" && subordinateIds.has(e.employeeId)).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("manager.subordinates")} value={subordinatesCount} icon={Users}
          iconBg="bg-green-500" onClick={() => router.push(`/${locale}/employees/subordinates`)} />
        <StatCard title={t("manager.probationEvaluations")} value={probationPendingCount} icon={ClipboardCheck}
          iconBg="bg-indigo-500" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
        <StatCard title={t("manager.adminRequestsPending")} value="" icon={FileText}
          iconBg="bg-amber-500" onClick={() => router.push(`/${locale}/requests/pending-manager`)} />
        <StatCard
          title={t("manager.leavesPending")}
          value={typeof d.pendingLeaveApprovals === "number" ? d.pendingLeaveApprovals : Array.isArray(d.pendingLeaveApprovals) ? d.pendingLeaveApprovals.length : (d.pendingLeaveApprovals?.total ?? d.pendingLeaveApprovals?.count ?? 0)}
          icon={Hourglass}
          iconBg="bg-purple-500"
          onClick={() => router.push(`/${locale}/leaves/pending-approval`)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {d.onLeaveThisWeek?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t("manager.onLeaveThisWeek")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {d.onLeaveThisWeek.map((emp: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <p className="font-medium">{emp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{emp.from} → {emp.to}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {d.teamAlerts?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                {t("manager.teamAlerts")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {d.teamAlerts.map((alert: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-medium text-amber-900">{alert.employeeName}</p>
                      <p className="text-xs text-amber-700">{alert.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── HR Dashboard ──────────────────────────────────────────────────────────────
function HRDashboard({ d, locale, router }: { d: any; locale: string; router: any }) {
  const t = useTranslations("dashboard");
  const { data: pendingData } = usePendingMyApproval({ limit: 1 });
  const pendingCount = (pendingData as any)?.total ?? (pendingData as any)?.data?.total ?? 0;

  const { data: probationEndingData } = useQuery({
    queryKey: ["probation-ending", 7],
    queryFn: async () => {
      const { apiClient } = await import("@/lib/api/client");
      const res = await apiClient.get("/employees/reports/probation-ending", { params: { days: 7 } });
      return res.data?.data ?? res.data ?? [];
    },
    staleTime: 60_000,
  });
  const probationEndingList = Array.isArray(probationEndingData) ? probationEndingData : [];
  const probationEndingCount = probationEndingList.length;
  const [probationDialogOpen, setProbationDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("hr.totalEmployees")} value={d.totalEmployees ?? "—"} icon={Users}
          iconBg="bg-blue-500" onClick={() => router.push(`/${locale}/employees`)} />
        <StatCard title={t("hr.probationEndingSoon")} value={probationEndingCount} icon={FileWarning}
          iconBg="bg-red-500" onClick={() => setProbationDialogOpen(true)} />
        <StatCard title={t("hr.employeeJustifications")} value="" icon={AlertCircle}
          iconBg="bg-orange-500" onClick={() => router.push(`/${locale}/attendance/justifications`)} />
        <StatCard title={t("hr.leavesAwaitingHR")} value={d.pendingLeaveHRCount ?? 0} icon={Hourglass}
          iconBg="bg-amber-500" onClick={() => router.push(`/${locale}/leaves/pending-approval`)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title={t("hr.probationEvaluationsHR")} value={d.probationsPendingHR ?? 0} icon={ShieldCheck}
          iconBg="bg-purple-500" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
        <StatCard title={t("hr.performanceEvaluationsHR")} value={d.probationsPendingHR ?? 0} icon={BarChart3}
          iconBg="bg-indigo-500" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
        <StatCard title={t("hr.adminRequestsPending")} value={pendingCount} icon={Briefcase}
          iconBg="bg-green-500" onClick={() => router.push(`/${locale}/requests/pending-manager`)} />
      </div>

      {d.payrollStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              {t("hr.payrollStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant={d.payrollStatus.status === "PENDING" ? "outline" : "default"}>
                {d.payrollStatus.status === "PENDING" ? t("hr.payrollPending") : t("hr.payrollCompleted")}
              </Badge>
              <span className="text-sm text-muted-foreground">{d.payrollStatus.month}</span>
              <Button size="sm" variant="outline" onClick={() => router.push(`/${locale}/payroll`)}>
                {t("hr.viewPayroll")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {d.candidatesByStage?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {t("hr.candidatesByStage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {d.candidatesByStage.map((s: any) => (
                <div key={s.currentStage} className="rounded-lg border px-3 py-2 text-sm text-center min-w-24">
                  <p className="text-xs text-muted-foreground">{s.currentStage}</p>
                  <p className="font-bold text-lg">{s.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={probationDialogOpen} onOpenChange={setProbationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-red-500" />
              {t("hr.probationDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto py-2">
            {probationEndingList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("hr.noProbationEmployees")}</p>
            ) : (
              probationEndingList.map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{emp.firstNameAr} {emp.lastNameAr}</p>
                    <p className="text-xs text-muted-foreground">{emp.employeeNumber}</p>
                  </div>
                  <div className="text-left">
                    <Badge variant="outline" className={`text-xs ${emp.daysRemaining <= 3 ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}`}>
                      {t("hr.daysRemaining", { days: emp.daysRemaining })}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.probationEndDate}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {probationEndingList.length > 0 && (
            <Button variant="outline" className="w-full" onClick={() => { setProbationDialogOpen(false); router.push(`/${locale}/probation-evaluations`); }}>
              {t("hr.viewProbationEvaluations")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── CEO Dashboard ─────────────────────────────────────────────────────────────
function CEODashboard({ d, locale, router }: { d: any; locale: string; router: any }) {
  const t = useTranslations("dashboard");
  const { data: pendingAdminData } = usePendingMyApproval({ limit: 1 });
  const pendingAdminCount = (pendingAdminData as any)?.total ?? (pendingAdminData as any)?.data?.total ?? 0;
  const { data: pendingLeavesData } = usePendingManagerLeaveRequests({ status: "PENDING_MANAGER", limit: 1 });
  const pendingLeavesCount = (pendingLeavesData as any)?.total ?? (pendingLeavesData as any)?.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("ceo.absencesThisMonth")}
          value={Array.isArray(d.monthlyAbsences) ? d.monthlyAbsences.length : (d.monthlyAbsences ?? "—")}
          icon={UserX} iconBg="bg-red-500" />
        <StatCard
          title={t("ceo.leavesPendingCEO")}
          value={pendingLeavesCount}
          icon={CheckCircle2} iconBg="bg-green-500"
          onClick={() => router.push(`/${locale}/leaves/pending-approval`)} />
        <StatCard
          title={t("ceo.adminRequestsPendingCEO")}
          value={pendingAdminCount}
          icon={Bell} iconBg="bg-amber-500"
          onClick={() => router.push(`/${locale}/requests/pending-manager`)} />
        <StatCard
          title={t("ceo.probationPendingCEO")}
          value={Array.isArray(d.probationsPendingCEO) ? d.probationsPendingCEO.length : (d.probationsPendingCEO ?? 0)}
          icon={ShieldCheck}
          iconBg="bg-purple-500" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
      </div>

      {d.finalStageCandidates?.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              {t("ceo.candidatesCEOStage")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push(`/${locale}/job-applications`)}>
              {t("ceo.viewAll")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.finalStageCandidates.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{c.firstNameAr} {c.lastNameAr}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.position?.jobTitle} · {c.position?.department}
                    </p>
                  </div>
                  <Badge variant="outline">{c.currentStage}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── CFO Dashboard ─────────────────────────────────────────────────────────────
function CFODashboard({ d, locale, router }: { d: any; locale: string; router: any }) {
  const t = useTranslations("dashboard");
  const fmt = (v: number) => v?.toLocaleString("en-US") ?? "—";
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("cfo.totalBasicSalaries")} value={d.payrollTotals ? fmt(d.payrollTotals.totalBasic) : "—"} icon={DollarSign}
          iconBg="bg-blue-500" onClick={() => router.push(`/${locale}/payroll`)} />
        <StatCard title={t("cfo.netSalaries")} value={d.payrollTotals ? fmt(d.payrollTotals.totalNet) : "—"} icon={TrendingUp}
          iconBg="bg-green-500" />
        <StatCard title={t("cfo.approvedOvertimeCount")} value={d.approvedOvertimeCount ?? 0} icon={Clock}
          iconBg="bg-amber-500" />
        <StatCard title={t("cfo.unpaidApprovedLeaves")} value={d.unpaidApprovedLeaves ?? 0} icon={Calendar}
          iconBg="bg-red-500" />
      </div>

      {d.allowances?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t("cfo.allowances")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.allowances.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">{a.type}</span>
                  <span className="font-semibold">{fmt(a.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const { hasRole } = usePermissions();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("dashboard");

  const isFollowUpOfficial = hasRole("Follow-up official") || hasRole("مسؤول متابعة");
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [conductDoc, setConductDoc] = useState<{ url: string; name: string }>(() => {
    try { const s = localStorage.getItem(CONDUCT_DOC_KEY); return s ? JSON.parse(s) : DEFAULT_CONDUCT_DOC; } catch { return DEFAULT_CONDUCT_DOC; }
  });
  const [deleteConductOpen, setDeleteConductOpen] = useState(false);
  const [jobTitleOpen, setJobTitleOpen] = useState(false);

  const { data, isLoading } = useDashboard();
  useMyEmployee();
  const d = data as any;
  const role = d?.role;

  const jobTitleId = (d?.employee?.jobTitle?.id ?? "") as string;
  const { data: jobTitleData } = useJobTitle(jobTitleId);
  const jobTitleDescription = (jobTitleData as any)?.description as string | undefined;

  const removeConductDoc = () => {
    setConductDoc(DEFAULT_CONDUCT_DOC);
    localStorage.removeItem(CONDUCT_DOC_KEY);
  };

  if (isLoading || !d) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const employeeInfo = d?.employee;

  const displayName = employeeInfo
    ? `${employeeInfo.firstNameAr} ${employeeInfo.lastNameAr}`
    : user?.fullName || user?.username || "—";

  return (
    <div className="space-y-5">
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(to right, oklch(0.188 0.078 272) 0%, oklch(0.218 0.082 262) 32%, oklch(0.355 0.092 52) 68%, oklch(0.435 0.105 38) 100%)",
          padding: "2rem 2.5rem 1.75rem",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 55% 100% at 90% 50%, oklch(0.702 0.191 47.604 / 0.14) 0%, transparent 70%)"
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 40% 80% at 5% 50%, oklch(0.45 0.12 270 / 0.18) 0%, transparent 70%)"
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-white/70 text-base">
              {t("welcomeMessage", { name: displayName })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
              onClick={() => router.push(`/${locale}/requests/my-requests`)}
            >
              <PlusCircle className="h-4 w-4" />
              {t("newRequest")}
            </button>
          </div>
        </div>
      </div>

      {/* Role-based content */}
      {role === "MANAGER" && !isFollowUpOfficial && <ManagerDashboard d={d} locale={locale} router={router} employeeId={d?.employee?.id} />}
      {role === "HR" && !isFollowUpOfficial && <HRDashboard d={d} locale={locale} router={router} />}
      {role === "CEO" && !isFollowUpOfficial && <CEODashboard d={d} locale={locale} router={router} />}
      {role === "CFO" && !isFollowUpOfficial && <CFODashboard d={d} locale={locale} router={router} />}
      {(isFollowUpOfficial || !role || !["MANAGER", "HR", "CEO", "CFO"].includes(role)) && <EmployeeDashboard d={d} locale={locale} router={router} />}

      {/* Job Title Card */}
      {employeeInfo?.jobTitle && (
        <Card>
          <button
            type="button"
            onClick={() => setJobTitleOpen(v => !v)}
            className="w-full text-right"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {t("jobTitle")}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${jobTitleOpen ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
          </button>
          {jobTitleOpen && (
            <CardContent className="pt-0">
              <p className="font-semibold text-foreground mb-2">
                {locale === "ar"
                  ? employeeInfo.jobTitle.nameAr
                  : (employeeInfo.jobTitle.nameEn || employeeInfo.jobTitle.nameAr)}
              </p>
              {jobTitleDescription && (
                <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                  {jobTitleDescription
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .replace(/([^\n])\s+(\d+)\.\s/g, '$1\n$2. ')
                    .replace(/([^\n])\s*[•·]\s*/g, '$1\n• ')
                    .split('\n')
                    .map((l: string) => l.trim())
                    .filter(Boolean)
                    .map((line: string, i: number) => (
                      <p key={i}>{line}</p>
                    ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Code of Conduct */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {t("codeOfConduct")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/30">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <p className="text-sm font-medium flex-1">{t("codeOfConduct")}</p>
            <a href={conductDoc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">{t("open")}</a>
          </div>
        </CardContent>
      </Card>

      {/* Org Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("orgChart")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/30">
            <ExternalLink className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-medium flex-1">{t("orgChart")}</p>
            <a href="/assets/images/هيكل.jpg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">{t("open")}</a>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(role === "HR" || role === "CEO" || role === "CFO") && (
              <>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/employees`)}>
                  <Users className="h-5 w-5" /><span className="text-xs">{t("actions.employees")}</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4 border-primary/40 text-primary hover:bg-primary/5" onClick={() => setAddEmployeeOpen(true)}>
                  <UserPlus className="h-5 w-5" /><span className="text-xs">{t("actions.addEmployee")}</span>
                </Button>
              </>
            )}
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/requests/my-requests`)}>
              <PlusCircle className="h-5 w-5" /><span className="text-xs">{t("actions.newRequest")}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/requests/my-requests`)}>
              <Calendar className="h-5 w-5" /><span className="text-xs">{t("myLeaves")}</span>
            </Button>
            {(role === "HR" || role === "CEO") && (
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/job-applications`)}>
                <Briefcase className="h-5 w-5" /><span className="text-xs">{t("actions.recruitment")}</span>
              </Button>
            )}
            {(role === "HR" || role === "CFO") && (
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/payroll`)}>
                <DollarSign className="h-5 w-5" /><span className="text-xs">{t("actions.payroll")}</span>
              </Button>
            )}
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/custodies`)}>
              <Package className="h-5 w-5" /><span className="text-xs">{t("actions.custodies")}</span>
            </Button>
            {(role === "HR" || role === "CEO" || role === "CFO") && (
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/reports/hr`)}>
                <TrendingUp className="h-5 w-5" /><span className="text-xs">{t("actions.reports")}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen} />
      <ConfirmDialog
        open={deleteConductOpen}
        onOpenChange={setDeleteConductOpen}
        title={t("deleteConductTitle")}
        description={t("deleteConductDesc")}
        onConfirm={removeConductDoc}
        variant="destructive"
      />
    </div>
  );
}
