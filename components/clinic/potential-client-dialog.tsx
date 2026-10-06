"use client";

import { useEffect, useState } from "react";
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
  PotentialClient, PotentialClientArrivalMethod,
} from "@/lib/api/clinic-potential-clients";

export const POTENTIAL_CLIENT_ARRIVAL_METHODS: { value: PotentialClientArrivalMethod; label: string }[] = [
  { value: "SOCIAL_MEDIA", label: "مواقع التواصل" },
  { value: "HOSPITAL",     label: "مشفى" },
  { value: "DOCTOR",       label: "طبيب" },
  { value: "ASSOCIATION",  label: "مشروع" },
  { value: "FRIEND",       label: "صديق" },
  { value: "STAFF",        label: "موظف" },
];

/** Radix rejects an empty option value, so "unspecified" needs a sentinel. */
const NONE = "__none__";

const emptyForm = {
  patientName: "",
  gender: "" as "" | "MALE" | "FEMALE",
  age: "",
  arrivalMethod: NONE,
  interestedService: "",
  contactNumber: "",
  notes: "",
};

type FormState = typeof emptyForm;

const formOf = (c: PotentialClient): FormState => ({
  patientName: c.patientName ?? "",
  gender: c.gender,
  age: c.age != null ? String(c.age) : "",
  arrivalMethod: c.arrivalMethod ?? NONE,
  interestedService: c.interestedService ?? "",
  contactNumber: c.contactNumber ?? "",
  notes: c.notes ?? "",
});

/** The form as the API wants it; optional fields left blank are omitted. */
const toDto = (f: FormState): Record<string, unknown> => {
  const age = f.age.trim() ? Number(f.age) : undefined;
  return {
    patientName: f.patientName.trim(),
    gender: f.gender,
    // An unparseable age is dropped rather than sent as NaN.
    ...(age != null && !Number.isNaN(age) ? { age } : {}),
    ...(f.arrivalMethod !== NONE ? { arrivalMethod: f.arrivalMethod } : {}),
    interestedService: f.interestedService.trim(),
    contactNumber: f.contactNumber.trim(),
    ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
  };
};

export function PotentialClientDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  client?: PotentialClient | null;
  /** On edit, receives only the fields that changed — possibly none. */
  onSubmit: (dto: Record<string, unknown>) => void;
  isPending?: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const isEdit = !!client;
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Load the record on open, and clear it again for the next "add".
  useEffect(() => {
    if (!open) return;
    setForm(client ? formOf(client) : emptyForm);
  }, [open, client]);

  const missing =
    !form.patientName.trim() || !form.gender ||
    !form.interestedService.trim() || !form.contactNumber.trim();

  const handleSubmit = () => {
    if (missing) return;
    const next = toDto(form);
    if (!client) { onSubmit(next); return; }
    // PUT takes only what changed. An optional field the user cleared is not
    // sent — the API has no documented way to blank one.
    const prev = toDto(formOf(client));
    onSubmit(Object.fromEntries(Object.entries(next).filter(([k, v]) => prev[k] !== v)));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل عميل محتمل" : "إضافة عميل محتمل"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>اسم المريض <span className="text-destructive">*</span></Label>
              <Input value={form.patientName} onChange={(e) => set({ patientName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>الجنس <span className="text-destructive">*</span></Label>
              <Select value={form.gender || undefined} onValueChange={(v) => set({ gender: v as "MALE" | "FEMALE" })}>
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
                  {POTENTIAL_CLIENT_ARRIVAL_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>خدمة مهتم بها <span className="text-destructive">*</span></Label>
              <Input value={form.interestedService} onChange={(e) => set({ interestedService: e.target.value })}
                placeholder="مثال: طرف صناعي" />
            </div>
            <div className="space-y-1.5">
              <Label>رقم التواصل <span className="text-destructive">*</span></Label>
              <Input dir="ltr" value={form.contactNumber}
                onChange={(e) => set({ contactNumber: e.target.value })} placeholder="09xxxxxxxx" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
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
