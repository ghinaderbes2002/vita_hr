"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileVideo, Loader2, Upload, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  Exercise, ExerciseMediaType, exerciseGoalIds, MEDIA_ACCEPT, mediaFileProblem,
} from "@/lib/api/patient-app";
import {
  useSaveExercise, useTaxonomy, useUploadExerciseMedia,
} from "@/lib/hooks/use-patient-app";

/** Radix rejects an empty option value, so "unspecified" needs a sentinel. */
const NONE = "__none__";

const emptyForm = {
  nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "",
  bodyRegionId: "", targetRegionId: NONE, subTargetRegionId: NONE,
  mediaType: "VIDEO" as ExerciseMediaType,
  executionMethodAr: "", executionMethodEn: "",
  warningsAr: "", warningsEn: "",
  commonMistakesAr: "", commonMistakesEn: "",
  defaultDurationSeconds: "",
  goalIds: [] as string[],
};

type Form = typeof emptyForm;

const fromExercise = (ex: Exercise): Form => ({
  nameAr: ex.nameAr ?? "",
  nameEn: ex.nameEn ?? "",
  descriptionAr: ex.descriptionAr ?? "",
  descriptionEn: ex.descriptionEn ?? "",
  bodyRegionId: ex.bodyRegionId ?? "",
  targetRegionId: ex.targetRegionId ?? NONE,
  subTargetRegionId: ex.subTargetRegionId ?? NONE,
  mediaType: ex.mediaType ?? "VIDEO",
  executionMethodAr: ex.executionMethodAr ?? "",
  executionMethodEn: ex.executionMethodEn ?? "",
  warningsAr: ex.warningsAr ?? "",
  warningsEn: ex.warningsEn ?? "",
  commonMistakesAr: ex.commonMistakesAr ?? "",
  commonMistakesEn: ex.commonMistakesEn ?? "",
  defaultDurationSeconds: ex.defaultDurationSeconds != null ? String(ex.defaultDurationSeconds) : "",
  goalIds: exerciseGoalIds(ex),
});

const textOrNull = (s: string) => s.trim() || null;

