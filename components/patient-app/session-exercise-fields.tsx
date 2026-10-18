"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useExercises, useSessionExercises, useTaxonomy } from "@/lib/hooks/use-patient-app";
import { localizedName, type Assignment } from "@/lib/api/patient-app";

/** Everything the assignment endpoint takes, held as strings while being typed. */
export interface SessionExerciseForm {
  exerciseId: string;
  sets: string;
  reps: string;
  durationSeconds: string;
  holdSeconds: string;
  restSeconds: string;
  timesPerDay: string;
  daysPerWeek: string;
  frequencyTextAr: string;
  frequencyTextEn: string;
  customInstructionAr: string;
  customInstructionEn: string;
  /** Keys a row in an exercise list; never sent to the API. */
  uid?: string;
}

export const emptySessionExerciseForm: SessionExerciseForm = {
  exerciseId: "",
  sets: "", reps: "", durationSeconds: "", holdSeconds: "", restSeconds: "",
  timesPerDay: "", daysPerWeek: "",
  frequencyTextAr: "", frequencyTextEn: "",
  customInstructionAr: "", customInstructionEn: "",
};

let uidSeq = 0;
/** A blank row for an exercise list, with its own key. */
export const newSessionExerciseEntry = (): SessionExerciseForm => ({
  ...emptySessionExerciseForm,
  uid: `ex-${Date.now()}-${++uidSeq}`,
});

/** Seeded from the exercise library's defaults when an exercise is picked. */
const SEEDED_NUMBER_FIELDS = ["sets", "reps", "durationSeconds", "holdSeconds", "restSeconds"] as const;

/** كم مرة باليوم وكم يوم بالأسبوع — رقمان بجانب نص التكرار، بلا افتراضي بالمكتبة. */
const NUMBER_FIELDS = [...SEEDED_NUMBER_FIELDS, "timesPerDay", "daysPerWeek"] as const;

const str = (n?: number | null) => (n != null ? String(n) : "");

/** The saved assignment as form values, for editing it in place. */
export const formFromAssignment = (a: Assignment): SessionExerciseForm => ({
  exerciseId: a.exerciseId,
  sets: str(a.sets),
  reps: str(a.reps),
  durationSeconds: str(a.durationSeconds),
  holdSeconds: str(a.holdSeconds),
  restSeconds: str(a.restSeconds),
  timesPerDay: str(a.timesPerDay),
  daysPerWeek: str(a.daysPerWeek),
  frequencyTextAr: a.frequencyTextAr ?? "",
  frequencyTextEn: a.frequencyTextEn ?? "",
  customInstructionAr: a.customInstructionAr ?? "",
  customInstructionEn: a.customInstructionEn ?? "",
});

/** Everything an existing assignment accepts — the exercise itself can't be swapped. */
export const assignmentUpdateDto = (f: SessionExerciseForm) => {
  const { exerciseId: _exerciseId, ...rest } = sessionExerciseDto(f);
  return rest;
};

/** `null` for a blank field so the API falls back to the exercise's own default. */
const numOrNull = (v: string) => {
  const n = Number(v);
  return v.trim() && !Number.isNaN(n) ? n : null;
};

export const sessionExerciseDto = (f: SessionExerciseForm) => ({
  exerciseId: f.exerciseId,
  sets: numOrNull(f.sets),
  reps: numOrNull(f.reps),
  durationSeconds: numOrNull(f.durationSeconds),
  holdSeconds: numOrNull(f.holdSeconds),
  restSeconds: numOrNull(f.restSeconds),
  timesPerDay: numOrNull(f.timesPerDay),
  daysPerWeek: numOrNull(f.daysPerWeek),
  frequencyTextAr: f.frequencyTextAr.trim() || null,
  frequencyTextEn: f.frequencyTextEn.trim() || null,
  customInstructionAr: f.customInstructionAr.trim() || null,
  customInstructionEn: f.customInstructionEn.trim() || null,
});

/** Region filters for an exercise picker; "" means no filter. */
export interface ExerciseRegionFilter {
  bodyRegionId: string;
  targetRegionId: string;
}

export const emptyRegionFilter: ExerciseRegionFilter = { bodyRegionId: "", targetRegionId: "" };

/** As the list endpoint takes them — unset filters are left out. */
export const regionFilterParams = (f: ExerciseRegionFilter) => ({
  bodyRegionId: f.bodyRegionId || undefined,
  targetRegionId: f.targetRegionId || undefined,
});

/** Radix rejects an empty option value, so "all" needs a sentinel. */
const ALL = "__all__";

/**
 * Body region, then target region — the same pair the exercise library filters
 * by. Target regions belong to a body region, so that one waits for the first.
 */
