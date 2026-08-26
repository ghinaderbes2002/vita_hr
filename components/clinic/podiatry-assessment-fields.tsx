"use client";

// The body of the podiatry assessment (نموذج تقييم القدم الاحترافي): the eight
// clinical sections plus the insole choice and the notes.
// Every label comes from `clinic.podiatry.form`, so the sheet reads in the
// user's locale; the Arabic there is the printed VitaFoot sheet's own wording.
// One component serves both the edit dialog and the read-only tab — `readOnly`
// swaps the controls for plain marks, so the saved form reads back in exactly
// the layout it was filled in.
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PodiatryArchArchitecture, PodiatryDeformityType, PodiatryEdemaType, PodiatryFootwear,
  PodiatryInsoleType, PodiatryJackTest, PodiatryMainCause, PodiatryOutsoleWear,
  PodiatryPainCharacteristic, PodiatryPainLocation, PodiatryRearfootAlignment,
  PodiatryRomState, PodiatrySession, PodiatrySessionDto, PodiatryTooManyToes,
  PodiatryWalkingLine,
} from "@/lib/api/clinic-podiatry";
import {
  ARCH_ARCHITECTURE, DEFORMITY_TYPE, EDEMA_TYPE, FOOTWEAR, FOOT_MEASUREMENT_KEYS,
  FormT, INSOLE_TYPE_VALUES, JACK_TEST, MAIN_CAUSE, OUTSOLE_WEAR, OptGroup,
  PAIN_CHARACTERISTIC, PAIN_LOCATION, PALPATION_KEYS, REARFOOT_ALIGNMENT, ROM,
  TOO_MANY_TOES, WALKING_LINE,
} from "./podiatry-session-schema";

// ── Value shape ──────────────────────────────────────────────────────────────
// The same tree the API takes, with every field present so the inputs stay
// controlled; `assessmentToDto` drops what is still empty.
export interface AssessmentValue {
  subjectiveHistory: {
    mainCause: PodiatryMainCause[];
    painLocation: PodiatryPainLocation[];
    vasScore: string;
    painCharacteristics: PodiatryPainCharacteristic[];
  };
  visualInspection: {
    leftRearfootAlignment: PodiatryRearfootAlignment[];
    rightRearfootAlignment: PodiatryRearfootAlignment[];
    leftTooManyToes: PodiatryTooManyToes[];
    leftTooManyToesCount: string;
    rightTooManyToes: PodiatryTooManyToes[];
    rightTooManyToesCount: string;
    leftArchArchitecture: PodiatryArchArchitecture[];
    rightArchArchitecture: PodiatryArchArchitecture[];
    halluxValgus: boolean;
    halluxValgusType: PodiatryDeformityType[];
    tailorsBunion: boolean;
    tailorsBunionType: PodiatryDeformityType[];
    hammerToes: boolean;
    hammerToesAffected: string;
    clawToes: boolean;
    clawToesAffected: string;
    malletToes: boolean;
    malletToesAffected: string;
    hyperkeratosisCallus: boolean;
    hyperkeratosisLocation: string;
    preTrophicLesions: boolean;
    preTrophicLesionsNotes: string;
    edema: boolean;
    edemaType: PodiatryEdemaType[];
  };
  palpation: { plantar: boolean; medial: boolean; lateral: boolean; posterior: boolean; dorsal: boolean };
  rangeOfMotion: { ankleDorsiflexion: PodiatryRomState[]; anklePlantarflexion: PodiatryRomState[] };
  dynamicAnalysis: {
    leftJackTest: PodiatryJackTest[];
    rightJackTest: PodiatryJackTest[];
    leftWalkingLine: PodiatryWalkingLine[];
    rightWalkingLine: PodiatryWalkingLine[];
  };
  shoeWearPattern: { currentFootwear: PodiatryFootwear[]; outsoleWear: PodiatryOutsoleWear[] };
  footMeasurements: Record<string, string>;
  insoleType: PodiatryInsoleType[];
  notes: string;
}

const emptyMeasurements = (): Record<string, string> =>
  Object.fromEntries(
    FOOT_MEASUREMENT_KEYS.flatMap((k) => [[`${k}Left`, ""], [`${k}Right`, ""]]),
  );