export function ExerciseDialog({
  open,
  onOpenChange,
  exercise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
}) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!exercise;
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(exercise ? fromExercise(exercise) : emptyForm);
      setFile(null);
      setProgress(null);
    }
  }

  const { data: bodyRegions = [] } = useTaxonomy("body-regions", undefined, open);
  const { data: targetRegions = [] } = useTaxonomy(
    "target-regions", { bodyRegionId: form.bodyRegionId }, open && !!form.bodyRegionId,
  );
  const { data: subTargets = [] } = useTaxonomy(
    "sub-target-regions", { targetRegionId: form.targetRegionId }, open && form.targetRegionId !== NONE,
  );
  const { data: goals = [] } = useTaxonomy("goals", undefined, open);

  const save = useSaveExercise();
  const upload = useUploadExerciseMedia();
  const isPending = save.isPending || upload.isPending;
  const missing = !form.nameAr.trim() || !form.nameEn.trim() || !form.bodyRegionId;

  const toggleGoal = (id: string) =>
    set({ goalIds: form.goalIds.includes(id) ? form.goalIds.filter((g) => g !== id) : [...form.goalIds, id] });

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    const problem = mediaFileProblem(picked);
    if (problem) { toast.error(problem); return; }
    setFile(picked);
    set({ mediaType: picked.type.startsWith("image/") ? "IMAGE" : "VIDEO" });
  };

  const handleSave = async () => {
    if (missing) return;
    const duration = Number(form.defaultDurationSeconds);
    let saved: Exercise;
    try {
      saved = await save.mutateAsync({
        id: exercise?.id,
        dto: {
          nameAr: form.nameAr.trim(),
          nameEn: form.nameEn.trim(),
          descriptionAr: textOrNull(form.descriptionAr),
          descriptionEn: textOrNull(form.descriptionEn),
          bodyRegionId: form.bodyRegionId,
          targetRegionId: form.targetRegionId !== NONE ? form.targetRegionId : null,
          subTargetRegionId: form.subTargetRegionId !== NONE ? form.subTargetRegionId : null,
          mediaType: form.mediaType,
          // Media is uploaded through its own endpoint. Echo back what the record
          // already holds so a full-replace PUT can't wipe an uploaded video.
          mediaUrl: exercise?.mediaUrl ?? null,
          thumbnailUrl: exercise?.thumbnailUrl ?? null,
          executionMethodAr: textOrNull(form.executionMethodAr),
          executionMethodEn: textOrNull(form.executionMethodEn),
          warningsAr: textOrNull(form.warningsAr),
          warningsEn: textOrNull(form.warningsEn),
          commonMistakesAr: textOrNull(form.commonMistakesAr),
          commonMistakesEn: textOrNull(form.commonMistakesEn),
          defaultDurationSeconds:
            form.defaultDurationSeconds.trim() && !Number.isNaN(duration) ? duration : null,
          goalIds: form.goalIds,
        },
      });
    } catch {
      return; // the hook already showed the error
    }

    if (file) {
      setProgress(0);
      try {
        await upload.mutateAsync({ id: saved?.id ?? exercise!.id, file, onProgress: setProgress });
      } catch {
        // The exercise itself is saved; closing avoids a second "create" on retry.
        // The upload can be repeated from the library row.
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل تمرين" : "إضافة تمرين"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <Section title="الأساسيات">
            <Pair>
              <Field label="الاسم بالعربية" required>
                <Input dir="rtl" value={form.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
              </Field>
              <Field label="الاسم بالإنجليزية" required>
                <Input dir="ltr" value={form.nameEn} onChange={(e) => set({ nameEn: e.target.value })} />
              </Field>
            </Pair>
            <Pair>
              <Field label="الوصف بالعربية">
                <Textarea dir="rtl" rows={2} value={form.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} />
              </Field>
              <Field label="الوصف بالإنجليزية">
                <Textarea dir="ltr" rows={2} value={form.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} />
              </Field>
            </Pair>
            <Field label="المدة الافتراضية (ثانية)">
              <Input
                type="number" min={0} inputMode="numeric" className="w-40"
                value={form.defaultDurationSeconds}
                onChange={(e) => set({ defaultDurationSeconds: e.target.value })}
              />
            </Field>
          </Section>

          <Section title="التصنيف">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="المنطقة الجسدية" required>
                <Select
                  value={form.bodyRegionId || undefined}
                  onValueChange={(v) => set({ bodyRegionId: v, targetRegionId: NONE, subTargetRegionId: NONE })}
                >
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    {bodyRegions.map((r) => <SelectItem key={r.id} value={r.id}>{r.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="المنطقة المستهدفة">
                <Select
                  value={form.targetRegionId}
                  onValueChange={(v) => set({ targetRegionId: v, subTargetRegionId: NONE })}
                  disabled={!form.bodyRegionId}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>غير محدد</SelectItem>
                    {targetRegions.map((r) => <SelectItem key={r.id} value={r.id}>{r.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="المنطقة الفرعية">
                <Select
                  value={form.subTargetRegionId}
                  onValueChange={(v) => set({ subTargetRegionId: v })}
                  disabled={form.targetRegionId === NONE}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>غير محدد</SelectItem>
                    {subTargets.map((r) => <SelectItem key={r.id} value={r.id}>{r.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="الأهداف العلاجية">
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد أهداف معرّفة بعد</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {goals.map((g) => {
                    const on = form.goalIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGoal(g.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                        )}
                      >
                        {g.nameAr}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
          </Section>

          <Section title="طريقة التنفيذ">
            <Pair>
              <Field label="طريقة التنفيذ بالعربية">
                <Textarea dir="rtl" rows={3} value={form.executionMethodAr} onChange={(e) => set({ executionMethodAr: e.target.value })} />
              </Field>
              <Field label="طريقة التنفيذ بالإنجليزية">
                <Textarea dir="ltr" rows={3} value={form.executionMethodEn} onChange={(e) => set({ executionMethodEn: e.target.value })} />
              </Field>
            </Pair>
            <Pair>
              <Field label="تحذيرات بالعربية">
                <Textarea dir="rtl" rows={2} value={form.warningsAr} onChange={(e) => set({ warningsAr: e.target.value })} />
              </Field>
              <Field label="تحذيرات بالإنجليزية">
                <Textarea dir="ltr" rows={2} value={form.warningsEn} onChange={(e) => set({ warningsEn: e.target.value })} />
              </Field>
            </Pair>
            <Pair>
              <Field label="أخطاء شائعة بالعربية">
                <Textarea dir="rtl" rows={2} value={form.commonMistakesAr} onChange={(e) => set({ commonMistakesAr: e.target.value })} />
              </Field>
              <Field label="أخطاء شائعة بالإنجليزية">
                <Textarea dir="ltr" rows={2} value={form.commonMistakesEn} onChange={(e) => set({ commonMistakesEn: e.target.value })} />
              </Field>
            </Pair>
          </Section>

          <Section title="الوسائط">
            <div className="flex flex-wrap items-end gap-4">
              <Field label="نوع الوسائط">
                <Select value={form.mediaType} onValueChange={(v) => set({ mediaType: v as ExerciseMediaType })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">فيديو</SelectItem>
                    <SelectItem value="IMAGE">صورة</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} className="hidden" onChange={pickFile} />
              <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {isEdit && exercise?.mediaUrl ? "استبدال الملف" : "اختيار ملف"}
              </Button>
            </div>
            {file && (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileVideo className="h-4 w-4 shrink-0" />
                  <span className="truncate" dir="ltr">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                </span>
                {progress != null ? (
                  <span className="shrink-0 font-medium">{progress}%</span>
                ) : (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              MP4, MOV, WEBM, AVI, JPG, PNG — حتى 200 ميغابايت. يُرفع الملف بعد حفظ التمرين.
            </p>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={missing || isPending}>
            {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {upload.isPending ? "جارٍ رفع الملف..." : isEdit ? "حفظ" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="border-b pb-1.5 text-sm font-semibold text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}
