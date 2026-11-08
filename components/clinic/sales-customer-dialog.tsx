"use client";

import { useState } from "react";
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
  SalesCustomer, SalesCustomerArrivalMethod, SalesCustomerGender,
} from "@/lib/api/sales-customers";

export const SALES_CUSTOMER_ARRIVAL_METHODS: { value: SalesCustomerArrivalMethod; label: string }[] = [
  { value: "SOCIAL_MEDIA", label: "مواقع التواصل" },
  { value: "HOSPITAL",     label: "مشفى" },
  { value: "DOCTOR",       label: "طبيب" },
  { value: "FRIEND",       label: "صديق" },
  { value: "STAFF",        label: "موظف" },
];

export const salesArrivalLabel = (v?: string | null) =>
  v ? SALES_CUSTOMER_ARRIVAL_METHODS.find((m) => m.value === v)?.label ?? v : "—";

/** Radix rejects an empty option value, so "unspecified" needs a sentinel. */
const NONE = "__none__";

const emptyForm = {
  name: "",
  gender: "" as SalesCustomerGender | "",
  age: "",
  arrivalMethod: NONE,
  contactNumber: "",
  residence: "",
  notes: "",
};

type FormState = typeof emptyForm;

const formOf = (c: SalesCustomer): FormState => ({
  name: c.name ?? "",
  gender: c.gender,
  age: c.age != null ? String(c.age) : "",
  arrivalMethod: c.arrivalMethod ?? NONE,
  contactNumber: c.contactNumber ?? "",
  residence: c.residence ?? "",
  notes: c.notes ?? "",
});

/** The form as the API wants it; optional fields left blank are omitted. */
const toDto = (f: FormState): Record<string, unknown> => {
  const age = f.age.trim() ? Number(f.age) : undefined;
  return {
    name: f.name.trim(),
    gender: f.gender,
    ...(age != null && !Number.isNaN(age) ? { age } : {}),
    ...(f.arrivalMethod !== NONE ? { arrivalMethod: f.arrivalMethod } : {}),
    contactNumber: f.contactNumber.trim(),
    ...(f.residence.trim() ? { residence: f.residence.trim() } : {}),
    ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
  };
};

export function SalesCustomerDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  customer?: SalesCustomer | null;
  /** On edit, receives only the fields that changed — possibly none. */
  onSubmit: (dto: Record<string, unknown>) => void;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        {/* Remounted per open (Radix unmounts the content on close), so the form
            starts from the record — or empty — every time without an effect. */}
        {open && (
          <SalesCustomerForm
            customer={customer}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SalesCustomerForm({
  customer, onSubmit, onCancel, isPending,
}: {
  customer?: SalesCustomer | null;
  onSubmit: (dto: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending?: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => (customer ? formOf(customer) : emptyForm));
  const isEdit = !!customer;
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const ageNumber = Number(form.age);
  const ageInvalid = form.age.trim() !== "" && (!Number.isInteger(ageNumber) || ageNumber < 0 || ageNumber > 120);
  const missing = !form.name.trim() || !form.gender || !form.contactNumber.trim();

  const handleSubmit = () => {
    if (missing || ageInvalid) return;
    const next = toDto(form);
    if (!customer) { onSubmit(next); return; }
    // PATCH takes only what changed. A cleared optional field isn't sent — the
    // API has no documented way to blank one.
    const prev = toDto(formOf(customer));
    onSubmit(Object.fromEntries(Object.entries(next).filter(([k, v]) => prev[k] !== v)));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "تعديل عميل" : "إضافة عميل"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>الاسم <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>الجنس <span className="text-destructive">*</span></Label>
            <Select value={form.gender || undefined} onValueChange={(v) => set({ gender: v as SalesCustomerGender })}>
              <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">ذكر</SelectItem>
                <SelectItem value="FEMALE">أنثى</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>العمر</Label>
            <Input type="number" min={0} max={120} inputMode="numeric"
              value={form.age} onChange={(e) => set({ age: e.target.value })} />
            {ageInvalid && <p className="text-xs text-destructive">العمر بين 0 و 120</p>}
          </div>
          <div className="space-y-1.5">
            <Label>طريقة الوصول</Label>
            <Select value={form.arrivalMethod} onValueChange={(v) => set({ arrivalMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدد</SelectItem>
                {SALES_CUSTOMER_ARRIVAL_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>رقم التواصل <span className="text-destructive">*</span></Label>
            <Input dir="ltr" value={form.contactNumber}
              onChange={(e) => set({ contactNumber: e.target.value })} placeholder="09xxxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>مكان الإقامة</Label>
            <Input value={form.residence} onChange={(e) => set({ residence: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>ملاحظات</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>إلغاء</Button>
        <Button onClick={handleSubmit} disabled={missing || ageInvalid || isPending}>
          {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {isEdit ? "حفظ" : "إضافة"}
        </Button>
      </DialogFooter>
    </>
  );
}
