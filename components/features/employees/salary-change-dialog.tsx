"use client";

import { useState } from "react";
import { useSalaryChange } from "@/lib/hooks/use-employees";
import { AllowancesEditor, AllowanceRow } from "./allowances-editor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentSalary?: number;
  currentCurrency?: string;
}

export function SalaryChangeDialog({ open, onOpenChange, employeeId, currentSalary, currentCurrency }: Props) {
  const salaryChange = useSalaryChange();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    basicSalary:    "",
    salaryCurrency: currentCurrency ?? "USD",
    eventType:      "SALARY_CHANGE" as "SALARY_CHANGE" | "PROMOTION",
    effectiveDate:  today,
    note:           "",
  });
  const [editAllowances, setEditAllowances] = useState(false);
  const [allowanceRows, setAllowanceRows] = useState<AllowanceRow[]>([]);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm({
      basicSalary: "", salaryCurrency: currentCurrency ?? "USD",
      eventType: "SALARY_CHANGE", effectiveDate: today, note: "",
    });
    setEditAllowances(false);
    setAllowanceRows([]);
  }

  async function handleSubmit() {
    await salaryChange.mutateAsync({
      id: employeeId,
      dto: {
        basicSalary: parseFloat(form.basicSalary),
        salaryCurrency: form.salaryCurrency,
        eventType: form.eventType,
        effectiveDate: form.effectiveDate,
        note: form.note.trim() || undefined,
        ...(editAllowances && {
          allowances: allowanceRows
            .filter(r => r.type && r.amount)
            .map(r => ({ type: r.type, amount: parseFloat(r.amount) })),
        }),
      },
    });
    reset();
    onOpenChange(false);
  }

  const canSubmit = !!form.basicSalary && parseFloat(form.basicSalary) > 0 && !!form.effectiveDate;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>تغيير الراتب</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Event type */}
          <div className="space-y-1.5">
            <Label>نوع الحدث</Label>
            <Select value={form.eventType} onValueChange={(v) => set("eventType", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SALARY_CHANGE">تعديل راتب</SelectItem>
                <SelectItem value="PROMOTION">ترقية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>
                الراتب الأساسي الجديد *
                {currentSalary && (
                  <span className="text-muted-foreground font-normal mr-1">
                    (الحالي: {currentSalary.toLocaleString("en-US")})
                  </span>
                )}
              </Label>
              <Input
                type="number" min={0}
                value={form.basicSalary}
                onChange={(e) => set("basicSalary", e.target.value)}
                placeholder="أدخل الراتب الجديد"
              />
            </div>
            <div className="space-y-1.5">
              <Label>العملة</Label>
              <Select value={form.salaryCurrency} onValueChange={(v) => set("salaryCurrency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYP">ل.س</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allowances */}
          <AllowancesEditor
            enabled={editAllowances}
            onEnabledChange={setEditAllowances}
            rows={allowanceRows}
            onRowsChange={setAllowanceRows}
          />

          {/* Effective Date */}
          <div className="space-y-1.5">
            <Label>تاريخ التطبيق *</Label>
            <Input type="date" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>ملاحظة</Label>
            <Textarea rows={2} placeholder="سبب التغيير..." value={form.note} onChange={(e) => set("note", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || salaryChange.isPending}>
            {salaryChange.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
