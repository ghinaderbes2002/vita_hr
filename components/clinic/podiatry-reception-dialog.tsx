"use client";

// Reception form (فورم الاستقبال) — used both to create a reception for a
// patient and to edit an existing one.
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
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import {
  useCreatePodiatryReception, useUpdatePodiatryReception,
} from "@/lib/hooks/use-clinic-podiatry";
import {
  AffectedSide, FootSymptom, MedicalHistoryItem, PodiatryReception, VisitType,
} from "@/lib/api/clinic-podiatry";
import {
  AFFECTED_SIDE_LABEL, AFFECTED_SIDE_VALUES,
  FOOT_SYMPTOM_LABEL, FOOT_SYMPTOM_VALUES,
  MEDICAL_HISTORY_LABEL, MEDICAL_HISTORY_VALUES,
  VISIT_TYPE_LABEL, VISIT_TYPE_VALUES,
} from "./podiatry-labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing reception; omit to create a new one. */
  reception?: PodiatryReception;
  /** Opened from a patient's profile — no patient picker is shown. */
  patientId?: string;
  onCreated?: (id: string) => void;
}

const EMPTY = {
  patientId: "",
  activities: "",
  problemDescription: "",
  historyOfSymptoms: "",
  affectedSide: [] as AffectedSide[],
  footSymptoms: [] as FootSymptom[],
  visitTypes: [] as VisitType[],
  medicalHistory: [] as MedicalHistoryItem[],
  medicalHistoryOther: "",
  vasScore: "",
};

// Multi-select rendered as a row of toggle chips — every one of these fields
// accepts more than one value.
function ChipGroup<T extends string>({
  values, selected, label, onToggle,
}: {
  values: T[];
  selected: T[];
  label: (v: T) => string;
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => {
        const on = selected.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              on ? "border-orange-500 bg-orange-500 text-white" : "border-border hover:bg-muted"
            }`}
          >
            {label(v)}
          </button>
        );
      })}
    </div>
  );
}

export function PodiatryReceptionDialog({ open, onOpenChange, reception, patientId, onCreated }: Props) {
  const isEdit = !!reception;
  const fixedPatient = !!patientId;
  const [form, setForm] = useState({ ...EMPTY });
  const [patientSearch, setPatientSearch] = useState("");

  const { data: patientsData } = useClinicPatients({ search: patientSearch || undefined, limit: 20 });
  const patients = patientsData?.items ?? [];

  const createReception = useCreatePodiatryReception();
  const updateReception = useUpdatePodiatryReception();
  const isPending = createReception.isPending || updateReception.isPending;

  // Reset the form each time the dialog opens (adjusting state on prop change,
  // which React prefers over doing it in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(reception
        ? {
            patientId: reception.patientId ?? "",
            activities: reception.activities ?? "",
            problemDescription: reception.problemDescription ?? "",
            historyOfSymptoms: reception.historyOfSymptoms ?? "",
            affectedSide: reception.affectedSide ?? [],
            footSymptoms: reception.footSymptoms ?? [],
            visitTypes: reception.visitTypes ?? [],
            medicalHistory: reception.medicalHistory ?? [],
            medicalHistoryOther: reception.medicalHistoryOther ?? "",
            vasScore: reception.vasScore?.toString() ?? "",
          }
        : { ...EMPTY, patientId: patientId ?? "" });
    }
  }

  const toggle = <T extends string>(key: keyof typeof EMPTY, v: T) =>
    setForm((f) => {
      const list = f[key] as unknown as T[];
      return { ...f, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] };
    });

  const buildDto = () => ({
    ...(isEdit ? {} : { patientId: patientId ?? form.patientId }),
    activities: form.activities || undefined,
    problemDescription: form.problemDescription || undefined,
    historyOfSymptoms: form.historyOfSymptoms || undefined,
    affectedSide: form.affectedSide.length ? form.affectedSide : undefined,
    footSymptoms: form.footSymptoms.length ? form.footSymptoms : undefined,
    visitTypes: form.visitTypes.length ? form.visitTypes : undefined,
    medicalHistory: form.medicalHistory.length ? form.medicalHistory : undefined,
    // Only meaningful alongside the OTHER option.
    medicalHistoryOther: form.medicalHistory.includes("OTHER")
      ? form.medicalHistoryOther || undefined
      : undefined,
    vasScore: form.vasScore !== "" ? Number(form.vasScore) : undefined,
  });

  const handleSave = async () => {
    if (isEdit && reception) {
      await updateReception.mutateAsync({ id: reception.id, dto: buildDto() });
    } else {
      if (!form.patientId && !patientId) return;
      const created = await createReception.mutateAsync(buildDto());
      onCreated?.(created.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الاستقبال" : "استقبال جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && !fixedPatient && (
            <div className="space-y-1.5">
              <Label>المريض <span className="text-destructive">*</span></Label>
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="ابحث بالاسم أو رقم المريض..."
                className="h-9"
              />
              <Select value={form.patientId} onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المريض..." /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}{p.patientNumber ? ` — ${p.patientNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">النشاطات</Label>
            <Input className="h-9" value={form.activities} onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">وصف المشكلة</Label>
            <Textarea rows={2} className="resize-none" value={form.problemDescription} onChange={(e) => setForm((f) => ({ ...f, problemDescription: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">تاريخ الأعراض</Label>
            <Input className="h-9" value={form.historyOfSymptoms} onChange={(e) => setForm((f) => ({ ...f, historyOfSymptoms: e.target.value }))} placeholder="مثال: سنتين" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">الجهة المصابة</Label>
            <ChipGroup
              values={AFFECTED_SIDE_VALUES}
              selected={form.affectedSide}
              label={(v) => AFFECTED_SIDE_LABEL[v]}
              onToggle={(v) => toggle("affectedSide", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">أعراض القدم</Label>
            <ChipGroup
              values={FOOT_SYMPTOM_VALUES}
              selected={form.footSymptoms}
              label={(v) => FOOT_SYMPTOM_LABEL[v]}
              onToggle={(v) => toggle("footSymptoms", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">سبب الزيارة</Label>
            <ChipGroup
              values={VISIT_TYPE_VALUES}
              selected={form.visitTypes}
              label={(v) => VISIT_TYPE_LABEL[v]}
              onToggle={(v) => toggle("visitTypes", v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">التاريخ الطبي</Label>
            <ChipGroup
              values={MEDICAL_HISTORY_VALUES}
              selected={form.medicalHistory}
              label={(v) => MEDICAL_HISTORY_LABEL[v]}
              onToggle={(v) => toggle("medicalHistory", v)}
            />
            {form.medicalHistory.includes("OTHER") && (
              <Input
                className="h-9 mt-1.5"
                placeholder="اذكر التفاصيل..."
                value={form.medicalHistoryOther}
                onChange={(e) => setForm((f) => ({ ...f, medicalHistoryOther: e.target.value }))}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">مقياس الألم (VAS) — {form.vasScore || 0}/10</Label>
            <Input
              type="range"
              min={0}
              max={10}
              value={form.vasScore || 0}
              onChange={(e) => setForm((f) => ({ ...f, vasScore: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} disabled={isPending || (!isEdit && !form.patientId && !fixedPatient)} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "حفظ التعديلات" : "إنشاء الاستقبال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
