"use client";

// The three sections of an orthotics reception — طبيب العظمية، أخصائي العلاج
// الفيزيائي، أخصائي الأطراف الصناعية. Everyone who can open the reception reads
// all three; each section turns editable only for its own permission. A section
// is the same form in both modes, so what was entered reads back in its shape.
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Loader2, Minus, Pencil, Plus, Save } from "lucide-react";
import { MeasurementDiagram } from "@/components/clinic/measurement-diagram";
import {
  ORTHOTICS_MEASUREMENT_FIELDS, ORTHOTICS_MEASUREMENT_IMAGE, ORTHOTICS_MEASUREMENT_SHEETS,
} from "@/lib/clinic/orthotics-measurement-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useSaveOrthoticsDoctorAssessment, useSaveOrthoticsPhysioAssessment,
  useSaveOrthoticsProsthetistOpinion, useOrthoticsMeasurements, useAddOrthoticsMeasurement,
} from "@/lib/hooks/use-clinic-orthotics";
import type {
  OrthoticsDoctorAssessment, OrthoticsPhysioAssessment, OrthoticsProsthetistAssessment, OrthoticsReception,
  OrthoticsSide, OrthoticsRecommendedDevice, OrthoticsMeasurementSheet,
} from "@/lib/api/clinic-orthotics";
import {
  ACTIVITY_LEVELS, ANKLE_ROM, ASSISTIVE_DEVICES, CEREBRAL_PALSY_TYPES, DEFORMITY_FLEXIBILITY,
  DEFORMITY_STATUS, DIAGNOSIS_TYPES, GAIT_PROBLEMS, HIP_ROM, KNEE_ROM, MOBILITY_LEVELS,
  MUSCLE_MOVEMENTS, MUSCLE_STRENGTHS, MUSCLE_TONES, SENSATIONS, SKIN_CONDITIONS,
  TRUNK_MOVEMENTS, TRUNK_SCALE, TRUNK_SCALE_FIELDS, type Options,
  DAILY_USE_SETTINGS, RECOMMENDED_DEVICES, LIMB_TYPES, SIDES,
  doctorAssessmentOf, physioAssessmentOf, prosthetistAssessmentOf,
} from "./orthotics-labels";

// ── Controls ─────────────────────────────────────────────────────────────────

const chipClass = (on: boolean, readOnly: boolean) =>
  `rounded-full border px-3 py-1 text-xs transition-colors ${
    on
      ? "border-orange-500 bg-orange-500 text-white"
      : readOnly ? "border-border text-muted-foreground" : "border-border hover:bg-muted"
  }`;

/** Single choice (radio) as a row of chips. */
function SingleChips<T extends string>({
  options, value, onChange, readOnly,
}: {
  options: Options<T>;
  value?: T;
  onChange: (v: T) => void;
  readOnly: boolean;
}) {
  const t = useTranslations("clinic.orthotics");
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(o.value)}
          className={chipClass(value === o.value, readOnly)}
        >
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}

/**
 * Multiple choice (checkboxes) as a row of chips. An `exclusive` value — "none",
 * "intact" — can't sit alongside the others: picking it clears them, and
 * picking any other clears it.
 */
function MultiChips<T extends string>({
  options, value, onChange, readOnly, exclusive,
}: {
  options: Options<T>;
  value?: T[];
  onChange: (v: T[]) => void;
  readOnly: boolean;
  exclusive?: T;
}) {
  const t = useTranslations("clinic.orthotics");
  const selected = value ?? [];
  const toggle = (v: T) => {
    if (selected.includes(v)) return onChange(selected.filter((x) => x !== v));
    if (v === exclusive) return onChange([v]);
    onChange([...selected.filter((x) => x !== exclusive), v]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={readOnly}
          onClick={() => toggle(o.value)}
          className={chipClass(selected.includes(o.value), readOnly)}
        >
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">
        {label}
        {hint && <span className="ms-1.5 font-normal text-muted-foreground">({hint})</span>}
      </p>
      {children}
    </div>
  );
}

function TextValue({
  value, onChange, readOnly, multiline, type, dir, placeholder,
}: {
  value?: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  multiline?: boolean;
  type?: string;
  dir?: "ltr";
  placeholder?: string;
}) {
  if (readOnly) {
    return (
      <div
        dir={dir}
        className={`rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word ${multiline ? "min-h-16" : ""} ${value ? "" : "text-muted-foreground"}`}
      >
        {value || "—"}
      </div>
    );
  }
  return multiline
    ? <Textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    : <Input type={type} dir={dir} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h4 className="border-b pb-1 pt-2 text-sm font-semibold text-orange-600">{children}</h4>;
}

// ── Section shell ────────────────────────────────────────────────────────────

const blank = (v: unknown) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);
const sameValue = (a: unknown, b: unknown) =>
  (blank(a) && blank(b)) ||
  JSON.stringify(Array.isArray(a) ? [...a].sort() : a) === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);

