"use client";

// The three sections of an orthotics reception — طبيب العظمية، أخصائي العلاج
// الفيزيائي، أخصائي الأطراف الصناعية. Everyone who can open the reception reads
// all three; each section turns editable only for its own permission. A section
// is the same form in both modes, so what was entered reads back in its shape.
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useSaveOrthoticsDoctorAssessment, useSaveOrthoticsPhysioAssessment,
  useSaveOrthoticsProsthetistOpinion,
} from "@/lib/hooks/use-clinic-orthotics";
import type {
  OrthoticsDoctorAssessment, OrthoticsPhysioAssessment, OrthoticsProsthetistAssessment, OrthoticsReception,
} from "@/lib/api/clinic-orthotics";
import {
  ACTIVITY_LEVELS, ANKLE_ROM, ASSISTIVE_DEVICES, CEREBRAL_PALSY_TYPES, DEFORMITY_FLEXIBILITY,
  DEFORMITY_STATUS, DIAGNOSIS_TYPES, GAIT_PROBLEMS, HIP_ROM, KNEE_ROM, MOBILITY_LEVELS,
  MUSCLE_MOVEMENTS, MUSCLE_STRENGTHS, MUSCLE_TONES, SENSATIONS, SKIN_CONDITIONS,
  TRUNK_MOVEMENTS, TRUNK_SCALE, TRUNK_SCALE_FIELDS, type Options,
  DAILY_USE_SETTINGS, RECOMMENDED_DEVICES,
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
  ...TRUNK_SCALE_FIELDS.map((f) => f.key), "activityLevel", "physioOpinion",
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

function OrthoticsDeviceCard({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const t = useTranslations("clinic.orthotics");
  // The opinion stays on the prosthetist's own tab; this card holds the rest.
  const a = prosthetistAssessmentOf(reception);
  const s = useSectionDraft<OrthoticsProsthetistAssessment>({
    recommendedDeviceTypes: a.recommendedDeviceTypes,
    recommendedDeviceOther: a.recommendedDeviceOther,
    dailyWearHours: a.dailyWearHours,
    additionalNotes: a.additionalNotes,
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
        <MultiChips options={RECOMMENDED_DEVICES} value={v.recommendedDeviceTypes} onChange={(x) => s.set({ recommendedDeviceTypes: x })} readOnly={ro} />
      </Field>
      {((v.recommendedDeviceTypes ?? []).includes("OTHER") || v.recommendedDeviceOther) && (
        <Field label={t("common.other")}>
          <TextValue value={v.recommendedDeviceOther} onChange={(x) => s.set({ recommendedDeviceOther: x })} readOnly={ro} />
        </Field>
      )}
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
      <Field label={t("device.notes")}>
        <TextValue multiline value={v.additionalNotes} onChange={(x) => s.set({ additionalNotes: x })} readOnly={ro} />
      </Field>
    </SectionCard>
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
