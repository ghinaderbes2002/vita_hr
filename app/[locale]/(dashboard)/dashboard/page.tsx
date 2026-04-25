"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users, Calendar, Clock, AlertCircle, PlusCircle, ClipboardList,
  Package, Briefcase, TrendingUp, FileWarning, UserX, ChevronRight,
  UserPlus, Bell, FileText, Upload, Trash, ExternalLink, Hourglass,
  CheckCircle2, UserCheck, BarChart3, DollarSign, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { EmployeeDialog } from "@/components/features/employees/employee-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const CONDUCT_DOC_KEY = "conduct_document";
const DEFAULT_CONDUCT_DOC = { url: "/assets/images/مدونة السلوك.pdf", name: "مدونة السلوك" };

function StatCard({
  title, value, icon: Icon, iconBg, iconColor, onClick,
}: {
  title: string; value: any; icon: any;
  iconBg: string; iconColor: string; onClick?: () => void;
}) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
            {value === null || value === undefined ? (
              <Skeleton className="h-9 w-16 mt-2" />
            ) : (
              <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
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
          iconBg="bg-blue-50" iconColor="text-blue-600" onClick={() => router.push(`/${locale}/leaves/my-leaves`)} />
        <StatCard title="الطلبات المعلقة" value={d.pendingRequests?.length ?? 0} icon={Hourglass}
          iconBg="bg-amber-50" iconColor="text-amber-600" onClick={() => router.push(`/${locale}/requests/my-requests`)} />
        <StatCard title="وثائق منتهية الصلاحية" value={d.expiringDocuments?.length ?? 0} icon={AlertCircle}
          iconBg="bg-red-50" iconColor="text-red-600" />
        <StatCard title="الأهداف النشطة" value={d.goals?.length ?? 0} icon={TrendingUp}
          iconBg="bg-green-50" iconColor="text-green-600" />
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
function ManagerDashboard({ d, locale, router }: { d: any; locale: string; router: any }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="حاضرون اليوم" value={d.teamAttendanceToday?.present ?? "—"} icon={UserCheck}
          iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="غائبون اليوم" value={d.teamAttendanceToday?.absent ?? "—"} icon={UserX}
          iconBg="bg-red-50" iconColor="text-red-600" />
        <StatCard title="متأخرون اليوم" value={d.teamAttendanceToday?.late ?? "—"} icon={Clock}
          iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard title="إجازات بانتظار موافقتي" value={d.pendingLeaveApprovals ?? 0} icon={Hourglass}
          iconBg="bg-purple-50" iconColor="text-purple-600" onClick={() => router.push(`/${locale}/leaves/pending-approval`)} />
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
          iconBg="bg-blue-50" iconColor="text-blue-600" onClick={() => router.push(`/${locale}/employees`)} />
        <StatCard title="وثائق منتهية الصلاحية" value={d.expiringDocumentsCount ?? 0} icon={FileWarning}
          iconBg="bg-red-50" iconColor="text-red-600" onClick={() => router.push(`/${locale}/reports/hr`)} />
        <StatCard title="عقود منتهية" value={d.expiringContractsCount ?? 0} icon={AlertCircle}
          iconBg="bg-orange-50" iconColor="text-orange-600" />
        <StatCard title="إجازات بانتظار HR" value={d.pendingLeaveHRCount ?? 0} icon={Hourglass}
          iconBg="bg-amber-50" iconColor="text-amber-600" onClick={() => router.push(`/${locale}/leaves/pending-approval`)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="تقييمات تجربة بانتظار HR" value={d.probationsPendingHR ?? 0} icon={ShieldCheck}
          iconBg="bg-purple-50" iconColor="text-purple-600" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
        <StatCard title="تقييمات أداء بانتظار HR" value={d.evaluationsPendingHR ?? 0} icon={BarChart3}
          iconBg="bg-indigo-50" iconColor="text-indigo-600" onClick={() => router.push(`/${locale}/evaluations`)} />
        <StatCard title="مناصب شاغرة" value={d.activePositions ?? 0} icon={Briefcase}
          iconBg="bg-green-50" iconColor="text-green-600" onClick={() => router.push(`/${locale}/job-applications`)} />
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
          icon={UserX} iconBg="bg-red-50" iconColor="text-red-600" />
        <StatCard title="إجازات معتمدة هذا الشهر"
          value={Array.isArray(d.approvedLeavesThisMonth) ? d.approvedLeavesThisMonth.length : (d.approvedLeavesThisMonth ?? "—")}
          icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="طلبات بانتظار موافقة CEO"
          value={Array.isArray(d.pendingCeoRequestApprovals) ? d.pendingCeoRequestApprovals.length : (d.pendingCeoRequestApprovals ?? 0)}
          icon={Bell} iconBg="bg-amber-50" iconColor="text-amber-600"
          onClick={() => router.push(`/${locale}/requests/pending-manager`)} />
        <StatCard title="تقييمات تجربة بانتظار CEO"
          value={Array.isArray(d.probationsPendingCEO) ? d.probationsPendingCEO.length : (d.probationsPendingCEO ?? 0)}
          icon={ShieldCheck}
          iconBg="bg-purple-50" iconColor="text-purple-600" onClick={() => router.push(`/${locale}/probation-evaluations`)} />
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
          iconBg="bg-blue-50" iconColor="text-blue-600" onClick={() => router.push(`/${locale}/payroll`)} />
        <StatCard title="صافي الرواتب" value={d.payrollTotals ? fmt(d.payrollTotals.totalNet) : "—"} icon={TrendingUp}
          iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard title="عدد العمل الإضافي المعتمد" value={d.approvedOvertimeCount ?? 0} icon={Clock}
          iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard title="إجازات غير مدفوعة معتمدة" value={d.unpaidApprovedLeaves ?? 0} icon={Calendar}
          iconBg="bg-red-50" iconColor="text-red-600" />
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
  const isCustomConductDoc = conductDoc.url !== DEFAULT_CONDUCT_DOC.url;
  const [conductUploading, setConductUploading] = useState(false);
  const [deleteConductOpen, setDeleteConductOpen] = useState(false);

  const { data, isLoading } = useDashboard();
  const d = data as any;
  const role = d?.role;

  const handleConductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setConductUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const { fileUrl, fileName } = await res.json();
      const doc = { url: fileUrl, name: fileName || file.name };
      setConductDoc(doc);
      localStorage.setItem(CONDUCT_DOC_KEY, JSON.stringify(doc));
    } catch {
      alert("فشل رفع الملف");
    } finally {
      setConductUploading(false);
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">
          مرحباً، {displayName}
          {employeeInfo?.jobTitle && (
            <span className="text-xs mr-2">· {typeof employeeInfo.jobTitle === "string" ? employeeInfo.jobTitle : employeeInfo.jobTitle?.nameAr}</span>
          )}
          {employeeInfo?.department && (
            <span className="text-xs">· {typeof employeeInfo.department === "string" ? employeeInfo.department : employeeInfo.department?.nameAr}</span>
          )}
        </p>
      </div>

      {/* Role-based content */}
      {role === "EMPLOYEE" && <EmployeeDashboard d={d} locale={locale} router={router} />}
      {role === "MANAGER" && <ManagerDashboard d={d} locale={locale} router={router} />}
      {role === "HR" && <HRDashboard d={d} locale={locale} router={router} />}
      {role === "CEO" && <CEODashboard d={d} locale={locale} router={router} />}
      {role === "CFO" && <CFODashboard d={d} locale={locale} router={router} />}

      {/* Code of Conduct — for all roles */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            مدونة السلوك
          </CardTitle>
          <div className="flex items-center gap-2">
            <a href={conductDoc.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-primary/30 rounded px-2 py-1">
              <ExternalLink className="h-3.5 w-3.5" />فتح
            </a>
            {isCustomConductDoc && (
              <button type="button" onClick={() => setDeleteConductOpen(true)}
                className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 border border-destructive/30 rounded px-2 py-1">
                <Trash className="h-3.5 w-3.5" />حذف
              </button>
            )}
            <label className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 cursor-pointer transition-colors">
              {conductUploading ? <span className="animate-pulse">جاري الرفع...</span> : (
                <><Upload className="h-3.5 w-3.5" />تغيير الوثيقة</>
              )}
              <input type="file" accept="application/pdf" className="hidden" disabled={conductUploading} onChange={handleConductUpload} />
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src={conductDoc.url}
            className="w-full h-[75vh] rounded-b-lg border-t"
            title="مدونة السلوك"
          />
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
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => router.push(`/${locale}/leaves/my-leaves`)}>
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
