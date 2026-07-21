"use client";

// Session form (فورم الجلسة) — clinical plan, per-foot findings and the
// clinician's signature. Used for both adding and editing a session.
import { useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePadDialog } from "./signature-pad-dialog";
import {
  useCreatePodiatrySession, useUpdatePodiatrySession,
} from "@/lib/hooks/use-clinic-podiatry";
import { ClinicalPlanItem, PodiatrySession } from "@/lib/api/clinic-podiatry";
import { CLINICAL_PLAN_LABEL, CLINICAL_PLAN_VALUES } from "./podiatry-labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receptionId: string;
  /** Editing an existing session; omit to add a new one. */
  session?: PodiatrySession;
}

const EMPTY = {
  clinicalPlan: [] as ClinicalPlanItem[],
  rightFlatFoot: false,
  rightHighArch: false,
  rightPronation: false,
  rightSupination: false,
  rightPressureNotes: "",
  rightAsymmetry: "",
  leftFlatFoot: false,
  leftHighArch: false,
  leftPronation: false,
  leftSupination: false,
  leftPressureNotes: "",
  leftAsymmetry: "",
  clinicianName: "",
  clinicianSignature: "",
};

type FormState = typeof EMPTY;

const FOOT_FLAGS = [
  { key: "FlatFoot", label: "قدم مسطحة" },
  { key: "HighArch", label: "قوس مرتفع" },
  { key: "Pronation", label: "انكباب" },
  { key: "Supination", label: "انقلاب" },
] as const;

export function PodiatrySessionDialog({ open, onOpenChange, receptionId, session }: Props) {
  const isEdit = !!session;
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [padOpen, setPadOpen] = useState(false);

  const createSession = useCreatePodiatrySession();
  const updateSession = useUpdatePodiatrySession();
  const isPending = createSession.isPending || updateSession.isPending;

  // Reset the form each time the dialog opens (adjusting state on prop change,
  // which React prefers over doing it in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(session
        ? {
            clinicalPlan: session.clinicalPlan ?? [],
            rightFlatFoot: !!session.rightFlatFoot,
            rightHighArch: !!session.rightHighArch,
            rightPronation: !!session.rightPronation,
            rightSupination: !!session.rightSupination,
            rightPressureNotes: session.rightPressureNotes ?? "",
            rightAsymmetry: session.rightAsymmetry ?? "",
            leftFlatFoot: !!session.leftFlatFoot,
            leftHighArch: !!session.leftHighArch,
            leftPronation: !!session.leftPronation,
            leftSupination: !!session.leftSupination,
            leftPressureNotes: session.leftPressureNotes ?? "",
            leftAsymmetry: session.leftAsymmetry ?? "",
            clinicianName: session.clinicianName ?? "",
            clinicianSignature: session.clinicianSignature ?? "",
          }
        : { ...EMPTY });
    }
  }

  const togglePlan = (v: ClinicalPlanItem) =>
    setForm((f) => ({
      ...f,
      clinicalPlan: f.clinicalPlan.includes(v)
        ? f.clinicalPlan.filter((x) => x !== v)
        : [...f.clinicalPlan, v],
    }));

  const handleSave = async () => {
    const dto = {
      ...form,
      clinicalPlan: form.clinicalPlan.length ? form.clinicalPlan : undefined,
      clinicianName: form.clinicianName || undefined,
      clinicianSignature: form.clinicianSignature || undefined,
    };
    if (isEdit && session) {
      await updateSession.mutateAsync({ receptionId, sessionId: session.id, dto });
    } else {
      await createSession.mutateAsync({ receptionId, dto });
    }
    onOpenChange(false);
  };

  const footBlock = (side: "right" | "left") => (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold">{side === "right" ? "القدم اليمنى" : "القدم اليسرى"}</p>
      <div className="space-y-1.5">
        {FOOT_FLAGS.map(({ key, label }) => {
          const field = `${side}${key}` as keyof FormState;
          return (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form[field]}
                onChange={() => setForm((f) => ({ ...f, [field]: !f[field] }))}
                className="w-4 h-4 checkbox-orange rounded-sm"
              />
              <span className="text-sm">{label}</span>
            </label>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">ملاحظات الضغط</Label>
        <Textarea
          rows={2}
          className="resize-none text-sm"
          value={form[`${side}PressureNotes` as keyof FormState] as string}
          onChange={(e) => setForm((f) => ({ ...f, [`${side}PressureNotes`]: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">عدم التناظر</Label>
        <Input
          className="h-9"
          value={form[`${side}Asymmetry` as keyof FormState] as string}
          onChange={(e) => setForm((f) => ({ ...f, [`${side}Asymmetry`]: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "تعديل الجلسة" : "جلسة جديدة"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">الخطة العلاجية</Label>
              <div className="flex flex-wrap gap-1.5">
                {CLINICAL_PLAN_VALUES.map((v) => {
                  const on = form.clinicalPlan.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => togglePlan(v)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        on ? "border-orange-500 bg-orange-500 text-white" : "border-border hover:bg-muted"
                      }`}
                    >
                      {CLINICAL_PLAN_LABEL[v]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {footBlock("right")}
              {footBlock("left")}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم الأخصائي</Label>
                <Input className="h-9" value={form.clinicianName} onChange={(e) => setForm((f) => ({ ...f, clinicianName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">التوقيع</Label>
                {form.clinicianSignature ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.clinicianSignature} alt="التوقيع" className="h-16 w-full object-contain border rounded bg-white" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, clinicianSignature: "" }))}
                      className="absolute top-1 left-1 rounded bg-white/80 px-1 text-xs text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setPadOpen(true)}>
                    <PenLine className="h-3.5 w-3.5" />
                    رسم التوقيع
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "حفظ التعديلات" : "إضافة الجلسة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignaturePadDialog
        open={padOpen}
        onOpenChange={setPadOpen}
        title="توقيع الأخصائي"
        signerName={form.clinicianName || undefined}
        onSign={async (base64) => setForm((f) => ({ ...f, clinicianSignature: base64 }))}
      />
    </>
  );
}
