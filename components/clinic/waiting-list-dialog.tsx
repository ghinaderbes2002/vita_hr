"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  WaitingArrivalMethod, WaitingListEntry, WaitingStatus,
} from "@/lib/api/clinic-waiting-list";
import { ALL_APPOINTMENT_TYPES, type AppointmentType } from "@/lib/api/clinic-appointments";

/** The retired types stay readable on old records but are not offered for new ones. */
export const WAITING_APPOINTMENT_TYPES = ALL_APPOINTMENT_TYPES.filter(
  (t) => !["FITTING", "COMMITTEE", "EXAMINATION"].includes(t),
);

const ARRIVAL_METHODS: { value: WaitingArrivalMethod; label: string }[] = [
  { value: "SOCIAL_MEDIA", label: "مواقع التواصل" },
  { value: "HOSPITAL",     label: "مشفى" },
  { value: "DOCTOR",       label: "طبيب" },
  { value: "ASSOCIATION",  label: "مشروع" },
  { value: "FRIEND",       label: "صديق" },
  { value: "STAFF",        label: "موظف" },
];

export const WAITING_STATUSES: { value: WaitingStatus; label: string }[] = [
  { value: "WAITING",        label: "قيد الانتظار" },
  { value: "SCHEDULED",      label: "تم الجدولة" },
  { value: "NOT_SCHEDULED",  label: "لم يتم الجدولة" },
];

/** 5 is the most urgent. Spelled out so nobody has to guess the direction. */
export const PRIORITIES = [
  { value: 5, label: "5 — عاجل جداً" },
  { value: 4, label: "4 — عاجل" },
  { value: 3, label: "3 — متوسط" },
  { value: 2, label: "2 — منخفض" },
  { value: 1, label: "1 — الأقل" },
];

/** Radix rejects an empty option value, so "unspecified" needs a sentinel. */
const NONE = "__none__";

const emptyForm = {
  patientName: "",
  gender: "" as "" | "MALE" | "FEMALE",
  age: "",
  arrivalMethod: NONE,
  appointmentType: "" as AppointmentType | "",
  contactNumber: "",
  priority: "3",
  notes: "",
  status: "WAITING" as WaitingStatus,
};

export function WaitingListDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; `status` is only offered in that case. */
  entry?: WaitingListEntry | null;
  onSubmit: (dto: Record<string, any>) => void;
  isPending?: boolean;
}) {
  const tAppt = useTranslations("clinic.appointments");
  const [form, setForm] = useState(emptyForm);
  const isEdit = !!entry;
  // An entry from before appointmentType existed carries only free text. It
  // stays valid as it is; picking a type replaces it from then on.
  const legacyService = !entry?.appointmentType ? entry?.serviceType?.trim() || "" : "";
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // Load the record on open, and clear it again for the next "add".
  useEffect(() => {
    if (!open) return;
    setForm(entry
      ? {
          patientName: entry.patientName ?? "",
          gender: entry.gender,
          age: entry.age != null ? String(entry.age) : "",
          arrivalMethod: entry.arrivalMethod ?? NONE,
          appointmentType: entry.appointmentType ?? "",
          contactNumber: entry.contactNumber ?? "",
          priority: String(entry.priority ?? 3),
          notes: entry.notes ?? "",
          status: entry.status,
        }
      : emptyForm);
  }, [open, entry]);

  const missing =
    !form.patientName.trim() || !form.gender || (!form.appointmentType && !legacyService) ||
    !form.contactNumber.trim() || !form.priority;

  const handleSubmit = () => {
    if (missing) return;
    const age = form.age.trim() ? Number(form.age) : undefined;
    onSubmit({
      patientName: form.patientName.trim(),
      gender: form.gender,
      // An unparseable age is dropped rather than sent as NaN.
      ...(age != null && !Number.isNaN(age) ? { age } : {}),
      ...(form.arrivalMethod !== NONE ? { arrivalMethod: form.arrivalMethod } : {}),
      // New entries send the type only; an untouched legacy entry keeps its serviceType.
      ...(form.appointmentType ? { appointmentType: form.appointmentType } : {}),
      contactNumber: form.contactNumber.trim(),
      priority: Number(form.priority),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      // Creation has no status field — the server starts every entry as WAITING.
      ...(isEdit ? { status: form.status } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل سجل قائمة الانتظار" : "إضافة إلى قائمة الانتظار"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>اسم المريض <span className="text-destructive">*</span></Label>
              <Input value={form.patientName} onChange={(e) => set({ patientName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الجنس <span className="text-destructive">*</span></Label>
              <Select value={form.gender || undefined} onValueChange={(v) => set({ gender: v as any })}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">ذكر</SelectItem>
                  <SelectItem value="FEMALE">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>العمر</Label>
              <Input type="number" min={0} max={120} inputMode="numeric"
                value={form.age} onChange={(e) => set({ age: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>طريقة الوصول</Label>
              <Select value={form.arrivalMethod} onValueChange={(v) => set({ arrivalMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدد</SelectItem>
                  {ARRIVAL_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>الخدمة المطلوبة <span className="text-destructive">*</span></Label>
              <Select value={form.appointmentType || undefined}
                onValueChange={(v) => set({ appointmentType: v as AppointmentType })}>
                <SelectTrigger className="w-full min-w-0 *:data-[slot=select-value]:block! *:data-[slot=select-value]:truncate">
                  <SelectValue placeholder="اختر نوع الموعد..." />
                </SelectTrigger>
                <SelectContent>
                  {/* A retired type already on the record stays selectable. */}
                  {(form.appointmentType && !WAITING_APPOINTMENT_TYPES.includes(form.appointmentType)
                    ? [form.appointmentType, ...WAITING_APPOINTMENT_TYPES]
                    : WAITING_APPOINTMENT_TYPES
                  ).map((k) => (
                    <SelectItem key={k} value={k}>{tAppt(`types.${k}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {legacyService && !form.appointmentType && (
                <p className="text-xs text-muted-foreground">
                  الخدمة المسجّلة سابقاً: <span className="font-medium text-foreground">{legacyService}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>رقم التواصل <span className="text-destructive">*</span></Label>
              <Input dir="ltr" value={form.contactNumber}
                onChange={(e) => set({ contactNumber: e.target.value })} placeholder="09xxxxxxxx" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>الأولوية <span className="text-destructive">*</span></Label>
              <Select value={form.priority} onValueChange={(v) => set({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => set({ status: v as WaitingStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WAITING_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={missing || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {isEdit ? "حفظ" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
