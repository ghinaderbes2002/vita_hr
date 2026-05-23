"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, Clock, X, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useClinicAppointments, useClinicCalendar, useCreateAppointment, useCancelAppointment, useUpdateAppointmentStatus } from "@/lib/hooks/use-clinic-appointments";
import { Appointment, AppointmentType, AppointmentStatus, PractitionerRole } from "@/lib/api/clinic-appointments";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { useAuthStore } from "@/lib/stores/auth-store";

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
  const currentUser = useAuthStore((s) => s.user);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toISO(today));
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientLabel, setSelectedPatientLabel] = useState("");
  const [newForm, setNewForm] = useState({
    patientId: "",
    appointmentType: "ASSESSMENT" as AppointmentType,
    practitionerRole: "PROSTHETIST" as PractitionerRole,
    date: toISO(today), startTime: "09:00", endTime: "09:30", notes: "",
  });

  // Calendar range: first and last day of viewed month
  const from = toISO(startOfMonth(viewYear, viewMonth));
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const to = toISO(lastDay);

  const { data: calendarAppts = [], isLoading: calLoading } = useClinicCalendar(from, to);
  const { data: dayData, isLoading: dayLoading } = useClinicAppointments({ date: selectedDate, limit: 50 });
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
      practitionerId: currentUser?.id ?? "",
      practitionerRole: newForm.practitionerRole,
      appointmentType: newForm.appointmentType,
      startTime: startISO,
      endTime: endISO,
      notes: newForm.notes || undefined,
    });
    setNewApptOpen(false);
    setSelectedDate(newForm.date);
    setPatientSearch("");
    setSelectedPatientLabel("");
    setNewForm({ patientId: "", appointmentType: "ASSESSMENT", practitionerRole: "PROSTHETIST", date: toISO(today), startTime: "09:00", endTime: "09:30", notes: "" });
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
          <Button onClick={() => setNewApptOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newAppointment")}
          </Button>
        }
      />

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
                            {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "—"}
                          </span>
                          <Badge className={cn("text-xs", STATUS_COLOR[appt.status])} variant="outline">
                            {t(`statuses.${appt.status}`)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{t(`types.${appt.appointmentType}`)}</Badge>
                        </div>
                        {appt.notes && <p className="text-xs text-muted-foreground">{appt.notes}</p>}
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
                            onClick={() => cancelAppt.mutate({ id: appt.id })}>
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

      {/* New appointment dialog */}
      <Dialog open={newApptOpen} onOpenChange={setNewApptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("form.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("form.patient")} <span className="text-destructive">*</span></Label>
              <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedPatientLabel || t("form.patientPlaceholder")}
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 mr-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t("form.searchPatient")}
                      value={patientSearch}
                      onValueChange={setPatientSearch}
                    />
                    <CommandList>
                      <CommandEmpty>{t("form.noResults")}</CommandEmpty>
                      <CommandGroup>
                        {patientsList.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.firstName} ${p.lastName} ${p.patientNumber}`}
                            onSelect={() => {
                              setNewForm((f) => ({ ...f, patientId: p.id }));
                              setSelectedPatientLabel(`${p.firstName} ${p.lastName} — ${p.patientNumber}`);
                              setPatientPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("h-4 w-4 ml-2 shrink-0", newForm.patientId === p.id ? "opacity-100" : "opacity-0")} />
                            <div>
                              <p className="font-medium">{p.firstName} {p.lastName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{p.patientNumber}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("form.appointmentType")}</Label>
                <Select value={newForm.appointmentType} onValueChange={(v) => setNewForm((f) => ({ ...f, appointmentType: v as AppointmentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["ASSESSMENT", "FITTING", "SESSION", "FOLLOW_UP", "COMMITTEE"] as AppointmentType[]).map((k) => (
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
                    {(["PROSTHETIST", "PHYSIOTHERAPIST", "DOCTOR", "NURSE"] as PractitionerRole[]).map((k) => (
                      <SelectItem key={k} value={k}>{t(`roles.${k}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <Button onClick={handleCreateAppt} disabled={!newForm.patientId || createAppt.isPending}>
              {createAppt.isPending ? t("form.saving") : t("form.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
