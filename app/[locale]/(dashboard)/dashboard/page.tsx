"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Clock, AlertCircle, PlusCircle,
  Package, Briefcase, TrendingUp, FileWarning, UserX, ChevronRight,
  UserPlus, Bell, FileText, ExternalLink, Hourglass, ClipboardCheck,
  CheckCircle2, UserCheck, BarChart3, DollarSign, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDashboard } from "@/lib/hooks/use-dashboard";
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
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
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
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="رصيد الإجازات" value={d.leaveBalance?.[0]?.balance ?? "—"} icon={Calendar}
          iconBg="bg-blue-500" onClick={() => router.push(`/${locale}/requests/my-requests`)} />
        <StatCard title="الطلبات المعلقة" value={d.pendingRequests?.length ?? 0} icon={Hourglass}
          iconBg="bg-amber-500" onClick={() => router.push(`/${locale}/requests/my-requests`)} />
        <StatCard title="وثائق منتهية الصلاحية" value={d.expiringDocuments?.length ?? 0} icon={AlertCircle}
          iconBg="bg-red-500" />
        <StatCard title="الأهداف النشطة" value={d.goals?.length ?? 0} icon={TrendingUp}
          iconBg="bg-green-500" />
      </div>

      {d.todayAttendance && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              حضور اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">تسجيل الحضور:</span>
                <span className="font-semibold mr-2">{d.todayAttendance.checkIn ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">الانصراف المتوقع:</span>
                <span className="font-semibold mr-2">{d.todayAttendance.expectedCheckOut ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {d.leaveBalance?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              أرصدة الإجازات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {d.leaveBalance.map((lb: any) => (
                <div key={lb.leaveTypeName} className="rounded-lg border px-3 py-2 text-sm text-center">
                  <p className="text-muted-foreground text-xs">{lb.leaveTypeName}</p>
                  <p className="font-bold text-lg mt-0.5">{lb.balance}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── MANAGER Dashboard ─────────────────────────────────────────────────────────
function ManagerDashboard({ d, locale, router, employeeId }: { d: any; locale: string; router: any; employeeId?: string }) {
  const { data: subordinatesData } = useSubordinates(employeeId || "");
  const subordinatesCount = Array.isArray(subordinatesData)
    ? subordinatesData.length
    : ((subordinatesData as any)?.data?.length ?? (subordinatesData as any)?.length ?? "—");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="المرؤوسين" value={subordinatesCount} icon={Users}
          iconBg="bg-green-500" onClick={() => router.push(`/${locale}/employees/subordinates`)} />
        <StatCard title="تقييمات التجربة" value="" icon={ClipboardCheck}
          iconBg="bg-indigo-500" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
        <StatCard title="طلبات بانتظار موافقتي" value="" icon={FileText}
          iconBg="bg-amber-500" onClick={() => router.push(`/${locale}/requests/pending-manager`)} />
        <StatCard title="إجازات بانتظار موافقتي" value={d.pendingLeaveApprovals ?? 0} icon={Hourglass}
          iconBg="bg-purple-500" onClick={() => router.push(`/${locale}/leaves/pending-approval`)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {d.onLeaveThisWeek?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                في إجازة هذا الأسبوع
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
                تنبيهات الفريق
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي الموظفين" value={d.totalEmployees ?? "—"} icon={Users}
          iconBg="bg-blue-500" onClick={() => router.push(`/${locale}/employees`)} />
        <StatCard title="وثائق منتهية الصلاحية" value={d.expiringDocumentsCount ?? 0} icon={FileWarning}
          iconBg="bg-red-500" onClick={() => router.push(`/${locale}/reports/hr`)} />
        <StatCard title="عقود منتهية" value={d.expiringContractsCount ?? 0} icon={AlertCircle}
          iconBg="bg-orange-500" />
        <StatCard title="إجازات بانتظار HR" value={d.pendingLeaveHRCount ?? 0} icon={Hourglass}
          iconBg="bg-amber-500" onClick={() => router.push(`/${locale}/leaves/pending-approval`)} />
      </div>


      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="تقييمات تجربة بانتظار HR" value={d.probationsPendingHR ?? 0} icon={ShieldCheck}
          iconBg="bg-purple-500" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
        <StatCard title="تقييمات أداء بانتظار HR" value={d.evaluationsPendingHR ?? 0} icon={BarChart3}
          iconBg="bg-indigo-500" onClick={() => router.push(`/${locale}/evaluations`)} />
        <StatCard title="مناصب شاغرة" value={d.activePositions ?? 0} icon={Briefcase}
          iconBg="bg-green-500" onClick={() => router.push(`/${locale}/job-applications`)} />
      </div>

      {d.payrollStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              حالة الرواتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant={d.payrollStatus.status === "PENDING" ? "outline" : "default"}>
                {d.payrollStatus.status === "PENDING" ? "معلق" : "مكتمل"}
              </Badge>
              <span className="text-sm text-muted-foreground">{d.payrollStatus.month}</span>
              <Button size="sm" variant="outline" onClick={() => router.push(`/${locale}/payroll`)}>
                عرض الرواتب
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
              المرشحون حسب المرحلة
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
    </div>
  );
}

// ── CEO Dashboard ─────────────────────────────────────────────────────────────
function CEODashboard({ d, locale, router }: { d: any; locale: string; router: any }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="غيابات هذا الشهر"
          value={Array.isArray(d.monthlyAbsences) ? d.monthlyAbsences.length : (d.monthlyAbsences ?? "—")}
          icon={UserX} iconBg="bg-red-500" />
        <StatCard title="إجازات معتمدة هذا الشهر"
          value={Array.isArray(d.approvedLeavesThisMonth) ? d.approvedLeavesThisMonth.length : (d.approvedLeavesThisMonth ?? "—")}
          icon={CheckCircle2} iconBg="bg-green-500" />
        <StatCard title="طلبات بانتظار موافقة CEO"
          value={Array.isArray(d.pendingCeoRequestApprovals) ? d.pendingCeoRequestApprovals.length : (d.pendingCeoRequestApprovals ?? 0)}
          icon={Bell} iconBg="bg-amber-500"
          onClick={() => router.push(`/${locale}/requests/pending-manager`)} />
        <StatCard title="تقييمات تجربة بانتظار CEO"
          value={Array.isArray(d.probationsPendingCEO) ? d.probationsPendingCEO.length : (d.probationsPendingCEO ?? 0)}
          icon={ShieldCheck}
          iconBg="bg-purple-500" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
      </div>

      {d.finalStageCandidates?.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              مرشحون في مرحلة موافقة CEO
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push(`/${locale}/job-applications`)}>
              عرض الكل <ChevronRight className="h-3.5 w-3.5" />
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
  const fmt = (v: number) => v?.toLocaleString("ar-SA") ?? "—";
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي الرواتب الأساسية" value={d.payrollTotals ? fmt(d.payrollTotals.totalBasic) : "—"} icon={DollarSign}
          iconBg="bg-blue-500" onClick={() => router.push(`/${locale}/payroll`)} />
        <StatCard title="صافي الرواتب" value={d.payrollTotals ? fmt(d.payrollTotals.totalNet) : "—"} icon={TrendingUp}
          iconBg="bg-green-500" />
        <StatCard title="عدد العمل الإضافي المعتمد" value={d.approvedOvertimeCount ?? 0} icon={Clock}
          iconBg="bg-amber-500" />
        <StatCard title="إجازات غير مدفوعة معتمدة" value={d.unpaidApprovedLeaves ?? 0} icon={Calendar}
          iconBg="bg-red-500" />
      </div>

      {d.allowances?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              البدلات
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
  const locale = useLocale();
  const router = useRouter();
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [conductDoc, setConductDoc] = useState<{ url: string; name: string }>(() => {
    try { const s = localStorage.getItem(CONDUCT_DOC_KEY); return s ? JSON.parse(s) : DEFAULT_CONDUCT_DOC; } catch { return DEFAULT_CONDUCT_DOC; }
  });
  const [deleteConductOpen, setDeleteConductOpen] = useState(false);

  const { data, isLoading } = useDashboard();
  const { data: myProfile } = useMyEmployee();
  const d = data as any;
  const role = d?.role;

  const jobTitleId = (d?.employee?.jobTitle?.id ?? "") as string;
  const { data: jobTitleData } = useJobTitle(jobTitleId);
  const jobTitleDescription = (jobTitleData as any)?.description as string | undefined;

  const removeConductDoc = () => {
    setConductDoc(DEFAULT_CONDUCT_DOC);
    localStorage.removeItem(CONDUCT_DOC_KEY);
  };

  if (isLoading) {
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
        {/* Subtle warm glow on start/right side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 55% 100% at 90% 50%, oklch(0.702 0.191 47.604 / 0.14) 0%, transparent 70%)"
          }}
        />
        {/* Subtle cool glow on end/left side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 40% 80% at 5% 50%, oklch(0.45 0.12 270 / 0.18) 0%, transparent 70%)"
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white tracking-tight">لوحة التحكم</h1>
            <p className="mt-1 text-white/70 text-base">
              مرحباً {displayName}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
              onClick={() => router.push(`/${locale}/requests/my-requests`)}
            >
              <PlusCircle className="h-4 w-4" />
              طلب جديد
            </button>
          </div>
        </div>
      </div>

      {/* Role-based content */}
      {role === "EMPLOYEE" && <EmployeeDashboard d={d} locale={locale} router={router} />}
      {role === "MANAGER" && <ManagerDashboard d={d} locale={locale} router={router} employeeId={d?.employee?.id} />}
      {role === "HR" && <HRDashboard d={d} locale={locale} router={router} />}
      {role === "CEO" && <CEODashboard d={d} locale={locale} router={router} />}
      {role === "CFO" && <CFODashboard d={d} locale={locale} router={router} />}

      {/* Job Title Card — for all roles */}
      {employeeInfo?.jobTitle && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              المسمى الوظيفي
            </CardTitle>
          </CardHeader>
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
        </Card>
      )}

      {/* Code of Conduct — for all roles */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            مدونة السلوك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/30">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <p className="text-sm font-medium flex-1">مدونة السلوك</p>
            <a href={conductDoc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">فتح</a>
          </div>
        </CardContent>
      </Card>

      {/* Org Chart — for all roles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            الهيكل التنظيمي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/30">
            <ExternalLink className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-medium flex-1">الهيكل التنظيمي</p>
            <a href="/assets/images/هيكل.jpg" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">فتح</a>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(role === "HR" || role === "CEO" || role === "CFO") && (
              <>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/employees`)}>
                  <Users className="h-5 w-5" /><span className="text-xs">الموظفون</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4 border-primary/40 text-primary hover:bg-primary/5" onClick={() => setAddEmployeeOpen(true)}>
                  <UserPlus className="h-5 w-5" /><span className="text-xs">إضافة موظف</span>
                </Button>
              </>
            )}
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/requests/my-requests`)}>
              <PlusCircle className="h-5 w-5" /><span className="text-xs">طلب جديد</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/requests/my-requests`)}>
              <Calendar className="h-5 w-5" /><span className="text-xs">إجازاتي</span>
            </Button>
            {(role === "HR" || role === "CEO") && (
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/job-applications`)}>
                <Briefcase className="h-5 w-5" /><span className="text-xs">التوظيف</span>
              </Button>
            )}
            {(role === "HR" || role === "CFO") && (
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/payroll`)}>
                <DollarSign className="h-5 w-5" /><span className="text-xs">الرواتب</span>
              </Button>
            )}
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/custodies`)}>
              <Package className="h-5 w-5" /><span className="text-xs">العهدات</span>
            </Button>
            {(role === "HR" || role === "CEO" || role === "CFO") && (
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/reports/hr`)}>
                <TrendingUp className="h-5 w-5" /><span className="text-xs">التقارير</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen} />
      <ConfirmDialog
        open={deleteConductOpen}
        onOpenChange={setDeleteConductOpen}
        title="حذف مدونة السلوك"
        description="هل أنت متأكد من حذف وثيقة مدونة السلوك؟"
        onConfirm={removeConductDoc}
        variant="destructive"
      />
    </div>
  );
}
