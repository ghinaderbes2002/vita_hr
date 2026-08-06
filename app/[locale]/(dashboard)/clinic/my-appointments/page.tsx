"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X, Check, Loader2, ChevronLeft, ChevronRight, UserRound, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const { data, isLoading } = useMyAppointments({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    limit: 200,
  });
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
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekKeys = new Set(weekDays.map(localIso));
  const weekAppts = items.filter((a) => weekKeys.has(dayKeyOf(a)));

  const dayColor = (d: Date) => (localIso(d) === todayKey ? "#f97316" : "#cbd5e1");
  const timelineGroups = weekDays.map((d) => ({
    title: `${d.toLocaleDateString(locale, { weekday: "short" })} ${d.getDate()}`,
    color: dayColor(d),
    appointments: weekAppts.filter((a) => dayKeyOf(a) === localIso(d)),
  }));
  const weekLabel = `${weekStart.toLocaleDateString(locale, { day: "numeric", month: "short" })} — ${addDays(weekStart, 6).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;

  // ── Dashboard stats (this week) ───────────────────────────────────────────
  const countBy = (s: AppointmentStatus) => weekAppts.filter((a) => a.status === s).length;
  const weekTotal = weekAppts.length;
  const breakdown = STATUS_ORDER.map((s) => ({
    status: s,
    value: countBy(s),
    pct: weekTotal ? Math.round((countBy(s) / weekTotal) * 100) : 0,
  }));

  const detailDept = detailAppt ? deptNameOf(detailAppt) : "";

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader title={t("myAppointments.title")} description={t("myAppointments.description")} />

      {/* status filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppointmentStatus | "ALL")}>
          <SelectTrigger className="w-48"><SelectValue placeholder={t("filter.allStatuses")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filter.allStatuses")}</SelectItem>
            {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{t(`statuses.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ── Week at a glance: one stacked bar for the whole week, split by status,
             with a legend that carries the counts so identity never rides on
             colour alone. ── */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">{t("myAppointments.statusBreakdown")}</p>
          <p className="text-xs text-muted-foreground">
            <span className="text-2xl font-bold tabular-nums text-foreground">{weekTotal}</span>{" "}
            {t("board.appointments")}
          </p>
        </div>

        <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
          {breakdown.filter((b) => b.value > 0).map((b) => (
            <div
              key={b.status}
              className="transition-opacity hover:opacity-75"
              style={{ flexGrow: b.value, backgroundColor: STATUS_BAR[b.status] }}
              title={`${t(`statuses.${b.status}`)}: ${b.value} (${b.pct}%)`}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-3">
          {breakdown.map((b) => (
            <div
              key={b.status}
              className={cn(
                "flex items-center gap-2 border-b py-1.5 last:border-b-0",
                b.value === 0 && "opacity-45",
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_BAR[b.status] }} />
              <span className="flex-1 truncate text-xs text-muted-foreground">{t(`statuses.${b.status}`)}</span>
              <span className="text-sm font-bold tabular-nums">{b.value}</span>
              <span className="w-9 shrink-0 text-end text-[11px] tabular-nums text-muted-foreground">
                {b.value > 0 ? `${b.pct}%` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Week navigation ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
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
            />
          </div>
        </div>
      )}

      {/* ── Appointment detail + actions ── */}
      <Dialog open={!!detailAppt} onOpenChange={(o) => { if (!o) setDetailAppt(null); }}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t("myAppointments.detailTitle")}</DialogTitle></DialogHeader>
          {detailAppt && (
            <dl className="divide-y text-sm">
              {([
                [t("board.patient"), detailAppt.patient ? `${detailAppt.patient.firstName} ${detailAppt.patient.lastName}` : (detailAppt.patientName || "—")],
                [t("myAppointments.patientNumber"), detailAppt.patientNumber ?? detailAppt.patient?.patientNumber ?? "—"],
                [t("board.type"), t(`types.${detailAppt.appointmentType}`)],
                [t("board.status"), <Badge key="s" variant="outline" className={cn("text-[10px]", STATUS_COLOR[detailAppt.status])}>{t(`statuses.${detailAppt.status}`)}</Badge>],
                [t("board.time"), `${fmtTime(detailAppt.startTime)} — ${fmtTime(detailAppt.endTime)}`],
                [t("form.department"), detailDept || "—"],
                [t("form.notes"), detailAppt.notes || "—"],
              ] as [string, React.ReactNode][]).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 py-2">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="text-end font-medium">{value}</dd>
                </div>
              ))}
            </dl>
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
