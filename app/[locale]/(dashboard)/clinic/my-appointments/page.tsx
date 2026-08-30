"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X, Check, Loader2, ChevronLeft, ChevronRight, UserRound, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useMyAppointments, useUpdateAppointmentStatus, useCancelAppointment } from "@/lib/hooks/use-clinic-appointments";
import { Appointment, AppointmentStatus } from "@/lib/api/clinic-appointments";
import { useDepartments } from "@/lib/hooks/use-departments";
import { AppointmentTimeline } from "@/components/clinic/appointment-timeline";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
  RESCHEDULED: "bg-purple-100 text-purple-800",
};
const STATUS_BAR: Record<AppointmentStatus, string> = {
  SCHEDULED: "#3b82f6", CONFIRMED: "#22c55e", COMPLETED: "#6b7280",
  CANCELLED: "#ef4444", NO_SHOW: "#f97316", RESCHEDULED: "#a855f7",
};
const STATUS_ORDER: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "RESCHEDULED", "CANCELLED"];

const deptDot = (name: string) =>
  name.includes("العلاج الفيزيائي") ? "#10b981"
  : (name.includes("الأطراف الصناعية") || name.includes("الاطراف الصناعية") || name.includes("طب الأقدام") || name.includes("طب الاقدام")) ? "#6366f1"
  : "#9ca3af";

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
/** `Date#getDay()` for Friday — the clinic is closed, so it gets no column. */
const CLINIC_DAY_OFF = 5;

// Week starts on Saturday.
const startOfWeek = (ref: Date) => {
  const d = new Date(ref); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return d;
};