/**
 * What the PATCH should carry: only the fields that changed. Text is trimmed and
 * a text field cleared on purpose goes as "" so the API blanks it; a list goes
 * as the full list, empty included.
 */
function changesOf<T extends object>(draft: T, saved: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(draft) as (keyof T)[]).forEach((k) => {
    const raw = draft[k];
    // A list of free-text entries (the functional goals) loses its blank slots.
    const next = (typeof raw === "string"
      ? raw.trim()
      : Array.isArray(raw)
      ? raw.map((x) => (typeof x === "string" ? x.trim() : x)).filter((x) => x !== "")
      : raw) as T[keyof T];
    if (!sameValue(next, saved[k])) out[k] = next;
  });
  return out;
}

function SectionCard({
  title, canEdit, editing, onEdit, onCancel, onSave, saving, dirty, children,
}: {
  title: string;
  canEdit: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("clinic.orthotics");
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {canEdit && (editing ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>{t("common.cancel")}</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
                onClick={onSave}
                disabled={saving || !dirty}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("common.save")}
              </Button>
            </div>
          ) : (
            <Button size="sm" className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/** Draft state for a section: seeded from the saved values whenever editing starts. */
function useSectionDraft<T extends object>(saved: T) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(saved);
  const current = editing ? draft : saved;
  const set = (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch }));
  const start = () => { setDraft(saved); setEditing(true); };
  const changes = changesOf(draft, saved);
  return { editing, setEditing, current, set, start, changes, dirty: editing && Object.keys(changes).length > 0 };
}

// ── طبيب العظمية ─────────────────────────────────────────────────────────────

const DOCTOR_KEYS: (keyof OrthoticsDoctorAssessment)[] = [
  "diagnosisTypes", "cerebralPalsyType", "footDropCause", "diagnosisOther", "injuryStartDate",
  "surgicalHistory", "familyHistory", "chiefComplaint", "muscleTone", "spasticityLevel",
  "sensation", "thighMuscleStrength", "legFootMuscleStrength", "skinConditions",
  "pressurePointsLocation", "doctorOpinion",
];

const YES_NO: Options<"YES" | "NO"> = [
  { value: "YES", label: "options.YES_NO.YES" },
  { value: "NO", label: "options.YES_NO.NO" },
];

const pick = <T extends object>(src: T, keys: (keyof T)[]) =>
  Object.fromEntries(keys.map((k) => [k, src[k] ?? undefined])) as T;

