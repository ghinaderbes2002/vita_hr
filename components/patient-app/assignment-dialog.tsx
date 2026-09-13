"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/lib/api/patient-app";
import {
  useAssignExercise, useExercises, useUpdateAssignment,
} from "@/lib/hooks/use-patient-app";

const NUMBER_FIELDS = [
  { key: "sets",            label: "المجموعات" },
  { key: "reps",            label: "التكرارات" },
  { key: "durationSeconds", label: "المدة (ثانية)" },
  { key: "holdSeconds",     label: "الثبات (ثانية)" },
  { key: "restSeconds",     label: "الراحة (ثانية)" },
] as const;

type NumberKey = (typeof NUMBER_FIELDS)[number]["key"];

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
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
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
      NUMBER_FIELDS.map(({ key }) => {
        const n = Number(form[key as NumberKey]);
        return [key, form[key as NumberKey].trim() && !Number.isNaN(n) ? n : empty];
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
            {isEdit ? `تعديل: ${assignment?.exercise?.nameAr ?? "تمرين"}` : "إسناد تمرين للجلسة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>التمرين <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في مكتبة التمارين..."
                  className="pr-9"
                />
                {isFetching && (
                  <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border p-1">
                {exercises.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">لا توجد تمارين</p>
                ) : (
                  exercises.map((ex) => {
                    const selected = ex.id === form.exerciseId;
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
                          <span className="block truncate">{ex.nameAr}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[ex.bodyRegion?.nameAr, ex.targetRegion?.nameAr].filter(Boolean).join(" / ") || ex.nameEn}
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
            {NUMBER_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
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
              <Label>التكرار اليومي بالعربية</Label>
              <Input
                dir="rtl"
                value={form.frequencyTextAr}
                onChange={(e) => set({ frequencyTextAr: e.target.value })}
                placeholder="3 مرات يومياً"
              />
            </div>
            <div className="space-y-1.5">
              <Label>التكرار اليومي بالإنجليزية</Label>
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
              <Label>تعليمات خاصة بالعربية</Label>
              <Textarea dir="rtl" rows={3} value={form.customInstructionAr} onChange={(e) => set({ customInstructionAr: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>تعليمات خاصة بالإنجليزية</Label>
              <Textarea dir="ltr" rows={3} value={form.customInstructionEn} onChange={(e) => set({ customInstructionEn: e.target.value })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={!form.exerciseId || isPending}>
            {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isEdit ? "حفظ" : "إسناد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
