"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Loader2, UserRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AppointmentTimeline } from "@/components/clinic/appointment-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useClinicAppointments, useClinicCalendar, useCreateAppointment, useCancelAppointment, useUpdateAppointmentStatus, useRescheduleAppointment } from "@/lib/hooks/use-clinic-appointments";
import { Appointment, AppointmentType, AppointmentStatus } from "@/lib/api/clinic-appointments";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { useProstheticsCasesByPatient } from "@/lib/hooks/use-clinic-prosthetics";
import { useMyEmployee, useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-departments";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

// Clinical departments whose staff can be assigned as the specialist therapist
// (both spellings — with and without hamza — are accepted).
const CLINICAL_DEPTS = [
  "الإدارة الطبية", "الادارة الطبية",
  "الأطراف الصناعية", "الاطراف الصناعية",
  "طب الأقدام", "طب الاقدام",
  "العلاج الفيزيائي",
];

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
  const { hasPermission, isAdmin } = usePermissions();
  const canCreateAppt = isAdmin() || hasPermission(PERMISSIONS.CLINIC_APPOINTMENTS.CREATE);
  const { data: depsData } = useDepartments({ limit: 200 }, 30 * 60 * 1000);
  const departments: { id: string; nameAr: string; nameEn?: string }[] =
    (depsData as any)?.data?.items ?? (depsData as any)?.items ?? [];
  // The department picker/filter only offers the clinical departments:
  // Physiotherapy and Prosthetics & Podiatry (both spellings accepted).
  const APPT_DEPT_NAMES = ["العلاج الفيزيائي", "الأطراف الصناعية", "الاطراف الصناعية", "طب الأقدام", "طب الاقدام"];
  const clinicDepartments = departments.filter((dep) =>
    APPT_DEPT_NAMES.some((n) => dep.nameAr?.includes(n)),
  );
  const deptLabel = (id: string) => {
    const dep = departments.find((x) => x.id === id);
    return dep ? (locale === "ar" ? dep.nameAr : (dep.nameEn ?? dep.nameAr)) : id;
  };
  // Specialist-therapist pool: active staff across all clinical departments.
  const { data: staffData } = useEmployeesBasicList();
  const staffList: any[] = Array.isArray(staffData)
    ? staffData
    : (staffData as any)?.data?.items ?? (staffData as any)?.items ?? [];
  const clinicalStaff = staffList.filter(
    (e: any) => e.employmentStatus === "ACTIVE" && CLINICAL_DEPTS.some((d) => e.department?.nameAr?.includes(d)),
  );
  const therapistLabel = (id: string) => {
    const e = clinicalStaff.find((x: any) => (x.userId ?? x.id) === id);
    return e ? `${e.firstNameAr} ${e.lastNameAr}` : id;
  };
  // Resolve any staff member (practitioner / therapist) by their user or employee
  // id — the appointment API returns only ids, not the person objects.
  const staffName = (id?: string | null): string | null => {
    if (!id) return null;
    const e = staffList.find((x: any) => x.userId === id || x.id === id);
    return e ? `${e.firstNameAr} ${e.lastNameAr}`.trim() : null;
  };
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toISO(today));
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleFor, setRescheduleFor] = useState<Appointment | null>(null);
  const [rsForm, setRsForm] = useState({ date: "", startTime: "", endTime: "" });
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientLabel, setSelectedPatientLabel] = useState("");
  const [newForm, setNewForm] = useState({
    patientId: "",
    appointmentType: "ASSESSMENT" as AppointmentType,
    departmentId: "",
    therapistIds: [] as string[],
    date: toISO(today), startTime: "09:00", endTime: "09:30", notes: "",
  });

  // Calendar range: first and last day of viewed month
  const from = toISO(startOfMonth(viewYear, viewMonth));
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const to = toISO(lastDay);

  const { data: calendarAppts = [], isLoading: calLoading } = useClinicCalendar(from, to);
  const { data: dayData, isLoading: dayLoading } = useClinicAppointments({
    limit: 500,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    departmentId: departmentFilter !== "ALL" ? departmentFilter : undefined,
  });
  const { data: patientsData } = useClinicPatients({ search: patientSearch, limit: 50 });
  const createAppt = useCreateAppointment();
  const cancelAppt = useCancelAppointment();
  const updateStatus = useUpdateAppointmentStatus();
  const rescheduleAppt = useRescheduleAppointment();

  const patientsList = patientsData?.items ?? [];

  // Once a patient is picked, silently look up their prosthetics case and, if an
  // active one exists, attach caseId + caseType to the appointment behind the
  // scenes so confirming it auto-creates a session. Reception never sees this.
  const { data: patientCases } = useProstheticsCasesByPatient(newForm.patientId);
  // Newest active case (createdAt DESC) — the technician usually works on the
  // patient's most recently opened case.
  const activeProstheticsCase = (patientCases ?? [])
    .filter((c) => c.status !== "CLOSED" && c.status !== "CANCELLED")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const dayAppointments = dayData?.items ?? [];

  // ── Department board (selected day, split by clinical department) ──────────
  const deptNameOf = (a: Appointment) =>
    a.department?.nameAr ?? (a.departmentId ? (departments.find((x) => x.id === a.departmentId)?.nameAr ?? "") : "");
  const isSelectedDay = (a: Appointment) => {
    if (a.startTime && a.startTime.length > 5) {
      const dt = new Date(a.startTime);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      return iso === selectedDate;
    }
    return a.date === selectedDate;
  };
  const dayScoped = dayAppointments.filter(isSelectedDay);
  const isPhysio = (n: string) => n.includes("العلاج الفيزيائي");
  const isProsth = (n: string) =>
    n.includes("الأطراف الصناعية") || n.includes("الاطراف الصناعية") || n.includes("طب الأقدام") || n.includes("طب الاقدام");
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isSelectedToday = selectedDate === todayIso;
  const timelineGroups = [
    { title: t("board.physioDept"), color: "#10b981", appointments: dayScoped.filter((a: Appointment) => isPhysio(deptNameOf(a))) },
    { title: t("board.prosthDept"), color: "#6366f1", appointments: dayScoped.filter((a: Appointment) => isProsth(deptNameOf(a))) },
  ];

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
      appointmentType: newForm.appointmentType,
      departmentId: newForm.departmentId || undefined,
      startTime: startISO,
      endTime: endISO,
      notes: newForm.notes || undefined,
      therapistIds: newForm.therapistIds.length ? newForm.therapistIds : undefined,
      // Auto-linked prosthetics case (hidden from reception). Omitted when the
      // patient has no active case → no auto-session is created.
      ...(activeProstheticsCase
        ? { caseId: activeProstheticsCase.id, caseType: "PROSTHETICS" as const }
        : {}),
    });
    // New appointments start as SCHEDULED (مجدول); confirmed manually afterwards.
    setNewApptOpen(false);
    setSelectedDate(newForm.date);
    setPatientSearch("");
    setSelectedPatientLabel("");
    setNewForm({ patientId: "", appointmentType: "ASSESSMENT", departmentId: "", therapistIds: [], date: toISO(today), startTime: "09:00", endTime: "09:30", notes: "" });
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
          canCreateAppt ? (
            <Button onClick={() => setNewApptOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("newAppointment")}
            </Button>
          ) : undefined
        }
      />

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
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filter.allDepartments")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filter.allDepartments")}</SelectItem>
            {clinicDepartments.map((dep) => (
              <SelectItem key={dep.id} value={dep.id}>
                {locale === "ar" ? dep.nameAr : (dep.nameEn ?? dep.nameAr)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-6">
        {/* Calendar */}
        <Card className="w-full md:w-80">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap gap-2 items-center justify-between">
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

        {/* Day view — professional timeline */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </h2>
            <span className="text-xs text-muted-foreground">{dayScoped.filter((a: Appointment) => a.status !== "CANCELLED").length} {t("board.appointments")}</span>
          </div>
          {dayLoading ? (
            <Skeleton className="h-[560px] w-full rounded-xl" />
          ) : (
            /* Two department columns beside a 56px time gutter don't fit a phone. */
            <div className="overflow-x-auto">
            <div className="min-w-[520px] sm:min-w-0">
            <AppointmentTimeline
              groups={timelineGroups}
              isToday={isSelectedToday}
              onSelect={setDetailAppt}
              resolveTherapist={(a) => {
                if (a.therapists?.length) {
                  return a.therapists
                    .map((tp) => `${tp.firstNameAr ?? tp.firstName ?? ""} ${tp.lastNameAr ?? tp.lastName ?? ""}`.trim())
                    .filter(Boolean)
                    .join("، ") || null;
                }
                return (a.therapistIds ?? []).map((id) => staffName(id)).filter(Boolean).join("، ") || null;
              }}
            />
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Appointment details dialog */}
      <Dialog open={!!detailAppt} onOpenChange={(o) => { if (!o) setDetailAppt(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الموعد</DialogTitle>
          </DialogHeader>
          {detailAppt && (() => {
            const fmtT = (v?: string | null) => v ? (v.length > 5 ? new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : v) : "—";
            const dateStr = detailAppt.startTime && detailAppt.startTime.length > 5
              ? new Date(detailAppt.startTime).toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : (detailAppt.date ?? "—");
            // Compute the real duration from start/end — the backend's
            // durationMinutes is unreliable (often a fixed 60).
            const durMin = detailAppt.startTime && detailAppt.endTime && detailAppt.startTime.length > 5 && detailAppt.endTime.length > 5
              ? Math.round((new Date(detailAppt.endTime).getTime() - new Date(detailAppt.startTime).getTime()) / 60000)
              : (detailAppt.durationMinutes ?? null);
            const rows: [string, ReactNode][] = [
              ["المريض", detailAppt.patient ? `${detailAppt.patient.firstName} ${detailAppt.patient.lastName}` : (detailAppt.patientName || "—")],
              ["رقم المريض", detailAppt.patientNumber ?? detailAppt.patient?.patientNumber ?? "—"],
              ["نوع الموعد", t(`types.${detailAppt.appointmentType}`)],
              ["الحالة", <Badge key="s" className={cn("text-xs", STATUS_COLOR[detailAppt.status])} variant="outline">{t(`statuses.${detailAppt.status}`)}</Badge>],
              ["التاريخ", dateStr],
              ["الوقت", `${fmtT(detailAppt.startTime)} — ${fmtT(detailAppt.endTime)}`],
              ["المدة", durMin != null && durMin > 0 ? `${durMin} دقيقة` : "—"],
              ["القسم", detailAppt.department?.nameAr ?? (detailAppt.departmentId ? deptLabel(detailAppt.departmentId) : "—")],
              ["ملاحظات", detailAppt.notes || "—"],
            ];
            const therapistNames = (detailAppt.therapists?.length
              ? detailAppt.therapists.map((tp) => `${tp.firstNameAr ?? tp.firstName ?? ""} ${tp.lastNameAr ?? tp.lastName ?? ""}`.trim())
              : (detailAppt.therapistIds ?? []).map((id) => staffName(id)))
              .filter((x): x is string => !!x);
            if (therapistNames.length) {
              rows.push(["المختص/المعالج", therapistNames.join("، ")]);
            }
            if (detailAppt.status === "CANCELLED" && (detailAppt.cancelReason || detailAppt.cancelledReason)) {
              rows.push(["سبب الإلغاء", detailAppt.cancelReason ?? detailAppt.cancelledReason ?? "—"]);
            }
            rows.push(["تاريخ الإنشاء", detailAppt.createdAt ? new Date(detailAppt.createdAt).toLocaleString("en-GB") : "—"]);
            return (
              <dl className="divide-y text-sm">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-start justify-between gap-3 py-2">
                    <dt className="text-muted-foreground shrink-0">{label}</dt>
                    <dd className="font-medium text-left">{value}</dd>
                  </div>
                ))}
              </dl>
            );
          })()}
          <DialogFooter className="flex-wrap items-center gap-2 sm:justify-start">
            {detailAppt && detailAppt.status !== "CANCELLED" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{t("actions.changeStatus")}</span>
                <Select
                  value={detailAppt.status}
                  onValueChange={(v) => {
                    const next = v as AppointmentStatus;
                    if (next === detailAppt.status) return;
                    if (next === "CANCELLED") {
                      setCancelTargetId(detailAppt.id); setCancelReason(""); setCancelDialogOpen(true);
                      setDetailAppt(null);
                    } else if (next === "RESCHEDULED") {
                      // Real reschedule → pick a new date/time (prefilled with current).
                      const s = detailAppt.startTime, e = detailAppt.endTime;
                      const pad = (n: number) => String(n).padStart(2, "0");
                      const dObj = s && s.length > 5 ? new Date(s) : null;
                      const eObj = e && e.length > 5 ? new Date(e) : null;
                      setRsForm({
                        date: dObj ? `${dObj.getFullYear()}-${pad(dObj.getMonth() + 1)}-${pad(dObj.getDate())}` : (detailAppt.date ?? ""),
                        startTime: dObj ? `${pad(dObj.getHours())}:${pad(dObj.getMinutes())}` : "",
                        endTime: eObj ? `${pad(eObj.getHours())}:${pad(eObj.getMinutes())}` : "",
                      });
                      setRescheduleFor(detailAppt);
                      setDetailAppt(null);
                    } else {
                      updateStatus.mutate({ id: detailAppt.id, status: next });
                      setDetailAppt(null);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "RESCHEDULED", "CANCELLED"] as AppointmentStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{t(`statuses.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="outline" className="ms-auto" onClick={() => setDetailAppt(null)}>{t("form.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Reschedule appointment dialog */}
      <Dialog open={!!rescheduleFor} onOpenChange={(o) => { if (!o && !rescheduleAppt.isPending) setRescheduleFor(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t("actions.rescheduleTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("form.date")}</Label>
              <Input type="date" value={rsForm.date} onChange={(e) => setRsForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("form.startTime")}</Label>
                <Input type="time" value={rsForm.startTime} onChange={(e) => setRsForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.endTime")}</Label>
                <Input type="time" value={rsForm.endTime} onChange={(e) => setRsForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRescheduleFor(null)} disabled={rescheduleAppt.isPending}>
              {t("form.cancel")}
            </Button>
            <Button
              disabled={rescheduleAppt.isPending || !rsForm.date || !rsForm.startTime || !rsForm.endTime}
              onClick={async () => {
                if (!rescheduleFor) return;
                const startISO = new Date(`${rsForm.date}T${rsForm.startTime}:00`).toISOString();
                const endISO = new Date(`${rsForm.date}T${rsForm.endTime}:00`).toISOString();
                await rescheduleAppt.mutateAsync({ id: rescheduleFor.id, dto: { date: rsForm.date, startTime: startISO, endTime: endISO } });
                setRescheduleFor(null);
              }}
            >
              {rescheduleAppt.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t("actions.rescheduleConfirm")}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>{t("form.department")}</Label>
                <Select value={newForm.departmentId} onValueChange={(v) => setNewForm((f) => ({ ...f, departmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("form.departmentPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {clinicDepartments.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {locale === "ar" ? dep.nameAr : (dep.nameEn ?? dep.nameAr)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Specialist therapists — one or more, from any clinical department;
                each gets notified of the appointment. */}
            <div className="space-y-1.5">
              <Label>{t("form.specialistTherapist")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-auto min-h-10 py-2">
                    <span className={cn("truncate text-start", newForm.therapistIds.length === 0 && "text-muted-foreground")}>
                      {newForm.therapistIds.length
                        ? newForm.therapistIds.map(therapistLabel).join("، ")
                        : t("form.specialistTherapistPlaceholder")}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-1" align="start">
                  {clinicalStaff.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">—</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {clinicalStaff.map((emp: any) => {
                        const val = emp.userId ?? emp.id;
                        const active = newForm.therapistIds.includes(val);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() =>
                              setNewForm((f) => ({
                                ...f,
                                therapistIds: active
                                  ? f.therapistIds.filter((x) => x !== val)
                                  : [...f.therapistIds, val],
                              }))
                            }
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-start"
                          >
                            <Checkbox checked={active} className="pointer-events-none" />
                            <span className="flex-1 truncate">{emp.firstNameAr} {emp.lastNameAr}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.date")}</Label>
              <Input type="date" value={newForm.date} onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