export default function MyAppointmentsPage() {
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.appointments");

  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [weekOffset, setWeekOffset] = useState(0);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const updateStatus = useUpdateAppointmentStatus();
  const cancelAppt = useCancelAppointment();

  // Every status is fetched and the filter is applied locally, so the counts in
  // the toolbar keep describing the whole week while the calendar narrows.
  const { data, isLoading } = useMyAppointments({ limit: 200 });
  const items = data?.items ?? [];

  // ── Resolvers ─────────────────────────────────────────────────────────────
  const { data: depsData } = useDepartments({ limit: 200 }, 30 * 60 * 1000);
  const departments: { id: string; nameAr: string; nameEn?: string }[] =
    (depsData as any)?.data?.items ?? (depsData as any)?.items ?? [];
  const deptNameOf = (a: Appointment) =>
    a.department?.nameAr ?? (a.departmentId ? (departments.find((d) => d.id === a.departmentId)?.nameAr ?? "") : "");

  // Where the appointment's clinical file lives: the case page when the
  // appointment is tied to one, otherwise the patient profile.
  const caseHref = (a: Appointment) => {
    if (a.caseId && a.caseType === "PHYSIO") return `/${locale}/clinic/physio/${a.caseId}`;
    if (a.caseId && a.caseType === "PROSTHETICS") return `/${locale}/clinic/prosthetics/${a.caseId}`;
    return `/${locale}/clinic/patients/${a.patientId}`;
  };
  const finishAndOpenCase = async (a: Appointment, status: Extract<AppointmentStatus, "COMPLETED" | "NO_SHOW">) => {
    const href = caseHref(a);
    setDetailAppt(null);
    try {
      await updateStatus.mutateAsync({ id: a.id, status });
      router.push(href);
    } catch {
      /* the mutation hook already surfaces the error toast */
    }
  };

  const fmtTime = (v?: string | null) =>
    v ? (v.length > 5 ? new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : v) : "—";
  const dayKeyOf = (a: Appointment) => (a.startTime && a.startTime.length > 5 ? localIso(new Date(a.startTime)) : (a.date ?? ""));

  // ── Week model ────────────────────────────────────────────────────────────
  const today = new Date();
  const todayKey = localIso(today);
  const weekStart = startOfWeek(addDays(today, weekOffset * 7));
  // Friday is the clinic's day off, so the grid runs Saturday → Thursday. Every
  // other week figure is derived from `weekDays`, which keeps the columns, the
  // header range and the status counts describing the same six days.
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .filter((d) => d.getDay() !== CLINIC_DAY_OFF);
  const weekKeys = new Set(weekDays.map(localIso));
  const weekAppts = items.filter((a) => weekKeys.has(dayKeyOf(a)));

  const visibleAppts = statusFilter === "ALL" ? weekAppts : weekAppts.filter((a) => a.status === statusFilter);

  // What the practitioner opens this page to find: today's load and what's next.
  const minutesOf = (a: Appointment) => {
    const v = a.startTime;
    if (!v) return null;
    if (v.length > 5) { const d = new Date(v); return d.getHours() * 60 + d.getMinutes(); }
    const m = /^(\d{1,2}):(\d{2})/.exec(v);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const todayAppts = items
    .filter((a) => dayKeyOf(a) === todayKey && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(a.status))
    .sort((a, b) => (minutesOf(a) ?? 0) - (minutesOf(b) ?? 0));
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nextAppt = todayAppts.find((a) => (minutesOf(a) ?? 0) >= nowMinutes) ?? null;
  const patientOf = (a: Appointment) =>
    a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.patientName || "—");

  const dayColor = (d: Date) => (localIso(d) === todayKey ? "#f97316" : "#cbd5e1");
  const timelineGroups = weekDays.map((d) => ({
    title: d.toLocaleDateString(locale, { weekday: "long" }),
    subtitle: d.toLocaleDateString(locale, { day: "numeric", month: "short" }),
    color: dayColor(d),
    isToday: localIso(d) === todayKey,
    appointments: visibleAppts.filter((a) => dayKeyOf(a) === localIso(d)),
  }));
  const weekLabel = `${weekDays[0].toLocaleDateString(locale, { day: "numeric", month: "short" })} — ${weekDays[weekDays.length - 1].toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;

  // ── Dashboard stats (this week) ───────────────────────────────────────────
  const countBy = (s: AppointmentStatus) => weekAppts.filter((a) => a.status === s).length;
  const weekTotal = weekAppts.length;
  const breakdown = STATUS_ORDER.map((s) => ({
    status: s,
    value: countBy(s),
    pct: weekTotal ? Math.round((countBy(s) / weekTotal) * 100) : 0,
  }));
  // "All" first, then one chip per status — the filter and the legend in one row.
  const chips: { key: AppointmentStatus | "ALL"; label: string; value: number; color: string; pct: number | null }[] = [
    { key: "ALL", label: t("filter.allStatuses"), value: weekTotal, color: "#64748b", pct: null },
    ...breakdown.map((b) => ({
      key: b.status, label: t(`statuses.${b.status}`), value: b.value, color: STATUS_BAR[b.status], pct: b.pct,
    })),
  ];

  const detailDept = detailAppt ? deptNameOf(detailAppt) : "";

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader title={t("myAppointments.title")} description={t("myAppointments.description")} />

      {/* ── Today at a glance ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("myAppointments.todayLoad")}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{todayAppts.length}</span>
            <span className="text-xs text-muted-foreground">
              {today.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={!nextAppt}
          onClick={() => nextAppt && setDetailAppt(nextAppt)}
          className={cn(
            "rounded-xl border bg-card p-4 text-start shadow-sm transition-colors",
            nextAppt ? "hover:border-primary/50" : "cursor-default",
          )}
        >
          <p className="text-xs font-medium text-muted-foreground">{t("myAppointments.nextUp")}</p>
          {nextAppt ? (
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tabular-nums">{fmtTime(nextAppt.startTime)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{patientOf(nextAppt)}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t(`types.${nextAppt.appointmentType}`)}
                </span>
              </span>
              <Badge variant="outline" className={cn("shrink-0 text-[10px]", STATUS_COLOR[nextAppt.status])}>
                {t(`statuses.${nextAppt.status}`)}
              </Badge>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("myAppointments.noneLeftToday")}</p>
          )}
        </button>
      </div>

      {/* ── Toolbar: week navigation, and status chips that double as the filter
             and the calendar's legend. ── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setWeekOffset(0)}>
                <CalendarClock className="h-3.5 w-3.5" />{t("myAppointments.thisWeek")}
              </Button>
            )}
          </div>
          <span className="text-sm font-semibold">{weekLabel}</span>
          <span className="ms-auto text-xs text-muted-foreground">
            <span className="text-lg font-bold tabular-nums text-foreground">{weekTotal}</span>{" "}
            {t("board.appointments")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t px-3 py-2">
          {chips.map((c) => {
            const active = statusFilter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setStatusFilter(c.key)}
                title={c.pct !== null ? `${c.label} — ${c.pct}%` : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors",
                  active ? "bg-muted font-semibold ring-1 ring-border" : "hover:bg-muted/60",
                  !active && c.value === 0 && "opacity-45",
                )}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-bold tabular-nums">{c.value}</span>
              </button>
            );
          })}
        </div>

        {/* proportion of the week at a glance — 2px surface gaps between segments */}
        <div className="flex h-1.5 gap-0.5 bg-muted">
          {breakdown.filter((b) => b.value > 0).map((b) => (
            <div key={b.status} style={{ flexGrow: b.value, backgroundColor: STATUS_BAR[b.status] }} />
          ))}
        </div>
      </div>

      {/* ── Week timeline ── */}
      {isLoading ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <AppointmentTimeline
              groups={timelineGroups}
              isToday={weekDays.some((d) => localIso(d) === todayKey)}
              onSelect={setDetailAppt}
              hideEmptyLabel
              hideLegend
            />
          </div>
        </div>
      )}

      {/* ── Appointment detail + actions ── */}
      <Dialog open={!!detailAppt} onOpenChange={(o) => { if (!o) setDetailAppt(null); }}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle className="sr-only">{t("myAppointments.detailTitle")}</DialogTitle></DialogHeader>
          {detailAppt && (
            <>
              {/* identity first: who, when, and what state the visit is in */}
              <div className="flex items-start gap-3 border-b pb-4">
                <div
                  className="mt-0.5 h-1.5 w-1.5 shrink-0 self-stretch rounded-full"
                  style={{ backgroundColor: STATUS_BAR[detailAppt.status] }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{patientOf(detailAppt)}</p>
                  <p className="mt-0.5 font-mono text-sm text-muted-foreground tabular-nums">
                    {/* An open-ended visit's endTime is only the server's buffer. */}
                    {fmtTime(detailAppt.startTime)} — {detailAppt.isOpenEnded ? t("form.openEnded") : fmtTime(detailAppt.endTime)}
                  </p>
                </div>
                <Badge variant="outline" className={cn("shrink-0 text-[10px]", STATUS_COLOR[detailAppt.status])}>
                  {t(`statuses.${detailAppt.status}`)}
                </Badge>
              </div>

              <dl className="divide-y text-sm">
                {([
                  [t("myAppointments.patientNumber"), detailAppt.patientNumber ?? detailAppt.patient?.patientNumber ?? "—"],
                  [t("board.type"), t(`types.${detailAppt.appointmentType}`)],
                  [t("form.department"), detailDept || "—"],
                  [t("form.notes"), detailAppt.notes || "—"],
                ] as [string, React.ReactNode][]).map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-start justify-between gap-3 py-2">
                    <dt className="shrink-0 text-muted-foreground">{label}</dt>
                    <dd className="text-end font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <DialogFooter className="flex-wrap gap-2 sm:justify-start">
            {detailAppt?.status === "SCHEDULED" && (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={updateStatus.isPending}
                onClick={() => { updateStatus.mutate({ id: detailAppt.id, status: "CONFIRMED" }); setDetailAppt(null); }}>
                <Check className="h-4 w-4" />{t("actions.confirm")}
              </Button>
            )}
            {detailAppt && !["CANCELLED", "COMPLETED"].includes(detailAppt.status) && (
              <>
                {/* Completing / marking a no-show sends the practitioner straight to the
                    patient's case file so the visit can be documented right away. */}
                <Button size="sm" variant="outline" className="gap-1.5" disabled={updateStatus.isPending}
                  onClick={() => finishAndOpenCase(detailAppt, "COMPLETED")}>
                  <Check className="h-4 w-4" />{t("actions.complete")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-orange-600" disabled={updateStatus.isPending}
                  onClick={() => finishAndOpenCase(detailAppt, "NO_SHOW")}>
                  <UserRound className="h-4 w-4" />{t("actions.noShow")}
                </Button>
              </>
            )}
            {detailAppt && !["CANCELLED", "COMPLETED"].includes(detailAppt.status) && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive"
                onClick={() => { setCancelTargetId(detailAppt.id); setCancelReason(""); setCancelOpen(true); setDetailAppt(null); }}>
                <X className="h-4 w-4" />{t("actions.cancel")}
              </Button>
            )}
            <Button variant="outline" className="ms-auto" onClick={() => setDetailAppt(null)}>{t("form.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={(o) => { if (!cancelAppt.isPending) setCancelOpen(o); }}>
        <DialogContent className="max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t("actions.cancelConfirmTitle")}</DialogTitle></DialogHeader>
          <div className="py-2">
            <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("actions.cancelReasonPlaceholder")} className="text-sm" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelAppt.isPending}>{t("form.cancel")}</Button>
            <Button variant="destructive" disabled={cancelAppt.isPending}
              onClick={async () => { await cancelAppt.mutateAsync({ id: cancelTargetId, reason: cancelReason.trim() || undefined }); setCancelOpen(false); }}>
              {cancelAppt.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t("actions.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