export const emptyAssessment = (): AssessmentValue => ({
  subjectiveHistory: { mainCause: [], painLocation: [], vasScore: "", painCharacteristics: [] },
  visualInspection: {
    leftRearfootAlignment: [], rightRearfootAlignment: [],
    leftTooManyToes: [], leftTooManyToesCount: "",
    rightTooManyToes: [], rightTooManyToesCount: "",
    leftArchArchitecture: [], rightArchArchitecture: [],
    halluxValgus: false, halluxValgusType: [],
    tailorsBunion: false, tailorsBunionType: [],
    hammerToes: false, hammerToesAffected: "",
    clawToes: false, clawToesAffected: "",
    malletToes: false, malletToesAffected: "",
    hyperkeratosisCallus: false, hyperkeratosisLocation: "",
    preTrophicLesions: false, preTrophicLesionsNotes: "",
    edema: false, edemaType: [],
  },
  palpation: { plantar: false, medial: false, lateral: false, posterior: false, dorsal: false },
  rangeOfMotion: { ankleDorsiflexion: [], anklePlantarflexion: [] },
  dynamicAnalysis: { leftJackTest: [], rightJackTest: [], leftWalkingLine: [], rightWalkingLine: [] },
  shoeWearPattern: { currentFootwear: [], outsoleWear: [] },
  footMeasurements: emptyMeasurements(),
  insoleType: [],
  notes: "",
});

/** Reads a stored session into the form shape, filling in whatever it omits. */
export const assessmentOf = (s?: PodiatrySession | null): AssessmentValue => {
  const e = emptyAssessment();
  if (!s) return e;
  return {
    subjectiveHistory: { ...e.subjectiveHistory, ...(s.subjectiveHistory ?? {}) },
    visualInspection: { ...e.visualInspection, ...(s.visualInspection ?? {}) },
    palpation: { ...e.palpation, ...(s.palpation ?? {}) },
    rangeOfMotion: { ...e.rangeOfMotion, ...(s.rangeOfMotion ?? {}) },
    dynamicAnalysis: { ...e.dynamicAnalysis, ...(s.dynamicAnalysis ?? {}) },
    shoeWearPattern: { ...e.shoeWearPattern, ...(s.shoeWearPattern ?? {}) },
    footMeasurements: { ...e.footMeasurements, ...(s.footMeasurements ?? {}) },
    insoleType: s.insoleType ?? [],
    notes: s.notes ?? "",
  };
};

/** Blank text is dropped, so an untouched field never overwrites a stored one. */
export const assessmentToDto = (v: AssessmentValue): PodiatrySessionDto => {
  const text = (x: string) => (x.trim() ? x.trim() : undefined);
  const measurements = Object.fromEntries(
    Object.entries(v.footMeasurements).filter(([, x]) => x.trim() !== ""),
  );
  return {
    subjectiveHistory: { ...v.subjectiveHistory, vasScore: text(v.subjectiveHistory.vasScore) },
    visualInspection: v.visualInspection,
    palpation: v.palpation,
    rangeOfMotion: v.rangeOfMotion,
    dynamicAnalysis: v.dynamicAnalysis,
    shoeWearPattern: v.shoeWearPattern,
    footMeasurements: measurements,
    insoleType: v.insoleType,
    notes: text(v.notes),
  };
};

// ── Building blocks ──────────────────────────────────────────────────────────
const pick = <T extends string>(list: T[], v: T, single: boolean): T[] =>
  single
    ? (list.includes(v) ? [] : [v])
    : (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <p className="border-b pb-2 text-sm font-bold text-foreground">{title}</p>
      {children}
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <p className="text-xs font-medium">{text}</p>;
}

