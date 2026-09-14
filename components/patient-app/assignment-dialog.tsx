"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { localizedName, type Assignment } from "@/lib/api/patient-app";
import {
  useAssignExercise, useExercises, useUpdateAssignment,
} from "@/lib/hooks/use-patient-app";

/** Each key is both the form field and its label under `patientApp.programs`. */
const NUMBER_FIELDS = ["sets", "reps", "durationSeconds", "holdSeconds", "restSeconds"] as const;

const emptyForm = {
  exerciseId: "",
  sets: "", reps: "", durationSeconds: "", holdSeconds: "", restSeconds: "",
  frequencyTextAr: "", frequencyTextEn: "",
  customInstructionAr: "", customInstructionEn: "",
};

type Form = typeof emptyForm;

export function AssignmentDialog({
  open,
  onOpenChange,
  sessionId,
  assignment,
  nextSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  /** Present when editing; the exercise itself can't be swapped then. */
  assignment?: Assignment | null;
  nextSortOrder: number;
}) {
  const t = useTranslations("patientApp.programs");
  const tc = useTranslations("patientApp.common");
  const locale = useLocale();
  const isEdit = !!assignment;
  const [form, setForm] = useState<Form>(emptyForm);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSearch("");
      setTerm("");
      const str = (n?: number | null) => (n != null ? String(n) : "");
      setForm(assignment
        ? {
            exerciseId: assignment.exerciseId,
            sets: str(assignment.sets),
            reps: str(assignment.reps),
            durationSeconds: str(assignment.durationSeconds),
            holdSeconds: str(assignment.holdSeconds),
            restSeconds: str(assignment.restSeconds),
            frequencyTextAr: assignment.frequencyTextAr ?? "",
            frequencyTextEn: assignment.frequencyTextEn ?? "",
            customInstructionAr: assignment.customInstructionAr ?? "",
            customInstructionEn: assignment.customInstructionEn ?? "",
          }
        : emptyForm);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: exercises = [], isFetching } = useExercises({ search: term || undefined }, open && !isEdit);
  const assign = useAssignExercise();
  const update = useUpdateAssignment();
  const isPending = assign.isPending || update.isPending;

  const pickExercise = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    set({
      exerciseId: id,
      // Start from the library default; the therapist can still override it.
      ...(ex?.defaultDurationSeconds != null && !form.durationSeconds
        ? { durationSeconds: String(ex.defaultDurationSeconds) }
        : {}),
    });
  };

  const handleSave = async () => {
    if (!form.exerciseId) return;
    // On edit a cleared field is sent as null so it's actually cleared; on
    // create it's simply left out.
    const empty = isEdit ? null : undefined;
    const numbers = Object.fromEntries(
      NUMBER_FIELDS.map((key) => {
        const n = Number(form[key]);
        return [key, form[key].trim() && !Number.isNaN(n) ? n : empty];
      }),
    );
    const text = (s: string) => s.trim() || empty;
    const common = {
      ...numbers,
      frequencyTextAr: text(form.frequencyTextAr),
      frequencyTextEn: text(form.frequencyTextEn),
      customInstructionAr: text(form.customInstructionAr),
      customInstructionEn: text(form.customInstructionEn),
    };

    if (isEdit) {
      await update.mutateAsync({ id: assignment!.id, dto: common });
    } else {
      await assign.mutateAsync({
        sessionId,
        dto: { exerciseId: form.exerciseId, sortOrder: nextSortOrder, ...common },
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("editTitle", { name: localizedName(assignment?.exercise, locale) || "—" })
              : t("assignTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>{t("exercise")} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchLibrary")}
                  className="ps-9"
                />
                {isFetching && (
                  <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border p-1">
                {exercises.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">{t("noExercises")}</p>
                ) : (
                  exercises.map((ex) => {
                    const selected = ex.id === form.exerciseId;
                    const region = [
                      localizedName(ex.bodyRegion, locale),
                      localizedName(ex.targetRegion, locale),
                    ].filter(Boolean).join(" / ");
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => pickExercise(ex.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-start text-sm",
                          selected ? "bg-primary/10 font-medium text-primary" : "hover:bg-accent",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{localizedName(ex, locale)}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {region || (locale === "ar" ? ex.nameEn : ex.nameAr)}
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {NUMBER_FIELDS.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{t(key)}</Label>
                <Input
                  type="number" min={0} inputMode="numeric"
                  value={form[key]}
                  onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("frequencyAr")}</Label>
              <Input
                dir="rtl"
                value={form.frequencyTextAr}
                onChange={(e) => set({ frequencyTextAr: e.target.value })}
                placeholder="3 مرات يومياً"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("frequencyEn")}</Label>
              <Input
                dir="ltr"
                value={form.frequencyTextEn}
                onChange={(e) => set({ frequencyTextEn: e.target.value })}
                placeholder="3 times daily"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("instructionAr")}</Label>
              <Textarea dir="rtl" rows={3} value={form.customInstructionAr} onChange={(e) => set({ customInstructionAr: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("instructionEn")}</Label>
              <Textarea dir="ltr" rows={3} value={form.customInstructionEn} onChange={(e) => set({ customInstructionEn: e.target.value })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!form.exerciseId || isPending}>
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isEdit ? tc("save") : t("submitAssign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
