"use client";

// Creates an orthotics reception for a patient, or edits the guardian details of
// an existing one. The assessments are filled in on the reception page.
import { useState } from "react";
import { Loader2, Search, UserRound, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import {
  useCreateOrthoticsReception, useUpdateOrthoticsReception,
} from "@/lib/hooks/use-clinic-orthotics";
import type { OrthoticsGuardianDto, OrthoticsReception } from "@/lib/api/clinic-orthotics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing reception; omit to create a new one. */
  reception?: OrthoticsReception;
  /** Opened from a patient's file — no patient picker is shown. */
  patientId?: string;
  onCreated?: (id: string) => void;
}

const EMPTY = { guardianName: "", guardianRelation: "", guardianPhone: "" };

export function OrthoticsReceptionDialog({ open, onOpenChange, reception, patientId, onCreated }: Props) {
  const isEdit = !!reception;
  const needsPicker = !isEdit && !patientId;
  const [form, setForm] = useState(EMPTY);
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: patientsData, isLoading: patientsLoading } = useClinicPatients(
    { search: search.trim() || undefined, limit: 20 },
    open && needsPicker,
  );
  const patients = patientsData?.items ?? [];

  const create = useCreateOrthoticsReception();
  const update = useUpdateOrthoticsReception();
  const isPending = create.isPending || update.isPending;

  // Reset each time the dialog opens (adjusting state on a prop change, as the
  // podiatry dialog does, rather than in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(reception
        ? {
            guardianName: reception.guardianName ?? "",
            guardianRelation: reception.guardianRelation ?? "",
            guardianPhone: reception.guardianPhone ?? "",
          }
        : EMPTY);
      setPicked(null);
      setSearch("");
    }
  }

  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));
  const targetPatientId = patientId ?? picked?.id ?? "";

  const handleSubmit = async () => {
    if (isEdit) {
      // PATCH takes only what changed; a field cleared on purpose goes as "".
      const dto: OrthoticsGuardianDto = {};
      (Object.keys(EMPTY) as (keyof typeof EMPTY)[]).forEach((k) => {
        const next = form[k].trim();
        if (next !== (reception![k] ?? "")) dto[k] = next;
      });
      if (Object.keys(dto).length) await update.mutateAsync({ id: reception!.id, dto });
      onOpenChange(false);
      return;
    }
    if (!targetPatientId) return;
    const created = await create.mutateAsync({
      patientId: targetPatientId,
      ...(form.guardianName.trim() ? { guardianName: form.guardianName.trim() } : {}),
      ...(form.guardianRelation.trim() ? { guardianRelation: form.guardianRelation.trim() } : {}),
      ...(form.guardianPhone.trim() ? { guardianPhone: form.guardianPhone.trim() } : {}),
    });
    onOpenChange(false);
    if (created?.id) onCreated?.(created.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل بيانات الاستقبال" : "استقبال مقومات جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {needsPicker && (
            <div className="space-y-1.5">
              <Label>المريض <span className="text-destructive">*</span></Label>
              {picked ? (
                <div className="flex items-center gap-2 rounded-md border bg-primary/5 px-3 py-2">
                  <UserRound className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 text-sm font-medium text-primary">{picked.label}</span>
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setPicked(null)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو رقم المريض..."
                      className="pr-9"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    {patientsLoading ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">جارِ التحميل...</p>
                    ) : patients.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">لا يوجد مريض مطابق</p>
                    ) : (
                      patients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-accent"
                          onClick={() => setPicked({ id: p.id, label: `${p.firstName} ${p.lastName}`.trim() })}
                        >
                          <span className="flex-1 truncate text-sm">{p.firstName} {p.lastName}</span>
                          <span className="font-mono text-xs text-muted-foreground">{p.patientNumber}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>اسم ولي الأمر</Label>
            <Input value={form.guardianName} onChange={(e) => set({ guardianName: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>صلة القرابة</Label>
              <Input value={form.guardianRelation} onChange={(e) => set({ guardianRelation: e.target.value })} placeholder="مثال: الأب" />
            </div>
            <div className="space-y-1.5">
              <Label>هاتف ولي الأمر</Label>
              <Input dir="ltr" value={form.guardianPhone} onChange={(e) => set({ guardianPhone: e.target.value })} placeholder="09xxxxxxxx" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isPending || (!isEdit && !targetPatientId)}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {isEdit ? "حفظ" : "إنشاء الاستقبال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
