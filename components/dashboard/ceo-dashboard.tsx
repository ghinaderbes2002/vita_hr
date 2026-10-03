"use client";

// The CEO's landing view, in two halves.
//
// "What needs me": everything that waits on the CEO — administrative requests,
// maintenance executive approvals, final-stage candidates and probation
// decisions — merged into one queue, oldest first.
//
// "How is the company": headcount, workforce movement, hiring pipeline and the
// risks coming up. These read the report endpoints, which a role may not be
// allowed to call; each block therefore hides itself when its source fails
// instead of breaking the page.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Briefcase, Building2, CalendarCheck,
  CalendarClock, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, FileText, Gavel, Inbox,
  Activity, Hourglass, PackageCheck, ShieldCheck, Sparkles, Stethoscope, Timer, TrendingUp, UserPlus,
  UserX, Users, Wrench, XCircle,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { apiClient } from "@/lib/api/client";
import { jobApplicationsApi } from "@/lib/api/job-applications";
import { employeesApi } from "@/lib/api/employees";
import { hrReportsApi, attendanceReportsApi } from "@/lib/api/reports";
import {
  useApproveRequest, useCeoApprovedRequests, usePendingMyApproval, useRejectRequest,
} from "@/lib/hooks/use-requests";
import {
  useAllMaintenanceRequests, useExecutiveApproveMaintenanceRequest, useExecutiveRejectMaintenanceRequest,
} from "@/lib/hooks/use-maintenance-requests";
import { useApproveJobApplicationCEO } from "@/lib/hooks/use-job-applications";
import { usePendingMyAction } from "@/lib/hooks/use-probation-evaluations";
import { usePendingManagerLeaveRequests } from "@/lib/hooks/use-leave-requests";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useMarkAsRead, useNotifications } from "@/lib/hooks/use-notifications";
import { resolveNotificationLink } from "@/lib/notifications/notification-links";

type Kind = "admin" | "maintenance" | "hiring" | "probation";
type Filter = "all" | Kind;

interface Decision {
  id: string;
  kind: Kind;
  title: string;
  who: string;
  since?: string;
  priority?: string;
  href: string;
}

const DAY = 86_400_000;
/** Older than this many days counts as overdue. */
const OVERDUE_DAYS = 5;
const FIVE_MIN = 5 * 60 * 1000;
/** Window of the "contracts expiring" tile; the report page opens on the same one. */
const EXPIRY_DAYS = 90;

const KIND_META: Record<Kind, { icon: any; color: string; chip: string }> = {
  admin:       { icon: FileText,    color: "#f59e0b", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  maintenance: { icon: Wrench,      color: "#0ea5e9", chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  hiring:      { icon: Briefcase,   color: "#10b981", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  probation:   { icon: ShieldCheck, color: "#8b5cf6", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

const TOOLTIP_STYLE = {
  background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12,
  color: "var(--popover-foreground)", fontSize: 12,
};

const itemsOf = (res: any): any[] => {
  const v = res?.data?.items ?? res?.items ?? res?.data?.data?.items ?? res?.data ?? res;
  return Array.isArray(v) ? v : [];
};
const totalOf = (res: any): number => res?.total ?? res?.data?.total ?? res?.meta?.total ?? 0;
const nameOf = (e?: { firstNameAr?: string; lastNameAr?: string } | null) =>
  e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() : "";
const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY)) : 0);
const countOf = (v: unknown): number | null =>
  Array.isArray(v) ? v.length : typeof v === "number" ? v : null;
const sum = (rows?: { count: number }[]) => (rows ?? []).reduce((a, r) => a + (Number(r.count) || 0), 0);
/** The month of a report row as 1–12, whether it arrives as 3, "3", "03" or "2026-03". */
const monthNum = (v: unknown) => {
  const str = String(v ?? "");
  return Number(str.includes("-") ? str.split("-")[1] : str);
};
/** A month can span several rows, so its rows are added up rather than picked. */
const monthCount = (rows: { month: unknown; count: number }[] | undefined, m: number) =>
  (rows ?? []).filter((r) => monthNum(r.month) === m).reduce((a, r) => a + (Number(r.count) || 0), 0);

/** Report queries are optional extras: one failed call must not retry or toast. */
const reportQuery = { staleTime: FIVE_MIN, retry: false as const };

/** Eases a number up from zero the first time it arrives. */
function useCountUp(target: number | null, ms = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return;
    // Reduced motion: land on the number in the first frame.
    const duration = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = duration ? Math.min(1, (now - start) / duration) : 1;
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function Num({ value, className }: { value: number | null; className?: string }) {
  const shown = useCountUp(value);
  return <span dir="ltr" className={`inline-block tabular-nums ${className ?? ""}`}>{value === null ? "—" : shown.toLocaleString("en-US")}</span>;
}

function Kpi({
  label, value, loading, hint, hintTone, icon: Icon, tone, onClick,
}: {
  label: string; value: number | null; loading?: boolean; hint?: React.ReactNode;
  hintTone?: "up" | "down"; icon: any; tone: string; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group relative overflow-hidden rounded-2xl border bg-card p-4 text-start shadow-sm transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-primary/40 enabled:hover:shadow-md disabled:cursor-default"
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 ${tone}`} />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`shrink-0 rounded-lg p-1.5 text-white ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="mt-1.5 text-3xl font-bold tracking-tight"><Num value={value} /></p>
      )}
      {hint && (
        <p className={`mt-1 flex items-center gap-1 truncate text-[11px] ${
          hintTone === "up" ? "text-emerald-600 dark:text-emerald-400"
            : hintTone === "down" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
        }`}>
          {hintTone === "up" && <ArrowUpRight className="h-3 w-3" />}
          {hintTone === "down" && <ArrowDownRight className="h-3 w-3" />}
          {hint}
        </p>
      )}
    </button>
  );
}

function AgeChip({ days, t }: { days: number; t: (k: string, v?: any) => string }) {
  const tone = days > OVERDUE_DAYS
    ? "bg-red-500/10 text-red-600 dark:text-red-400"
    : days > 2
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      <Clock className="h-3 w-3" />
      {days === 0 ? t("ceo.today") : t("ceo.waitingDays", { days })}
    </span>
  );
}