export function OrthoticsDoctorSection({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const t = useTranslations("clinic.orthotics");
  const saved = pick(doctorAssessmentOf(reception), DOCTOR_KEYS);
  const s = useSectionDraft(saved);
  const save = useSaveOrthoticsDoctorAssessment();
  const v = s.current;
  const ro = !s.editing;
  const dx = v.diagnosisTypes ?? [];

  return (
    <SectionCard
      title={t("doctor.title")}
      canEdit={canEdit}
      editing={s.editing}
      onEdit={s.start}
      onCancel={() => s.setEditing(false)}
      saving={save.isPending}
      dirty={s.dirty}
      onSave={() => save.mutate({ id: reception.id, dto: s.changes }, { onSuccess: () => s.setEditing(false) })}
    >
      <SubHeading>{t("doctor.medicalHistory")}</SubHeading>
      <Field label={t("doctor.diagnosis")}>
        <MultiChips options={DIAGNOSIS_TYPES} value={dx} onChange={(x) => s.set({ diagnosisTypes: x })} readOnly={ro} />
      </Field>
      {(dx.includes("CEREBRAL_PALSY") || v.cerebralPalsyType) && (
        <Field label={t("doctor.cpType")}>
          <SingleChips options={CEREBRAL_PALSY_TYPES} value={v.cerebralPalsyType} onChange={(x) => s.set({ cerebralPalsyType: x })} readOnly={ro} />
        </Field>
      )}
      {(dx.includes("FOOT_DROP") || v.footDropCause) && (
        <Field label={t("doctor.footDropCause")}>
          <TextValue value={v.footDropCause} onChange={(x) => s.set({ footDropCause: x })} readOnly={ro} />
        </Field>
      )}
      {(dx.includes("OTHER") || v.diagnosisOther) && (
        <Field label={t("common.other")}>
          <TextValue value={v.diagnosisOther} onChange={(x) => s.set({ diagnosisOther: x })} readOnly={ro} />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("doctor.injuryDate")}>
          <TextValue type="date" dir="ltr" value={v.injuryStartDate} onChange={(x) => s.set({ injuryStartDate: x })} readOnly={ro} />
        </Field>
        <Field label={t("doctor.chiefComplaint")}>
          <TextValue value={v.chiefComplaint} onChange={(x) => s.set({ chiefComplaint: x })} readOnly={ro} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("doctor.surgicalHistory")} hint={t("doctor.surgicalHint")}>
          <TextValue multiline value={v.surgicalHistory} onChange={(x) => s.set({ surgicalHistory: x })} readOnly={ro} />
        </Field>
        <Field label={t("doctor.familyHistory")}>
          <TextValue multiline value={v.familyHistory} onChange={(x) => s.set({ familyHistory: x })} readOnly={ro} />
        </Field>
      </div>
      <SubHeading>{t("doctor.clinicalExam")}</SubHeading>
      <Field label={t("doctor.muscleTone")}>
        <SingleChips options={MUSCLE_TONES} value={v.muscleTone} onChange={(x) => s.set({ muscleTone: x })} readOnly={ro} />
      </Field>
      <Field label={t("doctor.spasticity")} hint={t("doctor.spasticityHint")}>
        <TextValue value={v.spasticityLevel} onChange={(x) => s.set({ spasticityLevel: x })} readOnly={ro} placeholder={t("doctor.spasticityPlaceholder")} />
      </Field>
      <Field label={t("doctor.sensation")}>
        <SingleChips options={SENSATIONS} value={v.sensation} onChange={(x) => s.set({ sensation: x })} readOnly={ro} />
      </Field>
      <p className="text-xs font-semibold">{t("doctor.muscleStrength")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("doctor.thigh")}>
          <SingleChips options={MUSCLE_STRENGTHS} value={v.thighMuscleStrength} onChange={(x) => s.set({ thighMuscleStrength: x })} readOnly={ro} />
        </Field>
        <Field label={t("doctor.legFoot")}>
          <SingleChips options={MUSCLE_STRENGTHS} value={v.legFootMuscleStrength} onChange={(x) => s.set({ legFootMuscleStrength: x })} readOnly={ro} />
        </Field>
      </div>
      <SubHeading>{t("doctor.skin")}</SubHeading>
      <Field label={t("doctor.skin")}>
        <MultiChips options={SKIN_CONDITIONS} exclusive="INTACT" value={v.skinConditions} onChange={(x) => s.set({ skinConditions: x })} readOnly={ro} />
      </Field>
      {((v.skinConditions ?? []).includes("PRESSURE_POINTS") || v.pressurePointsLocation) && (
        <Field label={t("doctor.pressureLocation")}>
          <TextValue value={v.pressurePointsLocation} onChange={(x) => s.set({ pressurePointsLocation: x })} readOnly={ro} />
        </Field>
      )}

      <SubHeading>{t("doctor.finalOpinion")}</SubHeading>
      <Field label={t("doctor.opinion")}>
        <TextValue multiline value={v.doctorOpinion} onChange={(x) => s.set({ doctorOpinion: x })} readOnly={ro} />
      </Field>
    </SectionCard>
  );
}

// ── أخصائي العلاج الفيزيائي ───────────────────────────────────────────────────

const PHYSIO_KEYS: (keyof OrthoticsPhysioAssessment)[] = [
  "mobilityLevel", "assistiveDevices", "gaitProblems", "hipROM", "kneeROM", "ankleROM",
  "muscleStrengthMovements", "deformityFlexibility", "deformityStatus", "trunkStrengthMovements",
  ...TRUNK_SCALE_FIELDS.map((f) => f.key), "activityLevel", "dailyWearHours", "physioOpinion",
];

export function OrthoticsPhysioSection({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const t = useTranslations("clinic.orthotics");
  const saved = pick(physioAssessmentOf(reception), PHYSIO_KEYS);
  const s = useSectionDraft(saved);
  const save = useSaveOrthoticsPhysioAssessment();
  const v = s.current;
  const ro = !s.editing;

  return (
    <SectionCard
      title={t("physio.title")}
      canEdit={canEdit}
      editing={s.editing}
      onEdit={s.start}
      onCancel={() => s.setEditing(false)}
      saving={save.isPending}
      dirty={s.dirty}
      onSave={() => save.mutate({ id: reception.id, dto: s.changes }, { onSuccess: () => s.setEditing(false) })}
    >
      <SubHeading>{t("physio.gait")}</SubHeading>
      <Field label={t("physio.mobility")}>
        <SingleChips options={MOBILITY_LEVELS} value={v.mobilityLevel} onChange={(x) => s.set({ mobilityLevel: x })} readOnly={ro} />
      </Field>
      <Field label={t("physio.assistive")}>
        <MultiChips options={ASSISTIVE_DEVICES} exclusive="NONE" value={v.assistiveDevices} onChange={(x) => s.set({ assistiveDevices: x })} readOnly={ro} />
      </Field>
      <Field label={t("physio.gaitProblems")}>
        <MultiChips options={GAIT_PROBLEMS} value={v.gaitProblems} onChange={(x) => s.set({ gaitProblems: x })} readOnly={ro} />
      </Field>

      <SubHeading>{t("physio.rom")}</SubHeading>
      <Field label={t("physio.hip")}>
        <SingleChips options={HIP_ROM} value={v.hipROM} onChange={(x) => s.set({ hipROM: x })} readOnly={ro} />
      </Field>
      <Field label={t("physio.knee")}>
        <SingleChips options={KNEE_ROM} value={v.kneeROM} onChange={(x) => s.set({ kneeROM: x })} readOnly={ro} />
      </Field>
      <Field label={t("physio.ankle")}>
        <SingleChips options={ANKLE_ROM} value={v.ankleROM} onChange={(x) => s.set({ ankleROM: x })} readOnly={ro} />
      </Field>

      <SubHeading>{t("physio.mmt")}</SubHeading>
      <Field label={t("physio.movements")}>
        <MultiChips options={MUSCLE_MOVEMENTS} value={v.muscleStrengthMovements} onChange={(x) => s.set({ muscleStrengthMovements: x })} readOnly={ro} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("physio.deformityFlexibility")}>
          <SingleChips options={DEFORMITY_FLEXIBILITY} value={v.deformityFlexibility} onChange={(x) => s.set({ deformityFlexibility: x })} readOnly={ro} />
        </Field>
        <Field label={t("physio.deformityStatus")}>
          <SingleChips options={DEFORMITY_STATUS} value={v.deformityStatus} onChange={(x) => s.set({ deformityStatus: x })} readOnly={ro} />
        </Field>
      </div>

      <SubHeading>{t("physio.trunk")}</SubHeading>
      <Field label={t("physio.trunkStrength")}>
        <MultiChips options={TRUNK_MOVEMENTS} value={v.trunkStrengthMovements} onChange={(x) => s.set({ trunkStrengthMovements: x })} readOnly={ro} />
      </Field>
      <p className="text-xs font-semibold">{t("physio.trunkBalance")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TRUNK_SCALE_FIELDS.map((f) => (
          <Field key={f.key} label={t(f.label)}>
            <SingleChips options={TRUNK_SCALE} value={v[f.key]} onChange={(x) => s.set({ [f.key]: x } as Partial<OrthoticsPhysioAssessment>)} readOnly={ro} />
          </Field>
        ))}
      </div>

      <SubHeading>{t("physio.activityOpinion")}</SubHeading>
      <Field label={t("physio.activity")}>
        <SingleChips options={ACTIVITY_LEVELS} value={v.activityLevel} onChange={(x) => s.set({ activityLevel: x })} readOnly={ro} />
      </Field>
      <Field label={t("device.hours")} hint={t("device.hoursHint")}>
        <TextValue
          type="number"
          dir="ltr"
          value={v.dailyWearHours == null ? "" : String(v.dailyWearHours)}
          // A cleared field goes as null so the API blanks it.
          onChange={(x) => s.set({ dailyWearHours: x === "" ? null : Number(x) })}
          readOnly={ro}
        />
      </Field>
      <Field label={t("physio.opinion")}>
        <TextValue multiline value={v.physioOpinion} onChange={(x) => s.set({ physioOpinion: x })} readOnly={ro} />
      </Field>
    </SectionCard>
  );
}

// ── أخصائي الأطراف الصناعية ───────────────────────────────────────────────────

export function OrthoticsProsthetistSection({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const t = useTranslations("clinic.orthotics");
  const s = useSectionDraft<OrthoticsProsthetistAssessment>({
    prosthetistOpinion: prosthetistAssessmentOf(reception).prosthetistOpinion,
  });
  const save = useSaveOrthoticsProsthetistOpinion();

  return (
    <SectionCard
      title={t("prosthetist.title")}
      canEdit={canEdit}
      editing={s.editing}
      onEdit={s.start}
      onCancel={() => s.setEditing(false)}
      saving={save.isPending}
      dirty={s.dirty}
      onSave={() => save.mutate({ id: reception.id, dto: s.changes }, { onSuccess: () => s.setEditing(false) })}
    >
      <Field label={t("prosthetist.opinion")}>
        <TextValue
          multiline
          value={s.current.prosthetistOpinion}
          onChange={(x) => s.set({ prosthetistOpinion: x })}
          readOnly={!s.editing}
        />
      </Field>
    </SectionCard>
  );
}

// ── التاريخ السريري والتوصيات ─────────────────────────────────────────────────
// A page of the paper form of its own. Its fields are saved through the two
// endpoints the API put them on: the history and goals with the doctor's
// assessment, the device evaluation with the prosthetist's — so each card
// follows that role's edit permission.

const HISTORY_KEYS: (keyof OrthoticsDoctorAssessment)[] = [
  "birthHistory", "previousOrthosisUse", "previousOrthosisDetails", "surgicalHistory", "medicalHistory",
  "functionalGoals", "dailyUseSettings", "dailyUseOther",
  "appliancesCount", "affectedLimbType", "affectedSide", "soundLimbDescription",
];

function OrthoticsClinicalHistoryCard({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const t = useTranslations("clinic.orthotics");
  const saved = pick(doctorAssessmentOf(reception), HISTORY_KEYS);
  const s = useSectionDraft(saved);
  const save = useSaveOrthoticsDoctorAssessment();
  const v = s.current;
  const ro = !s.editing;

  return (
    <SectionCard
      title={t("history.title")}
      canEdit={canEdit}
      editing={s.editing}
      onEdit={s.start}
      onCancel={() => s.setEditing(false)}
      saving={save.isPending}
      dirty={s.dirty}
      onSave={() => save.mutate({ id: reception.id, dto: s.changes }, { onSuccess: () => s.setEditing(false) })}
    >
      <Field label={t("history.birth")}>
        <TextValue multiline value={v.birthHistory} onChange={(x) => s.set({ birthHistory: x })} readOnly={ro} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("doctor.appliancesCount")}>
          <TextValue
            type="number"
            dir="ltr"
            value={v.appliancesCount == null ? "" : String(v.appliancesCount)}
            // A cleared field goes as null so the API blanks it.
            onChange={(x) => s.set({ appliancesCount: x === "" ? null : Math.max(0, Math.trunc(Number(x))) })}
            readOnly={ro}
          />
        </Field>
        <Field label={t("doctor.affectedLimbType")}>
          <SingleChips options={LIMB_TYPES} value={v.affectedLimbType} onChange={(x) => s.set({ affectedLimbType: x })} readOnly={ro} />
        </Field>
        <Field label={t("doctor.affectedSide")}>
          <SingleChips options={SIDES} value={v.affectedSide} onChange={(x) => s.set({ affectedSide: x })} readOnly={ro} />
        </Field>
      </div>
      <Field label={t("doctor.soundLimb")}>
        <TextValue multiline value={v.soundLimbDescription} onChange={(x) => s.set({ soundLimbDescription: x })} readOnly={ro} />
      </Field>
      <Field label={t("history.previousUse")}>
        <SingleChips
          options={YES_NO}
          value={v.previousOrthosisUse == null ? undefined : v.previousOrthosisUse ? "YES" : "NO"}
          onChange={(x) => s.set({ previousOrthosisUse: x === "YES" })}
          readOnly={ro}
        />
      </Field>
      {(v.previousOrthosisUse || v.previousOrthosisDetails) && (
        <Field label={t("history.previousDetails")}>
          <TextValue multiline value={v.previousOrthosisDetails} onChange={(x) => s.set({ previousOrthosisDetails: x })} readOnly={ro} />
        </Field>
      )}
      {/* The same field as the doctor's form — editing it here updates both. */}
      <Field label={t("doctor.surgicalHistory")} hint={t("history.surgicalHint")}>
        <TextValue multiline value={v.surgicalHistory} onChange={(x) => s.set({ surgicalHistory: x })} readOnly={ro} />
      </Field>
      <Field label={t("history.medical")}>
        <TextValue multiline value={v.medicalHistory} onChange={(x) => s.set({ medicalHistory: x })} readOnly={ro} />
      </Field>

      <SubHeading>{t("history.goals")}</SubHeading>
      {ro ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Field key={i} label={t("history.goal", { n: i + 1 })}>
              <TextValue value={v.functionalGoals?.[i]} onChange={() => {}} readOnly />
            </Field>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Field key={i} label={t("history.goal", { n: i + 1 })}>
              <Input
                value={v.functionalGoals?.[i] ?? ""}
                onChange={(e) => {
                  const goals = [...(v.functionalGoals ?? [])];
                  while (goals.length <= i) goals.push("");
                  goals[i] = e.target.value;
                  s.set({ functionalGoals: goals });
                }}
              />
            </Field>
          ))}
        </div>
      )}
      <Field label={t("history.dailyUse")}>
        <MultiChips options={DAILY_USE_SETTINGS} value={v.dailyUseSettings} onChange={(x) => s.set({ dailyUseSettings: x })} readOnly={ro} />
      </Field>
      {((v.dailyUseSettings ?? []).includes("OTHER") || v.dailyUseOther) && (
        <Field label={t("common.other")}>
          <TextValue value={v.dailyUseOther} onChange={(x) => s.set({ dailyUseOther: x })} readOnly={ro} />
        </Field>
      )}
    </SectionCard>
  );
}

