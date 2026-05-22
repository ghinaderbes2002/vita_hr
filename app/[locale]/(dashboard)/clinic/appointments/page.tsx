"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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

const TYPE_LABEL: Record<AppointmentType, string> = {
  ASSESSMENT: "تقييم",
  FITTING: "تركيب",
  SESSION: "جلسة",
  FOLLOW_UP: "متابعة",
  COMMITTEE: "لجنة",
};

const ROLE_LABEL: Record<PractitionerRole, string> = {
  PROSTHETIST: "أخصائي أطراف",
  PHYSIOTHERAPIST: "أخصائي فيزيائي",
  DOCTOR: "طبيب",
  NURSE: "ممرض",
};

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "مجدول",
  CONFIRMED: "مؤكد",
  COMPLETED: "منجز",
  CANCELLED: "ملغى",
  NO_SHOW: "لم يحضر",
};

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

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
        title="المواعيد"
        description="جدولة ومتابعة مواعيد العيادة"
        actions={
          <Button onClick={() => setNewApptOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            موعد جديد
          </Button>
        }
      />

      <div className="grid md:grid-cols-[auto_1fr] gap-6">
        {/* Calendar */}
        <Card className="w-full md:w-80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronRight className="h-4 w-4" /></Button>
              <span className="font-semibold text-sm">{MONTH_NAMES[viewMonth]} {viewYear}</span>
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
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : dayAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>لا توجد مواعيد في هذا اليوم</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayAppointments
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((appt: Appointment) => (
                    <div key={appt.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="text-center min-w-12.5">
                        <p className="font-mono text-sm font-bold">{appt.startTime}</p>
                        <p className="font-mono text-xs text-muted-foreground">{appt.endTime}</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "—"}
                          </span>
                          <Badge className={cn("text-xs", STATUS_COLOR[appt.status])} variant="outline">
                            {STATUS_LABEL[appt.status]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{TYPE_LABEL[appt.appointmentType]}</Badge>
                        </div>
                        {appt.notes && <p className="text-xs text-muted-foreground">{appt.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        {appt.status === "SCHEDULED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "confirm" })}>
                            تأكيد
                          </Button>
                        )}
                        {appt.status === "CONFIRMED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateStatus.mutate({ id: appt.id, status: "complete" })}>
                            إنجاز
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
            <DialogTitle>موعد جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>المريض <span className="text-destructive">*</span></Label>
              <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedPatientLabel || "اختر المريض..."}
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 mr-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="ابحث بالاسم أو رقم الهوية..."
                      value={patientSearch}
                      onValueChange={setPatientSearch}
                    />
                    <CommandList>
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
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
                <Label>نوع الموعد</Label>
                <Select value={newForm.appointmentType} onValueChange={(v) => setNewForm((f) => ({ ...f, appointmentType: v as AppointmentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>دور المختص</Label>
                <Select value={newForm.practitionerRole} onValueChange={(v) => setNewForm((f) => ({ ...f, practitionerRole: v as PractitionerRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>التاريخ</Label>
              <Input type="date" value={newForm.date} onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>وقت البداية</Label>
                <Input type="time" value={newForm.startTime} onChange={(e) => setNewForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>وقت النهاية</Label>
                <Input type="time" value={newForm.endTime} onChange={(e) => setNewForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewApptOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateAppt} disabled={!newForm.patientId || createAppt.isPending}>
              {createAppt.isPending ? "جاري الحفظ..." : "إنشاء الموعد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