export function ExerciseRegionFilters({
  value,
  onChange,
  disabled,
}: {
  value: ExerciseRegionFilter;
  onChange: (next: ExerciseRegionFilter) => void;
  disabled?: boolean;
}) {
  const tt = useTranslations("patientApp.taxonomy");
  const locale = useLocale();
  const { data: bodyRegions = [] } = useTaxonomy("body-regions");
  const { data: allTargets = [] } = useTaxonomy("target-regions");
  const targets = value.bodyRegionId ? allTargets.filter((x) => x.bodyRegionId === value.bodyRegionId) : [];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Select
        value={value.bodyRegionId || ALL}
        disabled={disabled}
        onValueChange={(v) => onChange({ bodyRegionId: v === ALL ? "" : v, targetRegionId: "" })}
      >
        <SelectTrigger className="w-full" aria-label={tt("bodyRegion")}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{tt("allBodyRegions")}</SelectItem>
          {bodyRegions.map((r) => (
            <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.targetRegionId || ALL}
        disabled={disabled || !value.bodyRegionId}
        onValueChange={(v) => onChange({ ...value, targetRegionId: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-full" aria-label={tt("targetRegion")}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{tt("allTargetRegions")}</SelectItem>
          {targets.map((r) => (
            <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * The exercise half of "add a session": the same fields as the standalone assign
 * dialog, laid out inline so a session and its exercise are filled in as one form.
 */
export function SessionExerciseFields({
  value,
  onChange,
  disabled,
  lockedExerciseName,
  excludeIds,
}: {
  value: SessionExerciseForm;
  onChange: (next: SessionExerciseForm) => void;
  disabled?: boolean;
  /** Set when editing a saved assignment: the exercise is shown, not re-picked. */
  lockedExerciseName?: string;
  /** Exercises already chosen in other rows, left out of this row's list. */
  excludeIds?: string[];
}) {
  const t = useTranslations("patientApp.programs");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [regions, setRegions] = useState<ExerciseRegionFilter>(emptyRegionFilter);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: allExercises = [], isFetching } = useExercises({
    search: term || undefined,
    ...regionFilterParams(regions),
  });
  const exercises = excludeIds?.length
    ? allExercises.filter((e) => e.id === value.exerciseId || !excludeIds.includes(e.id))
    : allExercises;
  const set = (patch: Partial<SessionExerciseForm>) => onChange({ ...value, ...patch });

  const pick = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    if (ex) setSearch(localizedName(ex, locale));
    setListOpen(false);
    // Seed from the library defaults, leaving anything already typed alone.
    const prefill: Partial<SessionExerciseForm> = {};
    const seed = (field: (typeof SEEDED_NUMBER_FIELDS)[number], v?: number | null) => {
      if (v != null && !value[field]) prefill[field] = String(v);
    };
    seed("sets", ex?.defaultSets);
    seed("reps", ex?.defaultReps);
    seed("durationSeconds", ex?.defaultDurationSeconds);
    seed("holdSeconds", ex?.defaultHoldSeconds);
    seed("restSeconds", ex?.defaultRestSeconds);
    set({ exerciseId: id, ...prefill });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm">{t("exercise")}</Label>
        {lockedExerciseName !== undefined ? (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
            {lockedExerciseName || "—"}
          </p>
        ) : (
        <div className="space-y-1.5">
        <ExerciseRegionFilters
          value={regions}
          disabled={disabled}
          // A new filter is a request to browse, so the list opens on it.
          onChange={(next) => { setRegions(next); setListOpen(true); }}
        />
        {/* Opening is tied to click/typing so the list stays out of the way. */}
        <div
          className="space-y-1.5"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setListOpen(false);
          }}
        >
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              disabled={disabled}
              onChange={(e) => { setSearch(e.target.value); setListOpen(true); }}
              onClick={() => setListOpen(true)}
              placeholder={t("searchLibrary")}
              className="ps-9"
            />
            {isFetching && (
              <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {listOpen && (
            <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-md border p-1">
              {exercises.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">{t("noExercises")}</p>
              ) : (
                exercises.map((ex) => {
                  const selected = ex.id === value.exerciseId;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => pick(ex.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-start text-sm",
                        selected ? "bg-primary/10 font-medium text-primary" : "hover:bg-accent",
                      )}
                    >
                      <span className="block min-w-0 truncate">{localizedName(ex, locale)}</span>
                      {selected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
        </div>
        )}
      </div>

      {/* The dosage waits for an exercise: picking one seeds it from the library. */}
      {(lockedExerciseName !== undefined || !!value.exerciseId) && (
      <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {NUMBER_FIELDS.map((key) => (
          <div key={key} className="space-y-1.5 min-w-0">
            <Label className="text-sm">{t(key)}</Label>
            <Input
              type="number" min={0} inputMode="numeric" disabled={disabled}
              className="w-full [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={value[key]}
              onChange={(e) => set({ [key]: e.target.value } as Partial<SessionExerciseForm>)}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm">{t("frequencyAr")}</Label>
          <Input dir="rtl" disabled={disabled} value={value.frequencyTextAr}
            onChange={(e) => set({ frequencyTextAr: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">{t("frequencyEn")}</Label>
          <Input dir="ltr" disabled={disabled} value={value.frequencyTextEn}
            onChange={(e) => set({ frequencyTextEn: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">{t("instructionAr")}</Label>
          <Textarea rows={2} dir="rtl" disabled={disabled} className="resize-none"
            value={value.customInstructionAr}
            onChange={(e) => set({ customInstructionAr: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">{t("instructionEn")}</Label>
          <Textarea rows={2} dir="ltr" disabled={disabled} className="resize-none"
            value={value.customInstructionEn}
            onChange={(e) => set({ customInstructionEn: e.target.value })} />
        </div>
      </div>
      </>
      )}
    </div>
  );
}

/**
 * Several exercises for one session: a picker per row, and a button for the
 * next one once the current last row has an exercise. Blank rows are ignored
 * on save (see `pickedExercises`).
 */
export function SessionExerciseList({
  value,
  onChange,
  disabled,
}: {
  value: SessionExerciseForm[];
  onChange: (next: SessionExerciseForm[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("patientApp.programs");
  const rows = value.length ? value : [newSessionExerciseEntry()];
  const update = (i: number, next: SessionExerciseForm) => onChange(rows.map((r, j) => (j === i ? next : r)));
  // The last row can't vanish — removing it just clears it.
  const remove = (i: number) =>
    onChange(rows.length > 1 ? rows.filter((_, j) => j !== i) : [newSessionExerciseEntry()]);
  const picked = rows.map((r) => r.exerciseId).filter(Boolean);
  const canAddMore = !!rows[rows.length - 1]?.exerciseId;

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.uid ?? i} className={cn(rows.length > 1 && "rounded-lg border p-3 space-y-2")}>
          {(rows.length > 1 || row.exerciseId) && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{t("exerciseN", { n: i + 1 })}</span>
              <Button
                type="button" variant="ghost" size="sm" disabled={disabled}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <X className="h-3.5 w-3.5" />
                {t("removeExercise")}
              </Button>
            </div>
          )}
          <SessionExerciseFields
            value={row}
            onChange={(next) => update(i, next)}
            disabled={disabled}
            excludeIds={picked.filter((id) => id !== row.exerciseId)}
          />
        </div>
      ))}
      {canAddMore && (
        <Button
          type="button" variant="outline" size="sm" disabled={disabled} className="gap-1.5"
          onClick={() => onChange([...rows, newSessionExerciseEntry()])}
        >
          <Plus className="h-4 w-4" />
          {t("addAnotherExercise")}
        </Button>
      )}
    </div>
  );
}

/** The rows that have an exercise, as assign DTOs numbered from `firstSortOrder`. */
export const pickedExercises = (rows: SessionExerciseForm[], firstSortOrder = 1) =>
  rows
    .filter((r) => r.exerciseId)
    .map((r, i) => ({ ...sessionExerciseDto(r), sortOrder: firstSortOrder + i }));

/**
 * Read-only list of the exercises assigned to one session, for places outside the
 * programs screen (the physio case file) that only need to show them.
 */
export function SessionAssignments({ sessionId }: { sessionId: string }) {
  const t = useTranslations("patientApp.programs");
  const locale = useLocale();
  const { data: assignments = [], isLoading } = useSessionExercises(sessionId);
  if (isLoading || assignments.length === 0) return null;

  /** "3 × 10 · 5s hold · 15s rest" — only the parts that were set. */
  const dosage = (a: Assignment) => {
    const parts: string[] = [];
    if (a.sets && a.reps) parts.push(t("dosageSetsReps", { sets: a.sets, reps: a.reps }));
    else if (a.sets) parts.push(t("dosageSets", { count: a.sets }));
    else if (a.reps) parts.push(t("dosageReps", { count: a.reps }));
    if (a.durationSeconds) parts.push(t("dosageDuration", { count: a.durationSeconds }));
    if (a.holdSeconds) parts.push(t("dosageHold", { count: a.holdSeconds }));
    if (a.restSeconds) parts.push(t("dosageRest", { count: a.restSeconds }));
    if (a.timesPerDay) parts.push(t("dosageTimesPerDay", { count: a.timesPerDay }));
    if (a.daysPerWeek) parts.push(t("dosageDaysPerWeek", { count: a.daysPerWeek }));
    return parts.join(" · ") || "—";
  };

  return (
    <div className="border-t pt-2 space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">
        {t("assignedExercises", { count: assignments.length })}
      </p>
      {assignments.map((a) => {
        const cancelled = a.status === "CANCELLED";
        return (
          <div key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
            <span className={cn("font-medium", cancelled && "text-destructive line-through")}>
              {a.exercise ? localizedName(a.exercise, locale) : "—"}
            </span>
            <span className="text-muted-foreground tabular-nums">{dosage(a)}</span>
          </div>
        );
      })}

    </div>
  );
}