function Panel({
  title, icon: Icon, action, children, className,
}: {
  title: string; icon: any; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={`border shadow-sm ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export function CEODashboard({ d, locale, router }: { d: any; locale: string; router: any }) {
  const t = useTranslations("dashboard");
  const tr = useTranslations();
  const isRtl = locale === "ar";
  const Chevron = isRtl ? ChevronLeft : ChevronRight;
  const go = (path: string) => router.push(path.startsWith(`/${locale}`) ? path : `/${locale}${path}`);

  const { hasPermission, isAdmin } = usePermissions();
  const canExec = isAdmin() || hasPermission(PERMISSIONS.REQUESTS.CEO_APPROVE);
  const canHire = isAdmin() || hasPermission(PERMISSIONS.JOB_APPLICATIONS.CEO_APPROVE);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // ── Decision sources ───────────────────────────────────────────────────────
  const adminQ = usePendingMyApproval({ limit: 50 });
  const maintQ = useAllMaintenanceRequests({ status: "PENDING_EXECUTIVE", limit: 50 }, { enabled: canExec });
  // Website applications wait on the CEO at ACCEPTED; ceo-approve moves them to
  // HIRED. `finalStageCandidates` in the dashboard payload is the separate
  // internal-candidate system, which has no screen or action here.
  const hiringParams = { status: "ACCEPTED", limit: 50 };
  const hiringQ = useQuery({
    queryKey: ["job-applications", hiringParams],
    queryFn: () => jobApplicationsApi.getAll(hiringParams),
    enabled: canHire,
  });
  const probationQ = usePendingMyAction();
  const leavesQ = usePendingManagerLeaveRequests({ status: "PENDING_MANAGER", limit: 1 });
  const notifQ = useNotifications({ isRead: false, limit: 6 });
  const recentQ = useCeoApprovedRequests({ limit: 5 });
  const markAsRead = useMarkAsRead();

  // Some lists (probation pending-my-action among them) return only the
  // employeeId, so names fall back to the basic employee list.
  const { data: basicEmployees } = useEmployeesBasicList();
  const empMap = useMemo(
    () => new Map<string, any>((Array.isArray(basicEmployees) ? basicEmployees : []).map((e: any) => [e.id, e])),
    [basicEmployees],
  );
  const whoOf = useCallback(
    (row: any) => nameOf(row?.employee) || nameOf(empMap.get(row?.employeeId)),
    [empMap],
  );

  // ── Company sources (optional) ─────────────────────────────────────────────
  const summaryQ = useQuery({ queryKey: ["reports-hr-employees-summary"], queryFn: () => hrReportsApi.getEmployeesSummary(), ...reportQuery });
  const turnoverQ = useQuery({ queryKey: ["reports-hr-turnover", year], queryFn: () => hrReportsApi.getTurnover(year), ...reportQuery });
  // Same endpoint as the contract-ending report page the tile opens, so the
  // number here and the list there cannot disagree.
  const expiryQ = useQuery({ queryKey: ["hr-report", "contract", EXPIRY_DAYS], queryFn: () => employeesApi.getContractReport(EXPIRY_DAYS), ...reportQuery });
  const statsQ = useQuery({ queryKey: ["job-applications-stats"], queryFn: () => jobApplicationsApi.getStats(), ...reportQuery });
  const topAbsParams = { year, month, limit: 5 };
  const topAbsQ = useQuery({ queryKey: ["reports-attendance-top-absences", topAbsParams], queryFn: () => attendanceReportsApi.getTopAbsences(topAbsParams), ...reportQuery });
  const probationEndQ = useQuery({
    queryKey: ["probation-ending", 30],
    queryFn: async () => {
      const res = await apiClient.get("/employees/reports/probation-ending", { params: { days: 30 } });
      return res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
    },
    ...reportQuery,
  });

  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const execApprove = useExecutiveApproveMaintenanceRequest();
  const execReject = useExecutiveRejectMaintenanceRequest();
  const ceoHire = useApproveJobApplicationCEO();

  // ── Unified queue ──────────────────────────────────────────────────────────
  const decisions = useMemo<Decision[]>(() => {
    const out: Decision[] = [];
    // Maintenance items also appear in pending-my-approval; they are taken from
    // their own list so each one shows once, with its executive actions.
    for (const r of itemsOf(adminQ.data)) {
      if (r?.type === "MAINTENANCE") continue;
      out.push({
        id: r.id, kind: "admin",
        title: tr.has(`requests.types.${r.type}`) ? tr(`requests.types.${r.type}` as any) : r.type,
        who: whoOf(r) || r.requestNumber || "—",
        since: r.updatedAt ?? r.createdAt,
        href: `/requests/${r.id}`,
      });
    }
    if (canExec) {
      for (const r of itemsOf(maintQ.data)) {
        out.push({
          id: r.id, kind: "maintenance",
          title: r.details?.assetType || tr("requests.types.MAINTENANCE"),
          who: whoOf(r) || "—",
          since: r.updatedAt ?? r.createdAt,
          priority: r.details?.priority,
          href: `/maintenance-requests/pending`,
        });
      }
    }
    if (canHire) {
      for (const a of itemsOf(hiringQ.data)) {
        out.push({
          id: a.id, kind: "hiring",
          title: a.specialization || t("ceo.kinds.hiring"),
          who: a.fullName || "—",
          since: a.updatedAt ?? a.createdAt,
          href: `/job-applications/${a.id}`,
        });
      }
    }
    for (const p of Array.isArray(probationQ.data) ? probationQ.data : itemsOf(probationQ.data)) {
      if (p?.status && p.status !== "PENDING_CEO") continue;
      out.push({
        id: p.id, kind: "probation",
        title: p.probationEndDate
          ? t("ceo.probationEnds", { date: new Date(p.probationEndDate).toLocaleDateString("en-GB") })
          : "",
        who: whoOf(p) || "—",
        since: p.updatedAt ?? p.probationEndDate,
        href: `/probation-evaluations/${p.id}`,
      });
    }
    return out.sort((a, b) => daysSince(b.since) - daysSince(a.since));
  }, [adminQ.data, maintQ.data, hiringQ.data, probationQ.data, canExec, canHire, t, tr, whoOf]);

  const loading = adminQ.isLoading || probationQ.isLoading || (canExec && maintQ.isLoading)
    || (canHire && hiringQ.isLoading);
  const overdue = decisions.filter((x) => daysSince(x.since) > OVERDUE_DAYS).length;
  const byKind = (k: Kind) => decisions.filter((x) => x.kind === k).length;
  const kinds: Kind[] = ["admin", "maintenance", "hiring", "probation"];
  const visibleKinds = kinds.filter((k) => (k === "maintenance" ? canExec : k === "hiring" ? canHire : true));

  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? decisions : decisions.filter((x) => x.kind === filter);
  const oldest = decisions[0];

  const mix = visibleKinds
    .map((k) => ({ kind: k, name: t(`ceo.filters.${k}`), value: byKind(k) }))
    .filter((m) => m.value > 0);

  // ── Company figures ────────────────────────────────────────────────────────
  const summary = summaryQ.data;
  const departments = [...(summary?.byDepartment ?? [])].sort((a, b) => b.count - a.count);
  // The six largest by default; the rest open in place rather than behind a scrollbar.
  const [showAllDepts, setShowAllDepts] = useState(false);
  const topDepartments = showAllDepts ? departments : departments.slice(0, 6);
  const maxDept = departments[0]?.count ?? 0;
  // The summary does not always carry `total`; the departments add up to it,
  // and the active-employee count is the last resort.
  const activeCountQ = useQuery({
    queryKey: ["employees-count", "ACTIVE"],
    queryFn: async () => {
      const res = await apiClient.get("/employees", { params: { employmentStatus: "ACTIVE", limit: 1 } });
      const body = res.data;
      return (body?.meta?.total ?? body?.data?.meta?.total ?? body?.data?.total ?? null) as number | null;
    },
    ...reportQuery,
  });
  const deptTotal = departments.reduce((a, x) => a + (x.count ?? 0), 0);
  const headcount: number | null = summary?.total ?? (deptTotal > 0 ? deptTotal : null) ?? activeCountQ.data ?? null;

  const turnover = turnoverQ.data;
  const hiredYtd = sum(turnover?.hired);
  const leftYtd = sum(turnover?.terminated);
  const netGrowth = turnover ? hiredYtd - leftYtd : null;
  const monthLabel = (m: number) =>
    new Date(year, m - 1, 1).toLocaleDateString(locale === "ar" ? "ar" : locale, { month: "short" });
  const movement = turnover
    ? Array.from({ length: month }, (_, i) => ({
        name: monthLabel(i + 1),
        hired: monthCount(turnover.hired, i + 1),
        left: monthCount(turnover.terminated, i + 1),
      }))
    : [];

  const stats = statsQ.data as { total?: number; pending?: number; interviewReady?: number; accepted?: number; rejected?: number; hired?: number } | undefined;
  const pipelineOpen = stats ? (stats.pending ?? 0) + (stats.interviewReady ?? 0) + (stats.accepted ?? 0) : null;
  const funnel = stats ? [
    { key: "applied", value: stats.total ?? 0, color: "bg-slate-400" },
    { key: "interview", value: stats.interviewReady ?? 0, color: "bg-sky-500" },
    { key: "accepted", value: stats.accepted ?? 0, color: "bg-amber-500" },
    { key: "hired", value: stats.hired ?? 0, color: "bg-emerald-500" },
  ] : [];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  const expiringItems: any[] = Array.isArray(expiryQ.data) ? expiryQ.data : [];
  const probationEnding: any[] = Array.isArray(probationEndQ.data) ? probationEndQ.data : [];
  const topAbsent = (topAbsQ.data?.items ?? []).filter((x) => x.absenceCount > 0).slice(0, 4);
  const showRisks = !expiryQ.isError || !probationEndQ.isError || !topAbsQ.isError;

  // ── Clinic figures ─────────────────────────────────────────────────────────
  // Present only once the backend ships the block; a figure it could not
  // compute arrives as null and shows as a dash.
  const clinic = d?.clinic as {
    newPatientsThisMonth?: number | null; newPatientsPreviousMonth?: number | null;
    openProstheticsCasesByStatus?: { status: string; count: number }[] | null;
    prostheticsDeliveredThisMonth?: number | null; prostheticsDeliveredTotal?: number | null;
    avgDaysIntakeToDelivery?: number | null;
    waitingListCount?: number | null; appointmentsThisMonth?: number | null;
    appointmentsNoShowThisMonth?: number | null;
  } | undefined;
  // The by-status list covers open cases only; the all-time delivered count
  // comes as its own figure and is shown as the last row. It is read from the
  // dashboard block rather than the case list, which the CEO role has no
  // permission for (granting it would also put the clinic tab in the sidebar).
  const deliveredTotal = clinic?.prostheticsDeliveredTotal ?? null;
  const openCases = [
    ...(clinic?.openProstheticsCasesByStatus ?? []),
    ...(deliveredTotal !== null ? [{ status: "DELIVERED", count: deliveredTotal }] : []),
  ];
  const openCasesTotal = openCases.reduce((a, c) => a + (c.count ?? 0), 0);
  const openCasesMax = Math.max(1, ...openCases.map((c) => c.count ?? 0));
  const patientsDelta = clinic?.newPatientsThisMonth != null && clinic?.newPatientsPreviousMonth
    ? Math.round(((clinic.newPatientsThisMonth - clinic.newPatientsPreviousMonth) / clinic.newPatientsPreviousMonth) * 100)
    : null;
  const noShowRate = clinic?.appointmentsThisMonth && clinic.appointmentsNoShowThisMonth != null
    ? Math.round((clinic.appointmentsNoShowThisMonth / clinic.appointmentsThisMonth) * 100)
    : null;

  // ── Actions ────────────────────────────────────────────────────────────────
  const [action, setAction] = useState<{ type: "approve" | "reject"; item: Decision } | null>(null);
  const [hireItem, setHireItem] = useState<Decision | null>(null);
  const actionPending = approveRequest.isPending || rejectRequest.isPending || execApprove.isPending || execReject.isPending;

  const confirmAction = async (notes: string) => {
    if (!action) return;
    const { type, item } = action;
    if (item.kind === "admin") {
      if (type === "approve") await approveRequest.mutateAsync({ id: item.id, body: { notes: notes || undefined } });
      else await rejectRequest.mutateAsync({ id: item.id, reason: notes });
    } else if (item.kind === "maintenance") {
      if (type === "approve") await execApprove.mutateAsync({ id: item.id, notes: notes || undefined });
      else await execReject.mutateAsync({ id: item.id, notes: notes || undefined });
    }
    setAction(null);
  };

  const greeting = now.getHours() < 12 ? t("ceo.goodMorning") : t("ceo.goodEvening");
  const today = now.toLocaleDateString(locale === "ar" ? "ar-SY" : locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const displayName = nameOf(d?.employee);

  const notifications: any[] = Array.isArray(notifQ.data) ? notifQ.data : [];
  const recent: any[] = itemsOf(recentQ.data).slice(0, 5);

  return (
    <div className="space-y-5">
      {/* ── Executive hero ────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-8"
        style={{ background: "linear-gradient(120deg, oklch(0.17 0.07 272) 0%, oklch(0.22 0.085 262) 45%, oklch(0.36 0.095 50) 100%)" }}
      >
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -start-16 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
              <Sparkles className="h-3 w-3 text-orange-300" />
              {t("ceo.commandTitle")}
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting}{displayName ? `${isRtl ? "،" : ","} ${displayName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-white/60">{today}</p>

            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
              <div>
                <p className="text-5xl font-bold leading-none tracking-tight sm:text-6xl">
                  {loading ? <span className="text-white/40">…</span> : <Num value={decisions.length} />}
                </p>
                <p className="mt-1.5 text-sm text-white/70">{t("ceo.pendingDecisions")}</p>
              </div>
              {!loading && (overdue > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-100 ring-1 ring-red-300/30">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                  {t("ceo.overdue", { count: overdue, days: OVERDUE_DAYS })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {decisions.length === 0 ? t("ceo.headlineClear") : t("ceo.allOnTime")}
                </span>
              ))}
            </div>

            {/* The queue at a glance: one segment per kind, sized by its share. */}
            {mix.length > 0 && (
              <div className="mt-5 max-w-md">
                <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                  {mix.map((m) => (
                    <div key={m.kind} style={{ width: `${(m.value / decisions.length) * 100}%`, background: KIND_META[m.kind].color }} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/70">
                  {mix.map((m) => (
                    <span key={m.kind} className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: KIND_META[m.kind].color }} />
                      {m.name} <b className="text-white tabular-nums">{m.value}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("ceo.headcount"), value: headcount, icon: Users, pending: headcount === null && (summaryQ.isLoading || activeCountQ.isLoading) },
              { label: t("ceo.hiredYtd"), value: turnover ? hiredYtd : null, icon: UserPlus, pending: turnoverQ.isLoading },
              { label: t("ceo.pipelineOpen"), value: pipelineOpen, icon: Briefcase, pending: statsQ.isLoading },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <s.icon className="h-4 w-4 text-orange-300" />
                <p className="mt-3 text-2xl font-bold sm:text-3xl">
                  {s.pending ? <span className="text-white/40">…</span> : <Num value={s.value} />}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("ceo.leavesPendingCEO")} value={totalOf(leavesQ.data)} loading={leavesQ.isLoading}
          icon={CalendarCheck} tone="bg-emerald-500" onClick={() => go("/leaves/pending-approval")} />
        <Kpi label={t("ceo.absencesThisMonth")} value={countOf(d?.monthlyAbsences) ?? 0}
          icon={UserX} tone="bg-rose-500" onClick={() => go("/reports/attendance")} />
        <Kpi label={t("ceo.approvedLeavesThisMonth")} value={countOf(d?.approvedLeavesThisMonth) ?? 0}
          icon={CheckCircle2} tone="bg-sky-500" />
        <Kpi label={t("ceo.netGrowth")} value={netGrowth} loading={turnoverQ.isLoading}
          hint={turnover ? t("ceo.netGrowthHint", { hired: hiredYtd, left: leftYtd }) : undefined}
          hintTone={netGrowth === null || netGrowth === 0 ? undefined : netGrowth > 0 ? "up" : "down"}
          icon={TrendingUp} tone="bg-violet-500" onClick={() => go("/reports/hr")} />
        <Kpi label={t("ceo.contractsExpiring")} value={expiryQ.isError ? null : expiringItems.length} loading={expiryQ.isLoading}
          hint={t("ceo.within90")} icon={CalendarClock} tone="bg-amber-500" onClick={() => go(`/reports/contract-ending?days=${EXPIRY_DAYS}`)} />
        <Kpi label={t("ceo.probationEnding")} value={probationEndQ.isError ? null : probationEnding.length} loading={probationEndQ.isLoading}
          hint={t("ceo.within30")} icon={ShieldCheck} tone="bg-indigo-500" onClick={() => go("/reports/probation-ending")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Decision center ─────────────────────────────────────────────── */}
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Inbox className="h-4 w-4 text-primary" />
                {t("ceo.decisionCenter")}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{t("ceo.decisionCenterDesc")}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...visibleKinds] as Filter[]).map((f) => {
                const n = f === "all" ? decisions.length : byKind(f);
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {t(`ceo.filters.${f}`)}
                    <span className={`rounded-full px-1.5 tabular-nums ${active ? "bg-white/20" : "bg-muted"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <div className="mb-3 rounded-full bg-emerald-500/10 p-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="font-semibold">{t("ceo.emptyTitle")}</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t("ceo.emptyDesc")}</p>
              </div>
            ) : (
              <ul className="max-h-115 space-y-2 overflow-y-auto pe-1">
                {shown.map((item) => {
                  const meta = KIND_META[item.kind];
                  const Icon = meta.icon;
                  const days = daysSince(item.since);
                  return (
                    <li
                      key={`${item.kind}-${item.id}`}
                      className="relative flex flex-wrap items-center gap-3 overflow-hidden rounded-xl border bg-background p-3 ps-4 transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <span className="absolute inset-y-0 start-0 w-1" style={{ background: meta.color }} />
                      <div className={`shrink-0 rounded-lg p-2 ${meta.chip}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <button type="button" onClick={() => go(item.href)} className="min-w-0 flex-1 text-start">
                        <p className="truncate text-sm font-semibold">{item.who}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{t(`ceo.kinds.${item.kind}`)}</span>
                          {item.title && (
                            <>
                              <span>·</span>
                              <span className="truncate">{item.title}</span>
                            </>
                          )}
                          {item.priority && (
                            <>
                              <span>·</span>
                              <span className={item.priority === "URGENT" ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                                {tr(`maintenance.priorities.${item.priority}` as any)}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                      <AgeChip days={days} t={t as any} />
                      <div className="flex shrink-0 items-center gap-1.5">
                        {(item.kind === "admin" || item.kind === "maintenance") && (
                          <>
                            <Button size="sm" className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => setAction({ type: "approve", item })}>
                              <CheckCircle2 className="h-3.5 w-3.5" />{t("ceo.approve")}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600 hover:bg-red-500/10 hover:text-red-600"
                              onClick={() => setAction({ type: "reject", item })}>
                              <XCircle className="h-3.5 w-3.5" />{t("ceo.reject")}
                            </Button>
                          </>
                        )}
                        {item.kind === "hiring" && (
                          <>
                            <Button size="sm" className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => setHireItem(item)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />{t("ceo.hire")}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => go(item.href)}>
                              {t("ceo.review")}
                            </Button>
                          </>
                        )}
                        {item.kind === "probation" && (
                          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => go(item.href)}>
                            <Gavel className="h-3.5 w-3.5" />{t("ceo.decide")}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Side column ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <Panel title={t("ceo.mixTitle")} icon={Gavel}>
            {loading ? (
              <Skeleton className="mx-auto h-36 w-36 rounded-full" />
            ) : mix.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("ceo.emptyTitle")}</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={mix} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60}
                        paddingAngle={3} stroke="none" cornerRadius={4}>
                        {mix.map((m) => <Cell key={m.kind} fill={KIND_META[m.kind].color} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums">{decisions.length}</span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {mix.map((m) => (
                    <li key={m.kind}>
                      <button type="button" onClick={() => setFilter(m.kind)}
                        className="flex w-full items-center justify-between gap-2 text-sm hover:text-primary">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_META[m.kind].color }} />
                          <span className="truncate">{m.name}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{m.value}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {oldest && (
              <button type="button" onClick={() => go(oldest.href)}
                className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-start transition-colors hover:border-primary/40 hover:bg-muted/40">
                <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">{t("ceo.oldestTitle")}</p>
                  <p className="truncate text-sm font-semibold">{oldest.who} · {t(`ceo.kinds.${oldest.kind}`)}</p>
                </div>
                <AgeChip days={daysSince(oldest.since)} t={t as any} />
              </button>
            )}
          </Panel>

          <Panel
            title={t("ceo.notificationsTitle")} icon={Bell}
            action={<button type="button" onClick={() => go("/notifications")} className="text-xs text-primary hover:underline">{t("ceo.viewAll")}</button>}
          >
            {notifQ.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("ceo.noNotifications")}</p>
            ) : (
              <ul className="divide-y">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 py-2.5 text-start hover:text-primary"
                      onClick={() => {
                        markAsRead.mutate(n.id);
                        const link = resolveNotificationLink(n);
                        if (link) router.push(link);
                      }}
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{locale === "ar" ? n.titleAr : (n.titleEn || n.titleAr)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{locale === "ar" ? n.messageAr : (n.messageEn || n.messageAr)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* ── Clinic performance — read-only: nothing in this block navigates ── */}
      {clinic && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title={t("ceo.clinicTitle")} icon={Stethoscope}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label={t("ceo.newPatients")} value={clinic.newPatientsThisMonth ?? null}
                hint={patientsDelta === null ? undefined : t("ceo.vsLastMonth", { pct: Math.abs(patientsDelta) })}
                hintTone={patientsDelta === null || patientsDelta === 0 ? undefined : patientsDelta > 0 ? "up" : "down"}
                icon={Users} tone="bg-sky-500" />
              <Kpi label={t("ceo.delivered")} value={clinic.prostheticsDeliveredThisMonth ?? null}
                hint={t("ceo.thisMonth")} icon={PackageCheck} tone="bg-emerald-500" />
              <Kpi label={t("ceo.avgDays")} value={clinic.avgDaysIntakeToDelivery ?? null}
                hint={t("ceo.avgDaysHint")} icon={Timer} tone="bg-violet-500" />
              <Kpi label={t("ceo.waitingList")} value={clinic.waitingListCount ?? null}
                icon={Hourglass} tone="bg-amber-500" />
            </div>

            <div className="mt-4 rounded-xl border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{t("ceo.appointments")}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
                <p className="text-3xl font-bold tracking-tight"><Num value={clinic.appointmentsThisMonth ?? null} /></p>
                <p className="text-xs text-muted-foreground">
                  {t("ceo.noShow", { count: clinic.appointmentsNoShowThisMonth ?? 0 })}
                  {noShowRate !== null && (
                    <span className={`ms-2 rounded-full px-2 py-0.5 font-medium ${
                      noShowRate > 15 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}>{noShowRate}%</span>
                  )}
                </p>
              </div>
              {noShowRate !== null && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-500/25">
                  <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${noShowRate}%` }} />
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title={t("ceo.openCases")} icon={Activity}
            action={<span className="text-xs text-muted-foreground">{t("ceo.openCasesTotal", { count: openCasesTotal })}</span>}
          >
            {openCases.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("ceo.noOpenCases")}</p>
            ) : (
              <ul className="space-y-3">
                {openCases.map((c, i) => (
                  <li key={c.status}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">
                        {c.status === "GAIT_TRAINING"
                          ? tr("clinic.prosthetics.statuses.SOCKET_TRIAL")
                          : tr.has(`clinic.prosthetics.statuses.${c.status}`) ? tr(`clinic.prosthetics.statuses.${c.status}` as any) : c.status}
                      </span>
                      <b className="shrink-0 tabular-nums">{c.count}</b>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full transition-all duration-700 ${c.status === "DELIVERED" ? "bg-emerald-500" : "bg-sky-500"}`}
                        style={{ width: `${(c.count / openCasesMax) * 100}%`, opacity: c.status === "DELIVERED" ? 1 : Math.max(0.4, 1 - i * 0.1) }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ── Company pulse ─────────────────────────────────────────────────── */}
      {(!turnoverQ.isError || !summaryQ.isError) && (
        <div className="grid gap-5 lg:grid-cols-3">
          {!turnoverQ.isError && (
            <Panel
              className="lg:col-span-2" title={t("ceo.movementTitle", { year })} icon={TrendingUp}
              action={
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t("ceo.hired")}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" />{t("ceo.left")}</span>
                </div>
              }
            >
              {turnoverQ.isLoading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : hiredYtd + leftYtd === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">{t("ceo.noMovement")}</p>
              ) : (
                <div className="h-56" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movement} barGap={4} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="hired" name={t("ceo.hired")} fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="left" name={t("ceo.left")} fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Separation dates are only recorded from June 2026 on, so the earlier
                  months of that year show no departures. */}
              {year === 2026 && !turnoverQ.isLoading && (
                <p className="mt-2 text-[11px] text-muted-foreground">{t("ceo.movementNote")}</p>
              )}
            </Panel>
          )}

          {!summaryQ.isError && (
            <Panel
              title={t("ceo.departmentsTitle")} icon={Building2}
              action={<span className="text-xs text-muted-foreground">{t("ceo.departmentsCount", { count: departments.length })}</span>}
            >
              {summaryQ.isLoading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
              ) : topDepartments.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{tr("common.noData")}</p>
              ) : (
                <>
                <ul className="space-y-3">
                  {topDepartments.map((dep, i) => (
                    <li key={dep.departmentId ?? i}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{dep.departmentAr}</span>
                        <span className="shrink-0 tabular-nums">
                          <b>{dep.count}</b>
                          <span className="ms-1.5 text-xs text-muted-foreground">
                            {headcount ? Math.round((dep.count / headcount) * 100) : 0}%
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${maxDept ? (dep.count / maxDept) * 100 : 0}%`, opacity: Math.max(0.4, 1 - i * 0.08) }} />
                      </div>
                    </li>
                  ))}
                </ul>
                {departments.length > 6 && (
                  <button type="button" onClick={() => setShowAllDepts((v) => !v)}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5">
                    {showAllDepts ? t("ceo.showLess") : t("ceo.showAllDepartments", { count: departments.length })}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllDepts ? "rotate-180" : ""}`} />
                  </button>
                )}
              </>
              )}
            </Panel>
          )}
        </div>
      )}

      {/* ── Hiring funnel · Risks · Recently approved ─────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {!statsQ.isError && (
          <Panel
            title={t("ceo.funnelTitle")} icon={Briefcase}
            action={<button type="button" onClick={() => go("/job-applications")} className="text-xs text-primary hover:underline">{t("ceo.viewAll")}</button>}
          >
            {statsQ.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {funnel.map((f) => (
                    <li key={f.key} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-xs text-muted-foreground">{t(`ceo.funnel.${f.key}`)}</span>
                      <div className="h-7 flex-1 overflow-hidden rounded-lg bg-muted">
                        <div className={`flex h-full items-center justify-end rounded-lg px-2 text-xs font-semibold text-white transition-all duration-700 ${f.color}`}
                          style={{ width: `${Math.max(12, (f.value / funnelMax) * 100)}%` }}>
                          {f.value}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("ceo.funnelRejected", { count: stats?.rejected ?? 0 })}
                </p>
              </>
            )}
          </Panel>
        )}

        {showRisks && (
          <Panel title={t("ceo.risksTitle")} icon={AlertTriangle}>
            <div className="space-y-4">
              {!expiryQ.isError && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("ceo.contractsExpiring")}</p>
                  {expiryQ.isLoading ? <Skeleton className="h-9" /> : expiringItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("ceo.noneUpcoming")}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {[...expiringItems].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 3).map((e) => (
                        <li key={e.id ?? e.employeeId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{nameOf(e) || whoOf(e) || nameOf(empMap.get(e.id)) || e.employeeNumber || "—"}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            e.daysRemaining <= 30 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}>
                            {t("ceo.daysLeft", { days: e.daysRemaining })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {!topAbsQ.isError && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("ceo.topAbsences")}</p>
                  {topAbsQ.isLoading ? <Skeleton className="h-9" /> : topAbsent.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("ceo.noAbsences")}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {topAbsent.map((a) => (
                        <li key={a.employee.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{nameOf(a.employee)}</span>
                          <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            {t("ceo.absenceDays", { days: a.absenceCount })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </Panel>
        )}

        <Panel
          title={t("ceo.recentApprovals")} icon={CheckCircle2}
          action={<button type="button" onClick={() => go("/requests/pending-manager")} className="text-xs text-primary hover:underline">{t("ceo.viewAll")}</button>}
        >
          {recentQ.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
          ) : recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("ceo.noRecent")}</p>
          ) : (
            <ul className="space-y-1.5">
              {recent.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => go(`/requests/${r.id}`)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-start transition-colors hover:bg-muted">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{whoOf(r) || r.requestNumber}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {tr.has(`requests.types.${r.type}`) ? tr(`requests.types.${r.type}` as any) : r.type}
                      </span>
                    </span>
                    <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <RequestActionDialog
        open={!!action}
        onOpenChange={(o) => { if (!o) setAction(null); }}
        action={action?.type ?? "approve"}
        onConfirm={confirmAction}
        isLoading={actionPending}
      />
      <ConfirmDialog
        open={!!hireItem}
        onOpenChange={(o) => { if (!o) setHireItem(null); }}
        title={t("ceo.hireConfirmTitle")}
        description={hireItem ? t("ceo.hireConfirmDesc", { name: hireItem.who }) : undefined}
        onConfirm={() => { if (hireItem) ceoHire.mutate(hireItem.id); setHireItem(null); }}
      />
    </div>
  );
}
