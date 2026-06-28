"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, Clock, X, Check, Loader2, UserRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useClinicAppointments, useClinicCalendar, useCreateAppointment, useCancelAppointment, useUpdateAppointmentStatus } from "@/lib/hooks/use-clinic-appointments";
import { Appointment, AppointmentType, AppointmentStatus, PractitionerRole } from "@/lib/api/clinic-appointments";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { useMyEmployee, useEmployeesByDepartment } from "@/lib/hooks/use-employees";

// ─── Labels ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
  RESCHEDULED: "bg-purple-100 text-purple-800",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.appointments");

  const DAY_NAMES = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2023, 0, 1 + i))
  );

  const today = new Date();
  const { data: myEmployee } = useMyEmployee();
  const myJobTitleCode: string = (myEmployee as any)?.jobTitle?.code ?? "";
  const PHYSIO_DEPT_ID = "8893e27d-3581-42b6-8111-0fb743ca2403";
  const { data: physioDeptData } = useEmployeesByDepartment(PHYSIO_DEPT_ID);
  const physioEmployees: { id: string; firstNameAr: string; lastNameAr: string }[] =
    (physioDeptData as any)?.employees ?? (physioDeptData as any)?.items ?? (Array.isArray(physioDeptData) ? physioDeptData : []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toISO(today));
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState("");
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientLabel, setSelectedPatientLabel] = useState("");
  const [newForm, setNewForm] = useState({
    patientId: "",
    appointmentType: "ASSESSMENT" as AppointmentType,
    practitionerRole: "PROSTHETIST" as PractitionerRole,
    physiotherapistId: "",
    date: toISO(today), startTime: "09:00", endTime: "09:30", notes: "",
  });

  // Calendar range: first and last day of viewed month
  const from = toISO(startOfMonth(viewYear, viewMonth));
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const to = toISO(lastDay);

  const { data: calendarAppts = [], isLoading: calLoading } = useClinicCalendar(from, to);
  const { data: dayData, isLoading: dayLoading } = useClinicAppointments({ limit: 500, status: statusFilter !== "ALL" ? statusFilter : undefined });
  const { data: patientsData } = useClinicPatients({ search: patientSearch, limit: 10 });
  const createAppt = useCreateAppointment();
  const cancelAppt = useCancelAppointment();
  const updateStatus = useUpdateAppointmentStatus();

  const patientsList = patientsData?.items ?? [];

  const dayAppointments = dayData?.items ?? [];

  // Group appointments by date for calendar dots
  const apptsByDate = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    for (const a of calendarAppts) {
      if (!m[a.date]) m[a.date] = [];
      m[a.date].push(a);
    }
    return m;
  }, [calendarAppts]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const handleCreateAppt = async () => {
    if (!newForm.patientId) return;
    const startISO = new Date(`${newForm.date}T${newForm.startTime}:00`).toISOString();
    const endISO = new Date(`${newForm.date}T${newForm.endTime}:00`).toISOString();
    await createAppt.mutateAsync({
      patientId: newForm.patientId,
      practitionerId: (myEmployee as any)?.userId ?? "",
      practitionerRole: newForm.practitionerRole,
      physiotherapistId: newForm.physiotherapistId || undefined,
      appointmentType: newForm.appointmentType,
      startTime: startISO,
      endTime: endISO,
      notes: newForm.notes || undefined,
    });
    setNewApptOpen(false);
    setSelectedDate(newForm.date);
    setPatientSearch("");
    setSelectedPatientLabel("");
    setNewForm({ patientId: "", appointmentType: "ASSESSMENT", practitionerRole: "PROSTHETIST", physiotherapistId: "", date: toISO(today), startTime: "09:00", endTime: "09:30", notes: "" });
  };

  // Build calendar grid
  const firstDayOfWeek = startOfMonth(viewYear, viewMonth).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          myJobTitleCode !== "VTX-JTL-000011" ? (
            <Button onClick={() => setNewApptOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("newAppointment")}
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
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
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-6">
        {/* Calendar */}
        <Card className="w-full md:w-80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronRight className="h-4 w-4" /></Button>
              <span className="font-semibold text-sm">
            {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(viewYear, viewMonth))}
          </span>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d.slice(0, 1)}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-px">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === toISO(today);
                const isSelected = dateStr === selectedDate;
                const hasAppts = (apptsByDate[dateStr]?.length ?? 0) > 0;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "relative flex flex-col items-center justify-center h-9 w-full rounded text-sm transition-colors",
                      isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted",
                    )}
                  >
                    {day}
                    {hasAppts && !isSelected && (
                      <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day view */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : dayAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>{t("emptyDay")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayAppointments
                  .sort((a: Appointment, b: Appointment) => a.startTime.localeCompare(b.startTime))
                  .map((appt: Appointment) => (
                    <div key={appt.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="text-center min-w-14 shrink-0">
                        <p className="font-mono text-sm font-bold">
                          {appt.startTime?.length > 5 ? new Date(appt.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : appt.startTime}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {appt.endTime?.length > 5 ? new Date(appt.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : appt.endTime}
                        </p>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {appt.patient
                              ? `${appt.patient.firstName} ${appt.patient.lastName}`
                              : appt.patientName || "—"}
                          </span>
                          <Badge className={cn("text-xs", STATUS_COLOR[appt.status])} variant="outline">
                            {t(`statuses.${appt.status}`)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{t(`types.${appt.appointmentType}`)}</Badge>
                        </div>
                        {appt.notes && <p className="text-xs text-muted-foreground">{appt.notes}</p>}
                        {appt.status === "CANCELLED" && (appt.cancelReason || appt.cancelledReason) && (
                          <p className="text-xs text-destructive/80">
                            {t("cancelReason")}: {appt.cancelReason ?? appt.cancelledReason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {appt.status === "SCHEDULED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "CONFIRMED" })}>
                            {t("actions.confirm")}
                          </Button>
                        )}
                        {appt.status === "CONFIRMED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "COMPLETED" })}>
                            {t("actions.complete")}
                          </Button>
                        )}
                        {!["CANCELLED", "COMPLETED"].includes(appt.status) && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => { setCancelTargetId(appt.id); setCancelReason(""); setCancelDialogOpen(true); }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel appointment dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(o) => { if (!cancelAppt.isPending) setCancelDialogOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("actions.cancelConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("actions.cancelReasonPlaceholder")}
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelAppt.isPending}>
              {t("form.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={cancelAppt.isPending}
              onClick={async () => {
                await cancelAppt.mutateAsync({ id: cancelTargetId, reason: cancelReason.trim() || undefined });
                setCancelDialogOpen(false);
              }}
            >
              {cancelAppt.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t("actions.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New appointment dialog */}
      <Dialog open={newApptOpen} onOpenChange={setNewApptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("form.patient")} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t("form.searchPatient")}
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setNewForm((f) => ({ ...f, patientId: "" }));
                    setSelectedPatientLabel("");
                    setPatientPopoverOpen(true);
                  }}
                  onFocus={() => setPatientPopoverOpen(true)}
                  onBlur={() => setTimeout(() => setPatientPopoverOpen(false), 150)}
                  className="pl-9"
                />
                {selectedPatientLabel && (
                  <div className="mt-1 flex items-center gap-2 rounded-md border bg-primary/5 px-3 py-1.5">
                    <UserRound className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-primary">{selectedPatientLabel}</span>
                    <button
                      type="button"
                      className="mr-auto text-muted-foreground hover:text-destructive"
                      onClick={() => { setSelectedPatientLabel(""); setPatientSearch(""); setNewForm((f) => ({ ...f, patientId: "" })); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {patientPopoverOpen && patientsList.length > 0 && !selectedPatientLabel && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    <div className="max-h-52 overflow-y-auto py-1">
                      {patientsList.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-right hover:bg-accent transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setNewForm((f) => ({ ...f, patientId: p.id }));
                            setSelectedPatientLabel(`${p.firstName} ${p.lastName}`);
                            setPatientSearch("");
                            setPatientPopoverOpen(false);
                          }}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-sm font-medium truncate">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{p.patientNumber}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("form.appointmentType")}</Label>
                <Select value={newForm.appointmentType} onValueChange={(v) => setNewForm((f) => ({ ...f, appointmentType: v as AppointmentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["ASSESSMENT", "FITTING", "SESSION", "FOLLOW_UP", "COMMITTEE", "EXAMINATION"] as AppointmentType[]).map((k) => (
                      <SelectItem key={k} value={k}>{t(`types.${k}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.practitionerRole")}</Label>
                <Select value={newForm.practitionerRole} onValueChange={(v) => setNewForm((f) => ({ ...f, practitionerRole: v as PractitionerRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["PROSTHETIST", "PHYSIOTHERAPIST", "DOCTOR", "TECHNICIAN"] as PractitionerRole[]).map((k) => (
                      <SelectItem key={k} value={k}>{t(`roles.${k}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newForm.practitionerRole === "PHYSIOTHERAPIST" && (
              <div className="space-y-1.5">
                <Label>{t("form.physiotherapistId")}</Label>
                <Select
                  value={newForm.physiotherapistId}
                  onValueChange={(v) => setNewForm((f) => ({ ...f, physiotherapistId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("form.physiotherapistIdPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {physioEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstNameAr} {emp.lastNameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("form.date")}</Label>
              <Input type="date" value={newForm.date} onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("form.startTime")}</Label>
                <Input type="time" value={newForm.startTime} onChange={(e) => setNewForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.endTime")}</Label>
                <Input type="time" value={newForm.endTime} onChange={(e) => setNewForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.notes")}</Label>
              <Textarea rows={2} value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewApptOpen(false)}>{t("form.cancel")}</Button>
            <Button onClick={handleCreateAppt} disabled={!newForm.patientId || !(myEmployee as any)?.userId || createAppt.isPending}>
              {createAppt.isPending ? t("form.saving") : t("form.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
