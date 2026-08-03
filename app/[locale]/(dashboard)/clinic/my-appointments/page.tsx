"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useMyAppointments, useUpdateAppointmentStatus, useCancelAppointment } from "@/lib/hooks/use-clinic-appointments";
import { Appointment, AppointmentStatus } from "@/lib/api/clinic-appointments";

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

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function MyAppointmentsPage() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.appointments");

  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [cancelTargetId, setCancelTargetId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const updateStatus = useUpdateAppointmentStatus();
  const cancelAppt = useCancelAppointment();

  const { data, isLoading } = useMyAppointments({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    date: dateFilter || undefined,
    limit: 100,
  });

  const items = data?.items ?? [];

  const fmtTime = (v?: string | null) =>
    v ? (v.length > 5 ? new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : v) : "—";

  // Agenda grouped by day (ascending), appointments sorted by start time.
  const todayKey = localIso(new Date());
  const dayKeyOf = (a: Appointment) =>
    a.startTime && a.startTime.length > 5 ? localIso(new Date(a.startTime)) : (a.date ?? "");
  const groups = (() => {
    const map = new Map<string, Appointment[]>();
    for (const a of items) {
      const k = dayKeyOf(a);
      if (!k) continue;
      (map.get(k) ?? map.set(k, []).get(k)!).push(a);
    }
    return [...map.entries()]
      .sort((x, y) => x[0].localeCompare(y[0]))
      .map(([key, appts]) => ({
        key,
        isToday: key === todayKey,
        label: new Date(key + "T00:00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        appts: appts.slice().sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
      }));
  })();

  const hasFilters = statusFilter !== "ALL" || !!dateFilter;

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader title={t("myAppointments.title")} description={t("myAppointments.description")} />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppointmentStatus | "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filter.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filter.allStatuses")}</SelectItem>
            {(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"] as AppointmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{t(`statuses.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
          aria-label={t("myAppointments.dateFilter")}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setStatusFilter("ALL"); setDateFilter(""); }}>
            <X className="h-3.5 w-3.5" />
            {t("myAppointments.clearFilters")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{t("myAppointments.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key} className="space-y-2.5">
              {/* day header */}
              <div className="flex items-center gap-2 border-b pb-1.5">
                <h3 className="text-sm font-semibold">{g.label}</h3>
                {g.isToday && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{t("myAppointments.today")}</span>
                )}
                <span className="ms-auto text-xs text-muted-foreground">{g.appts.length} {t("board.appointments")}</span>
              </div>

              {g.appts.map((appt) => {
                const num = appt.patientNumber ?? appt.patient?.patientNumber;
                const cancelled = appt.status === "CANCELLED";
                return (
                  <div key={appt.id} className="flex items-stretch overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: STATUS_BAR[appt.status] }} />
                    <div className="flex flex-1 items-start gap-3 p-3 min-w-0">
                      {/* time */}
                      <div className="min-w-16 shrink-0 text-center">
                        <p className="font-mono text-sm font-bold leading-tight">{fmtTime(appt.startTime)}</p>
                        <p className="font-mono text-xs text-muted-foreground leading-tight">{fmtTime(appt.endTime)}</p>
                      </div>
                      {/* info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("text-sm font-semibold", cancelled && "line-through")}>
                            {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : (appt.patientName || "—")}
                          </span>
                          {num && <span className="font-mono text-xs text-muted-foreground">{num}</span>}
                          <Badge className={cn("text-[10px]", STATUS_COLOR[appt.status])} variant="outline">{t(`statuses.${appt.status}`)}</Badge>
                          <Badge variant="outline" className="text-[10px]">{t(`types.${appt.appointmentType}`)}</Badge>
                        </div>
                        {appt.notes && <p className="truncate text-xs text-muted-foreground">{appt.notes}</p>}
                        {cancelled && (appt.cancelReason || appt.cancelledReason) && (
                          <p className="text-xs text-destructive/80">{t("cancelReason")}: {appt.cancelReason ?? appt.cancelledReason}</p>
                        )}
                      </div>
                      {/* actions */}
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {appt.status === "SCHEDULED" && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "CONFIRMED" })}>
                            <Check className="h-3.5 w-3.5" />{t("actions.confirm")}
                          </Button>
                        )}
                        {appt.status === "CONFIRMED" && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "COMPLETED" })}>
                            <Check className="h-3.5 w-3.5" />{t("actions.complete")}
                          </Button>
                        )}
                        {!["CANCELLED", "COMPLETED"].includes(appt.status) && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive"
                            onClick={() => { setCancelTargetId(appt.id); setCancelReason(""); setCancelOpen(true); }}>
                            <X className="h-3.5 w-3.5" />{t("actions.cancel")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Cancel appointment dialog */}
      <Dialog open={cancelOpen} onOpenChange={(o) => { if (!cancelAppt.isPending) setCancelOpen(o); }}>
        <DialogContent className="max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("actions.cancelConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("actions.cancelReasonPlaceholder")} className="text-sm" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelAppt.isPending}>
              {t("form.cancel")}
            </Button>
            <Button variant="destructive" disabled={cancelAppt.isPending}
              onClick={async () => {
                await cancelAppt.mutateAsync({ id: cancelTargetId, reason: cancelReason.trim() || undefined });
                setCancelOpen(false);
              }}>
              {cancelAppt.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t("actions.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