type DeviceCounts = Partial<Record<OrthoticsRecommendedDevice, number>>;

/**
 * Every device type in form order, missing ones as 0 — one fixed shape, so a
 * draft compares equal to what was saved and the whole object can be sent as
 * the replacement the API expects.
 */
const normalizeCounts = (c?: DeviceCounts | null): DeviceCounts =>
  Object.fromEntries(RECOMMENDED_DEVICES.map((o) => [o.value, Math.max(0, c?.[o.value] ?? 0)]));

/**
 * The device types as chips, each with how many of it are needed. Ticking a
 * type is the chip; the count is set with − / +. Raising the count of an
 * unticked type ticks it, and unticking a type clears its count.
 */
function DeviceCountChips({
  value, counts, onChange, readOnly,
}: {
  value?: OrthoticsRecommendedDevice[];
  counts: DeviceCounts;
  onChange: (types: OrthoticsRecommendedDevice[], counts: DeviceCounts) => void;
  readOnly: boolean;
}) {
  const t = useTranslations("clinic.orthotics");
  const selected = value ?? [];
  const toggle = (d: OrthoticsRecommendedDevice) =>
    selected.includes(d)
      ? onChange(selected.filter((x) => x !== d), { ...counts, [d]: 0 })
      : onChange([...selected, d], counts);
  const step = (d: OrthoticsRecommendedDevice, by: 1 | -1) => {
    const n = Math.max(0, (counts[d] ?? 0) + by);
    onChange(by > 0 && !selected.includes(d) ? [...selected, d] : selected, { ...counts, [d]: n });
  };
  const stepBtn = "flex h-6 w-6 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-2">
      {RECOMMENDED_DEVICES.map((o) => {
        const on = selected.includes(o.value);
        const n = counts[o.value] ?? 0;
        return (
          <div
            key={o.value}
            className={`flex items-center gap-1 rounded-full border p-0.5 ${on ? "border-orange-500" : "border-border"}`}
          >
            <button type="button" disabled={readOnly} onClick={() => toggle(o.value)} className={chipClass(on, readOnly)}>
              {t(o.label)}
            </button>
            {!readOnly && (
              <button type="button" className={stepBtn} onClick={() => step(o.value, -1)} disabled={n === 0} aria-label="−">
                <Minus className="h-3 w-3" />
              </button>
            )}
            <span className={`min-w-6 text-center text-xs font-semibold tabular-nums ${n ? "text-foreground" : "text-muted-foreground"}`}>
              {n}
            </span>
            {!readOnly && (
              <button type="button" className={stepBtn} onClick={() => step(o.value, 1)} aria-label="+">
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrthoticsDeviceCard({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const t = useTranslations("clinic.orthotics");
  // The opinion stays on the prosthetist's own card; this card holds the rest.
  const a = prosthetistAssessmentOf(reception);
  const s = useSectionDraft<OrthoticsProsthetistAssessment>({
    recommendedDeviceTypes: a.recommendedDeviceTypes,
    recommendedDeviceOther: a.recommendedDeviceOther,
    additionalNotes: a.additionalNotes,
    deviceUsageCounts: normalizeCounts(reception.deviceUsageCounts),
  });
  const save = useSaveOrthoticsProsthetistOpinion();
  const v = s.current;
  const ro = !s.editing;

  return (
    <SectionCard
      title={t("device.title")}
      canEdit={canEdit}
      editing={s.editing}
      onEdit={s.start}
      onCancel={() => s.setEditing(false)}
      saving={save.isPending}
      dirty={s.dirty}
      onSave={() => save.mutate({ id: reception.id, dto: s.changes }, { onSuccess: () => s.setEditing(false) })}
    >
      <Field label={t("device.type")}>
        <DeviceCountChips
          value={v.recommendedDeviceTypes}
          counts={v.deviceUsageCounts ?? {}}
          onChange={(types, counts) => s.set({ recommendedDeviceTypes: types, deviceUsageCounts: counts })}
          readOnly={ro}
        />
      </Field>
      {((v.recommendedDeviceTypes ?? []).includes("OTHER") || v.recommendedDeviceOther) && (
        <Field label={t("common.other")}>
          <TextValue value={v.recommendedDeviceOther} onChange={(x) => s.set({ recommendedDeviceOther: x })} readOnly={ro} />
        </Field>
      )}
      <Field label={t("device.notes")}>
        <TextValue multiline value={v.additionalNotes} onChange={(x) => s.set({ additionalNotes: x })} readOnly={ro} />
      </Field>
    </SectionCard>
  );
}

// ── ورقة القياس ───────────────────────────────────────────────────────────────
// Like the prosthetics measurement sheets: each save appends a new sheet, a
// saved sheet reads back on the same drawing and is never edited.

const MEASUREMENT_SHEET_OPTIONS: Options<OrthoticsMeasurementSheet> =
  ORTHOTICS_MEASUREMENT_SHEETS.map((s) => ({ value: s, label: `measurement.sheets.${s}` }));

export function OrthoticsMeasurementCard({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const t = useTranslations("clinic.orthotics");
  const { data: sheets = [], isLoading } = useOrthoticsMeasurements(reception.id);
  const add = useAddOrthoticsMeasurement(reception.id);
  const defaultSide = doctorAssessmentOf(reception).affectedSide ?? "RIGHT";
  // A KAFO is measured on the full-leg drawing; anything else starts below the knee.
  const defaultSheet: OrthoticsMeasurementSheet =
    (reception.recommendedDeviceTypes ?? []).includes("KAFO") ? "FULL_LEG" : "BELOW_KNEE";
  const [adding, setAdding] = useState(false);
  const [sheet, setSheet] = useState<OrthoticsMeasurementSheet>(defaultSheet);
  const [side, setSide] = useState<OrthoticsSide>(defaultSide);
  const [notes, setNotes] = useState("");
  // Kept per drawing, so switching to look at another sheet loses nothing typed.
  const [values, setValues] = useState<Partial<Record<OrthoticsMeasurementSheet, Record<string, string>>>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const start = () => {
    setSheet(defaultSheet); setSide(defaultSide); setNotes(""); setValues({}); setAdding(true);
  };
  const current = values[sheet] ?? {};
  // Blank boxes are left out, so a sheet only carries what was measured.
  const filled = Object.fromEntries(
    Object.entries(current).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== ""),
  );
  const save = () => add.mutate(
    { sheet, side, values: filled, ...(notes.trim() ? { notes: notes.trim() } : {}) },
    { onSuccess: () => setAdding(false) },
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("measurement.title")}</CardTitle>
          {canEdit && (adding ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={add.isPending}>{t("common.cancel")}</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
                onClick={save}
                disabled={add.isPending || Object.keys(filled).length === 0}
                title={Object.keys(filled).length === 0 ? t("measurement.emptySheet") : undefined}
              >
                {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("measurement.save")}
              </Button>
            </div>
          ) : (
            <Button size="sm" className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600" onClick={start}>
              <Plus className="h-3.5 w-3.5" />
              {t("measurement.new")}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="space-y-4 rounded-lg border border-orange-200 p-3">
            <p className="text-xs text-muted-foreground">{t("measurement.hint")}</p>
            <Field label={t("measurement.sheet")}>
              <SingleChips options={MEASUREMENT_SHEET_OPTIONS} value={sheet} onChange={setSheet} readOnly={false} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("measurement.side")}>
                <SingleChips options={SIDES} value={side} onChange={setSide} readOnly={false} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("measurement.notes")}>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("measurement.notesPlaceholder")} />
                </Field>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg bg-white">
              <div className="min-w-170 sm:min-w-0">
                <MeasurementDiagram
                  key={sheet}
                  imageSrc={ORTHOTICS_MEASUREMENT_IMAGE[sheet]}
                  fields={ORTHOTICS_MEASUREMENT_FIELDS[sheet]}
                  sound={{}}
                  affected={current}
                  onChange={(_, k, v) => setValues((s) => ({ ...s, [sheet]: { ...(s[sheet] ?? {}), [k]: v } }))}
                />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : sheets.length === 0 ? (
          !adding && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t("measurement.empty")}</p>
        ) : (
          <div className="space-y-2">
            {sheets.map((m) => {
              const open = openId === m.id;
              // Sheets saved before the picker existed were all below-knee.
              const mSheet: OrthoticsMeasurementSheet = m.sheet in ORTHOTICS_MEASUREMENT_FIELDS ? m.sheet : "BELOW_KNEE";
              return (
                <div key={m.id} className="overflow-hidden rounded-lg border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-3 text-sm hover:bg-muted/40"
                    onClick={() => setOpenId(open ? null : m.id)}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                        {t(`measurement.sheets.${mSheet}`)}
                      </span>
                      <span className="rounded-full border px-2 py-0.5 text-xs">{t(`options.SIDES.${m.side}`)}</span>
                      <span className="text-muted-foreground" dir="ltr">
                        {new Date(m.examinedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", hour12: true })}
                      </span>
                      {m.notes && <span className="text-xs text-muted-foreground">— {m.notes}</span>}
                    </span>
                    {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </button>
                  {open && (
                    <div className="overflow-x-auto border-t bg-white p-3">
                      <div className="min-w-170 sm:min-w-0">
                        <MeasurementDiagram
                          imageSrc={ORTHOTICS_MEASUREMENT_IMAGE[mSheet]}
                          fields={ORTHOTICS_MEASUREMENT_FIELDS[mSheet]}
                          sound={{}}
                          affected={m.values ?? {}}
                          onChange={() => {}}
                          disabled
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrthoticsClinicalHistoryTab({
  reception, canEditHistory, canEditDevice,
}: {
  reception: OrthoticsReception;
  canEditHistory: boolean;
  canEditDevice: boolean;
}) {
  return (
    <div className="space-y-4">
      <OrthoticsClinicalHistoryCard reception={reception} canEdit={canEditHistory} />
      <OrthoticsDeviceCard reception={reception} canEdit={canEditDevice} />
    </div>
  );
}