function Chips<T extends string>({
  label, opts, value, onChange, t, single = false, readOnly = false,
}: {
  label?: string;
  opts: OptGroup<T>;
  value: T[];
  onChange: (v: T[]) => void;
  t: FormT;
  /** Single-choice groups still store an array — clicking the pick clears it. */
  single?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {label && <FieldLabel text={label} />}
      <div className="flex flex-wrap gap-1.5">
        {opts.values.map((v) => {
          const on = value.includes(v);
          const text = t(`opts.${opts.group}.${v}`);
          const cls = `rounded-full border px-3 py-1 text-xs transition-colors ${
            on ? "border-orange-500 bg-orange-500 text-white" : "border-border text-muted-foreground"
          }`;
          return readOnly ? (
            <span key={v} className={cls}>{text}</span>
          ) : (
            <button
              key={v}
              type="button"
              onClick={() => onChange(pick(value, v, single))}
              className={`${cls} ${on ? "" : "hover:bg-muted"}`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The insole codes are product names, not words — no translation lookup. */
function InsoleChips({
  value, onChange, readOnly,
}: {
  value: PodiatryInsoleType[];
  onChange: (v: PodiatryInsoleType[]) => void;
  readOnly: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {INSOLE_TYPE_VALUES.map((v) => {
        const on = value.includes(v);
        const cls = `rounded-full border px-3 py-1 text-xs transition-colors ${
          on ? "border-orange-500 bg-orange-500 text-white" : "border-border text-muted-foreground"
        }`;
        return readOnly ? (
          <span key={v} className={cls}>{v}</span>
        ) : (
          <button
            key={v}
            type="button"
            onClick={() => onChange(pick([...value], v, true))}
            className={`${cls} ${on ? "" : "hover:bg-muted"}`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

/** A finding recorded per foot: the right foot first, matching the RTL sheet. */
function SidePair<T extends string>({
  label, opts, right, left, onRight, onLeft, t, single = true, readOnly = false, extra,
}: {
  label: string;
  opts: OptGroup<T>;
  right: T[];
  left: T[];
  onRight: (v: T[]) => void;
  onLeft: (v: T[]) => void;
  t: FormT;
  single?: boolean;
  readOnly?: boolean;
  /** Optional per-side companion field (a count, for example). */
  extra?: (side: "right" | "left") => React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel text={label} />
      <div className="grid gap-2 sm:grid-cols-2">
        {(["right", "left"] as const).map((side) => (
          <div key={side} className="rounded-md border bg-muted/30 p-2 space-y-1.5">
            <p className="text-[11px] text-muted-foreground">
              {side === "right" ? t("labels.right") : t("labels.left")}
            </p>
            <Chips
              opts={opts}
              value={side === "right" ? right : left}
              onChange={side === "right" ? onRight : onLeft}
              t={t}
              single={single}
              readOnly={readOnly}
            />
            {extra?.(side)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Check({
  label, checked, onChange, readOnly = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2.5 ${readOnly ? "" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        onChange={readOnly ? undefined : () => onChange(!checked)}
        className={`w-4 h-4 shrink-0 checkbox-orange rounded-sm ${readOnly ? "pointer-events-none" : ""}`}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

/** Read-only stand-in for a text input, so both modes keep the same rhythm. */
function Val({ value }: { value?: string | null }) {
  return (
    <div className={`rounded-md border bg-muted/40 px-2 py-1.5 text-sm ${value ? "" : "text-muted-foreground"}`}>
      {value || "—"}
    </div>
  );
}

function Line({
  label, value, onChange, readOnly = false, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel text={label} />
      {readOnly
        ? <Val value={value} />
        : <Input className="h-9" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

/** A titled group inside a section — the sheet's second-level bullets. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <FieldLabel text={title} />
      <div className="space-y-2.5 ps-1">{children}</div>
    </div>
  );
}

// ── The form ─────────────────────────────────────────────────────────────────
export function PodiatryAssessmentFields({
  value, onChange, readOnly = false,
}: {
  value: AssessmentValue;
  onChange: (v: AssessmentValue) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("clinic.podiatry.form") as unknown as FormT;

  const sub = value.subjectiveHistory;
  const vis = value.visualInspection;
  const dyn = value.dynamicAnalysis;

  const setSub = (p: Partial<AssessmentValue["subjectiveHistory"]>) =>
    onChange({ ...value, subjectiveHistory: { ...sub, ...p } });
  const setVis = (p: Partial<AssessmentValue["visualInspection"]>) =>
    onChange({ ...value, visualInspection: { ...vis, ...p } });
  const setDyn = (p: Partial<AssessmentValue["dynamicAnalysis"]>) =>
    onChange({ ...value, dynamicAnalysis: { ...dyn, ...p } });

  // A deformity or lesion: the tick, then the follow-up field it unlocks.
  const finding = (
    labelKey: string,
    key: keyof AssessmentValue["visualInspection"],
    detail: React.ReactNode,
  ) => (
    <div className="space-y-1.5">
      <Check
        label={t(`findings.${labelKey}`)}
        checked={!!vis[key]}
        onChange={(v) => setVis({ [key]: v } as Partial<AssessmentValue["visualInspection"]>)}
        readOnly={readOnly}
      />
      {!!vis[key] && <div className="ps-6">{detail}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Section title={t("sections.subjective")}>
        <Chips label={t("labels.mainCause")} opts={MAIN_CAUSE} value={sub.mainCause} single t={t}
          onChange={(v) => setSub({ mainCause: v })} readOnly={readOnly} />
        <Chips label={t("labels.painLocation")} opts={PAIN_LOCATION} value={sub.painLocation} t={t}
          onChange={(v) => setSub({ painLocation: v })} readOnly={readOnly} />
        <div className="space-y-2.5">
          <FieldLabel text={`${t("labels.painNature")}${sub.vasScore ? ` — ${sub.vasScore}/10` : ""}`} />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => {
              const on = sub.vasScore === n;
              const cls = `h-9 w-9 rounded-md border text-sm ${
                on ? "border-orange-500 bg-orange-500 text-white" : "border-border text-muted-foreground"
              }`;
              return readOnly ? (
                <div key={n} className={`${cls} flex items-center justify-center`}>{n}</div>
              ) : (
                <button key={n} type="button" className={`${cls} transition-colors ${on ? "" : "hover:bg-muted"}`}
                  onClick={() => setSub({ vasScore: on ? "" : n })}>
                  {n}
                </button>
              );
            })}
          </div>
          {/* The sheet nests the pain descriptors under the VAS line, unlabelled. */}
          <Chips opts={PAIN_CHARACTERISTIC} value={sub.painCharacteristics} t={t}
            onChange={(v) => setSub({ painCharacteristics: v })} readOnly={readOnly} />
        </div>
      </Section>

      <Section title={t("sections.visual")}>
        <SidePair label={t("labels.rearfootAlignment")} opts={REARFOOT_ALIGNMENT} t={t}
          right={vis.rightRearfootAlignment} left={vis.leftRearfootAlignment}
          onRight={(v) => setVis({ rightRearfootAlignment: v })}
          onLeft={(v) => setVis({ leftRearfootAlignment: v })} readOnly={readOnly} />

        <SidePair label={t("labels.tooManyToes")} opts={TOO_MANY_TOES} t={t}
          right={vis.rightTooManyToes} left={vis.leftTooManyToes}
          onRight={(v) => setVis({ rightTooManyToes: v })}
          onLeft={(v) => setVis({ leftTooManyToes: v })} readOnly={readOnly}
          extra={(side) => (
            <Line
              label={t("labels.toesCount")}
              value={side === "right" ? vis.rightTooManyToesCount : vis.leftTooManyToesCount}
              onChange={(v) => setVis(side === "right" ? { rightTooManyToesCount: v } : { leftTooManyToesCount: v })}
              readOnly={readOnly}
            />
          )} />

        <SidePair label={t("labels.archArchitecture")} opts={ARCH_ARCHITECTURE} t={t}
          right={vis.rightArchArchitecture} left={vis.leftArchArchitecture}
          onRight={(v) => setVis({ rightArchArchitecture: v })}
          onLeft={(v) => setVis({ leftArchArchitecture: v })} readOnly={readOnly} />

        <Group title={t("labels.forefootDeformities")}>
          {finding("halluxValgus", "halluxValgus",
            <Chips opts={DEFORMITY_TYPE} value={vis.halluxValgusType} single t={t}
              onChange={(v) => setVis({ halluxValgusType: v })} readOnly={readOnly} />)}
          {finding("tailorsBunion", "tailorsBunion",
            <Chips opts={DEFORMITY_TYPE} value={vis.tailorsBunionType} single t={t}
              onChange={(v) => setVis({ tailorsBunionType: v })} readOnly={readOnly} />)}
          {finding("hammerToes", "hammerToes",
            <Line label={t("labels.affectedToes")} value={vis.hammerToesAffected}
              onChange={(v) => setVis({ hammerToesAffected: v })} readOnly={readOnly}
              placeholder={t("labels.affectedToesExample")} />)}
          {finding("clawToes", "clawToes",
            <Line label={t("labels.affectedToes")} value={vis.clawToesAffected}
              onChange={(v) => setVis({ clawToesAffected: v })} readOnly={readOnly} />)}
          {finding("malletToes", "malletToes",
            <Line label={t("labels.affectedToes")} value={vis.malletToesAffected}
              onChange={(v) => setVis({ malletToesAffected: v })} readOnly={readOnly} />)}
        </Group>

        <Group title={t("labels.skinStatus")}>
          {finding("hyperkeratosis", "hyperkeratosisCallus",
            <Line label={t("labels.location")} value={vis.hyperkeratosisLocation}
              onChange={(v) => setVis({ hyperkeratosisLocation: v })} readOnly={readOnly} />)}
          {finding("preUlcerative", "preTrophicLesions",
            <Line label={t("labels.notes")} value={vis.preTrophicLesionsNotes}
              onChange={(v) => setVis({ preTrophicLesionsNotes: v })} readOnly={readOnly} />)}
          {finding("edema", "edema",
            <Chips opts={EDEMA_TYPE} value={vis.edemaType} t={t}
              onChange={(v) => setVis({ edemaType: v })} readOnly={readOnly} />)}
        </Group>
      </Section>

      <Section title={t("sections.palpation")}>
        <p className="text-xs text-muted-foreground">{t("labels.palpationHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PALPATION_KEYS.map((key) => (
            <Check
              key={key}
              label={t(`palpation.${key}`)}
              checked={value.palpation[key]}
              onChange={(v) => onChange({ ...value, palpation: { ...value.palpation, [key]: v } })}
              readOnly={readOnly}
            />
          ))}
        </div>
      </Section>

      <Section title={t("sections.rom")}>
        <Chips label={t("labels.ankleDorsiflexion")} opts={ROM} t={t}
          value={value.rangeOfMotion.ankleDorsiflexion} single
          onChange={(v) => onChange({ ...value, rangeOfMotion: { ...value.rangeOfMotion, ankleDorsiflexion: v } })}
          readOnly={readOnly} />
        <Chips label={t("labels.anklePlantarflexion")} opts={ROM} t={t}
          value={value.rangeOfMotion.anklePlantarflexion} single
          onChange={(v) => onChange({ ...value, rangeOfMotion: { ...value.rangeOfMotion, anklePlantarflexion: v } })}
          readOnly={readOnly} />
      </Section>

      <Section title={t("sections.dynamic")}>
        <SidePair label={t("labels.jackTest")} opts={JACK_TEST} t={t}
          right={dyn.rightJackTest} left={dyn.leftJackTest}
          onRight={(v) => setDyn({ rightJackTest: v })}
          onLeft={(v) => setDyn({ leftJackTest: v })} readOnly={readOnly} />
        <SidePair label={t("labels.walkingLine")} opts={WALKING_LINE} t={t}
          right={dyn.rightWalkingLine} left={dyn.leftWalkingLine}
          onRight={(v) => setDyn({ rightWalkingLine: v })}
          onLeft={(v) => setDyn({ leftWalkingLine: v })} readOnly={readOnly} />
      </Section>

      <Section title={t("sections.shoe")}>
        <Chips label={t("labels.currentFootwear")} opts={FOOTWEAR} t={t}
          value={value.shoeWearPattern.currentFootwear}
          onChange={(v) => onChange({ ...value, shoeWearPattern: { ...value.shoeWearPattern, currentFootwear: v } })}
          readOnly={readOnly} />
        <Chips label={t("labels.outsoleWear")} opts={OUTSOLE_WEAR} t={t}
          value={value.shoeWearPattern.outsoleWear}
          onChange={(v) => onChange({ ...value, shoeWearPattern: { ...value.shoeWearPattern, outsoleWear: v } })}
          readOnly={readOnly} />
      </Section>

      <Section title={t("sections.measurements")}>
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 text-[11px] text-muted-foreground sm:grid-cols-[1fr_7rem_7rem]">
            <span />
            <span className="text-center">{t("labels.right")}</span>
            <span className="text-center">{t("labels.left")}</span>
          </div>
          {FOOT_MEASUREMENT_KEYS.map((key) => (
            <div key={key} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 sm:grid-cols-[1fr_7rem_7rem]">
              <span className="text-xs">{t(`measurements.${key}`)}</span>
              {(["Right", "Left"] as const).map((side) => {
                const field = `${key}${side}`;
                return readOnly ? (
                  <div key={side} className="rounded-md border bg-muted/40 px-2 py-1 text-center text-sm">
                    {value.footMeasurements[field] || "—"}
                  </div>
                ) : (
                  <Input
                    key={side}
                    className="h-8 text-center"
                    dir="ltr"
                    inputMode="decimal"
                    value={value.footMeasurements[field] ?? ""}
                    onChange={(e) => onChange({
                      ...value,
                      footMeasurements: { ...value.footMeasurements, [field]: e.target.value },
                    })}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("sections.insole")}>
        <div className="space-y-1.5">
          <FieldLabel text={t("labels.insoleType")} />
          <InsoleChips
            value={value.insoleType}
            onChange={(v) => onChange({ ...value, insoleType: v })}
            readOnly={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel text={t("labels.notes")} />
          {readOnly
            ? <Val value={value.notes} />
            : <Textarea rows={2} className="resize-none text-sm" value={value.notes}
                onChange={(e) => onChange({ ...value, notes: e.target.value })} />}
        </div>
      </Section>
    </div>
  );
}
