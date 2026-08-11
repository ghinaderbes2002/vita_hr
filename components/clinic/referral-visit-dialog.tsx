"use client";

// Record / edit a marketing visit to a referral source. `visitedBy` is filled
// by the backend from the token, so it is never part of this form.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateReferralVisit, useUpdateReferralVisit } from "@/lib/hooks/use-clinic-referrals";
import {
  CreateReferralVisitDto,
  REFERRAL_VISIT_TYPES,
  REFERRAL_VISIT_TYPE_LABEL,
  ReferralVisit,
  ReferralVisitType,
} from "@/lib/api/clinic-referrals";

/** `<input type="date">` wants YYYY-MM-DD; the API sends a full ISO string. */
const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

interface FormState {
  visitType: ReferralVisitType;
  visitDate: string;
  topics: string;
  nextVisitDate: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  visitType: "INTRODUCTORY",
  visitDate: new Date().toISOString().slice(0, 10),
  topics: "",
  nextVisitDate: "",
  notes: "",
});

export function ReferralVisitDialog({
  open,
  onOpenChange,
  sourceId,
  visit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  /** Present = edit mode. */
  visit?: ReferralVisit | null;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const create = useCreateReferralVisit();
  const update = useUpdateReferralVisit();
  const saving = create.isPending || update.isPending;

  // Reload the form when the dialog transitions to open, so a cancelled edit
  // never leaks into the next one — done during render rather than in an
  // effect, which would flash the previous values first.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(
        visit
          ? {
              visitType: visit.visitType,
              visitDate: toDateInput(visit.visitDate),
              topics: visit.topics ?? "",
              nextVisitDate: toDateInput(visit.nextVisitDate),
              notes: visit.notes ?? "",
            }
          : emptyForm(),
      );
    }
  }

  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.visitDate) return;
    const dto: CreateReferralVisitDto = {
      visitType: form.visitType,
      visitDate: form.visitDate,
      topics: form.topics.trim() || undefined,
      nextVisitDate: form.nextVisitDate || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (visit) await update.mutateAsync({ sourceId, visitId: visit.id, dto });
    else await create.mutateAsync({ sourceId, dto });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{visit ? "تعديل الزيارة" : "تسجيل زيارة"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>نوع الزيارة <span className="text-destructive">*</span></Label>
            <Select value={form.visitType} onValueChange={(v) => set("visitType", v as ReferralVisitType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REFERRAL_VISIT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{REFERRAL_VISIT_TYPE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>تاريخ الزيارة <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>الزيارة المرتقبة</Label>
              <Input type="date" value={form.nextVisitDate} onChange={(e) => set("nextVisitDate", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>محاور الزيارة</Label>
            <Textarea rows={2} value={form.topics} onChange={(e) => set("topics", e.target.value)}
              placeholder="ما تم مناقشته خلال الزيارة..." />
          </div>

          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={!form.visitDate || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {visit ? "حفظ التعديلات" : "تسجيل"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
