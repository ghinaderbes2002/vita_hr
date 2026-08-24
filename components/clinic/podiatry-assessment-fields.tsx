"use client";

// The body of the podiatry assessment (نموذج تقييم القدم الاحترافي): the eight
// clinical sections plus the insole choice and the notes.
// Section titles, field labels and option wording are transcribed from the
// printed VitaFoot sheet — Arabic only on screen; the Latin terms live in the
// option tables for the printed sheet, which stays bilingual.
// One component serves both the edit dialog and the read-only tab — `readOnly`
// swaps the controls for plain marks, so the saved form reads back in exactly
// the layout it was filled in.
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
  ARCH_ARCHITECTURE_OPTS, DEFORMITY_TYPE_OPTS, EDEMA_TYPE_OPTS, FOOTWEAR_OPTS,
  FOOT_MEASUREMENT_ROWS, INSOLE_TYPE_OPTS, JACK_TEST_OPTS, MAIN_CAUSE_OPTS, Opt,
  OUTSOLE_WEAR_OPTS, PAIN_CHARACTERISTIC_OPTS, PAIN_LOCATION_OPTS, PALPATION_POINTS,
  REARFOOT_ALIGNMENT_OPTS, ROM_OPTS, TOO_MANY_TOES_OPTS, WALKING_LINE_OPTS,
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
    FOOT_MEASUREMENT_ROWS.flatMap(([k]) => [[`${k}Left`, ""], [`${k}Right`, ""]]),
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

function FieldLabel({ ar }: { ar: string }) {
  return <p className="text-xs font-medium">{ar}</p>;
}

function Chips<T extends string>({
  label, opts, value, onChange, single = false, readOnly = false,
}: {
  label?: string;
  opts: Opt<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  /** Single-choice groups still store an array — clicking the pick clears it. */
  single?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {label && <FieldLabel ar={label} />}
      <div className="flex flex-wrap gap-1.5">
        {opts.map(([v, ar]) => {
          const on = value.includes(v);
          const cls = `rounded-full border px-3 py-1 text-xs transition-colors ${
            on ? "border-orange-500 bg-orange-500 text-white" : "border-border text-muted-foreground"
          }`;
          return readOnly ? (
            <span key={v} className={cls}>{ar}</span>
          ) : (
            <button
              key={v}
              type="button"
              onClick={() => onChange(pick(value, v, single))}
              className={`${cls} ${on ? "" : "hover:bg-muted"}`}
            >
              {ar}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A finding recorded per foot: the right foot first, matching the RTL sheet. */
function SidePair<T extends string>({
  label, opts, right, left, onRight, onLeft, single = true, readOnly = false, extra,
}: {
  label: string;
  opts: Opt<T>[];
  right: T[];
  left: T[];
  onRight: (v: T[]) => void;
  onLeft: (v: T[]) => void;
  single?: boolean;
  readOnly?: boolean;
  /** Optional per-side companion field (a count, for example). */
  extra?: (side: "right" | "left") => React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel ar={label} />
      <div className="grid gap-2 sm:grid-cols-2">
        {(["right", "left"] as const).map((side) => (
          <div key={side} className="rounded-md border bg-muted/30 p-2 space-y-1.5">
            <p className="text-[11px] text-muted-foreground">
              {side === "right" ? "اليمنى" : "اليسرى"}
            </p>
            <Chips
              opts={opts}
              value={side === "right" ? right : left}
              onChange={side === "right" ? onRight : onLeft}
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
      <FieldLabel ar={label} />
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
      <FieldLabel ar={title} />
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
    label: string,
    key: keyof AssessmentValue["visualInspection"],
    detail: React.ReactNode,
  ) => (
    <div className="space-y-1.5">
      <Check
        label={label}
        checked={!!vis[key]}
        onChange={(v) => setVis({ [key]: v } as Partial<AssessmentValue["visualInspection"]>)}
        readOnly={readOnly}
      />
      {!!vis[key] && <div className="ps-6">{detail}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Section title="التاريخ المرضي وتوصيف الألم">
        <Chips label="السبب الرئيسي والأصل المرضي"
          opts={MAIN_CAUSE_OPTS} value={sub.mainCause} single
          onChange={(v) => setSub({ mainCause: v })} readOnly={readOnly} />
        <Chips label="موقع الألم"
          opts={PAIN_LOCATION_OPTS} value={sub.painLocation}
          onChange={(v) => setSub({ painLocation: v })} readOnly={readOnly} />
        <div className="space-y-2.5">
          <FieldLabel ar={`طبيعة الألم - درجة مقياس الألم${sub.vasScore ? ` — ${sub.vasScore}/10` : ""}`} />
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
          <Chips opts={PAIN_CHARACTERISTIC_OPTS} value={sub.painCharacteristics}
            onChange={(v) => setSub({ painCharacteristics: v })} readOnly={readOnly} />
        </div>
      </Section>

      <Section title="الفحص البصري وتحديد التشوهات">
        <SidePair label="استقامة الجزء الخلفي من القدم أثناء الوقوف"
          opts={REARFOOT_ALIGNMENT_OPTS}
          right={vis.rightRearfootAlignment} left={vis.leftRearfootAlignment}
          onRight={(v) => setVis({ rightRearfootAlignment: v })}
          onLeft={(v) => setVis({ leftRearfootAlignment: v })} readOnly={readOnly} />

        <SidePair label="علامة «أصابع قدم كثيرة جداً» عند النظر من الخلف"
          opts={TOO_MANY_TOES_OPTS}
          right={vis.rightTooManyToes} left={vis.leftTooManyToes}
          onRight={(v) => setVis({ rightTooManyToes: v })}
          onLeft={(v) => setVis({ leftTooManyToes: v })} readOnly={readOnly}
          extra={(side) => (
            <Line
              label="عدد الأصابع الظاهرة"
              value={side === "right" ? vis.rightTooManyToesCount : vis.leftTooManyToesCount}
              onChange={(v) => setVis(side === "right" ? { rightTooManyToesCount: v } : { leftTooManyToesCount: v })}
              readOnly={readOnly}
            />
          )} />

        <SidePair label="بنية قوس القدم" opts={ARCH_ARCHITECTURE_OPTS}
          right={vis.rightArchArchitecture} left={vis.leftArchArchitecture}
          onRight={(v) => setVis({ rightArchArchitecture: v })}
          onLeft={(v) => setVis({ leftArchArchitecture: v })} readOnly={readOnly} />

        <Group title="تشوهات مقدمة القدم والأصابع">
          {finding("إبهام القدم الأفحج", "halluxValgus",
            <Chips opts={DEFORMITY_TYPE_OPTS} value={vis.halluxValgusType} single
              onChange={(v) => setVis({ halluxValgusType: v })} readOnly={readOnly} />)}
          {finding("ورم الخياط", "tailorsBunion",
            <Chips opts={DEFORMITY_TYPE_OPTS} value={vis.tailorsBunionType} single
              onChange={(v) => setVis({ tailorsBunionType: v })} readOnly={readOnly} />)}
          {finding("أصابع مطرقية", "hammerToes",
            <Line label="الأصابع المصابة" value={vis.hammerToesAffected}
              onChange={(v) => setVis({ hammerToesAffected: v })} readOnly={readOnly} placeholder="مثال: 2، 3" />)}
          {finding("أصابع مخلبية", "clawToes",
            <Line label="الأصابع المصابة" value={vis.clawToesAffected}
              onChange={(v) => setVis({ clawToesAffected: v })} readOnly={readOnly} />)}
          {finding("أصابع ماليت", "malletToes",
            <Line label="الأصابع المصابة" value={vis.malletToesAffected}
              onChange={(v) => setVis({ malletToesAffected: v })} readOnly={readOnly} />)}
        </Group>

        <Group title="حالة الجلد والأنسجة الرخوة">
          {finding("موقع الفرط التقرن / المسامير الجلدية", "hyperkeratosisCallus",
            <Line label="الموقع" value={vis.hyperkeratosisLocation}
              onChange={(v) => setVis({ hyperkeratosisLocation: v })} readOnly={readOnly} />)}
          {finding("الآفات الجلدية قبل التقرحية", "preTrophicLesions",
            <Line label="ملاحظات" value={vis.preTrophicLesionsNotes}
              onChange={(v) => setVis({ preTrophicLesionsNotes: v })} readOnly={readOnly} />)}
          {finding("الوذمة", "edema",
            <Chips opts={EDEMA_TYPE_OPTS} value={vis.edemaType}
              onChange={(v) => setVis({ edemaType: v })} readOnly={readOnly} />)}
        </Group>
      </Section>

      <Section title="نقاط الجس والمضض">
        <p className="text-xs text-muted-foreground">
          ضع علامة إذا كان الضغط على المنطقة يسبب ألماً أو حساسية:
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PALPATION_POINTS.map(([key, ar]) => (
            <Check
              key={key}
              label={ar}
              checked={value.palpation[key]}
              onChange={(v) => onChange({ ...value, palpation: { ...value.palpation, [key]: v } })}
              readOnly={readOnly}
            />
          ))}
        </div>
      </Section>

      <Section title="مدى الحركة والمرونة المقاسة">
        <Chips label="العطف الظهري للكاحل"
          opts={ROM_OPTS} value={value.rangeOfMotion.ankleDorsiflexion} single
          onChange={(v) => onChange({ ...value, rangeOfMotion: { ...value.rangeOfMotion, ankleDorsiflexion: v } })}
          readOnly={readOnly} />
        <Chips label="العطف الأخمصي للكاحل"
          opts={ROM_OPTS} value={value.rangeOfMotion.anklePlantarflexion} single
          onChange={(v) => onChange({ ...value, rangeOfMotion: { ...value.rangeOfMotion, anklePlantarflexion: v } })}
          readOnly={readOnly} />
      </Section>

      <Section title="التحليل الديناميكي - المشي والحركة">
        <SidePair label="اختبار جاك - رفع إبهام القدم ميكانيكياً"
          opts={JACK_TEST_OPTS}
          right={dyn.rightJackTest} left={dyn.leftJackTest}
          onRight={(v) => setDyn({ rightJackTest: v })}
          onLeft={(v) => setDyn({ leftJackTest: v })} readOnly={readOnly} />
        <SidePair label="خط ومسار المشي" opts={WALKING_LINE_OPTS}
          right={dyn.rightWalkingLine} left={dyn.leftWalkingLine}
          onRight={(v) => setDyn({ rightWalkingLine: v })}
          onLeft={(v) => setDyn({ leftWalkingLine: v })} readOnly={readOnly} />
      </Section>

      <Section title="نمط تآكل الحذاء وفحص التقويم">
        <Chips label="الأحذية الحالية المستخدمة"
          opts={FOOTWEAR_OPTS} value={value.shoeWearPattern.currentFootwear}
          onChange={(v) => onChange({ ...value, shoeWearPattern: { ...value.shoeWearPattern, currentFootwear: v } })}
          readOnly={readOnly} />
        <Chips label="خصائص تآكل النعل الخارجي للحذاء"
          opts={OUTSOLE_WEAR_OPTS} value={value.shoeWearPattern.outsoleWear}
          onChange={(v) => onChange({ ...value, shoeWearPattern: { ...value.shoeWearPattern, outsoleWear: v } })}
          readOnly={readOnly} />
      </Section>

      <Section title="قياسات القدم وأبعادها">
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 text-[11px] text-muted-foreground sm:grid-cols-[1fr_7rem_7rem]">
            <span />
            <span className="text-center">اليمنى</span>
            <span className="text-center">اليسرى</span>
          </div>
          {FOOT_MEASUREMENT_ROWS.map(([key, ar]) => (
            <div key={key} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 sm:grid-cols-[1fr_7rem_7rem]">
              <span className="text-xs">{ar}</span>
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

      <Section title="الضبانة والملاحظات">
        <Chips label="نوع الضبانة"
          opts={INSOLE_TYPE_OPTS} value={value.insoleType} single
          onChange={(v) => onChange({ ...value, insoleType: v })} readOnly={readOnly} />
        <div className="space-y-1.5">
          <FieldLabel ar="ملاحظات" />
          {readOnly
            ? <Val value={value.notes} />
            : <Textarea rows={2} className="resize-none text-sm" value={value.notes}
                onChange={(e) => onChange({ ...value, notes: e.target.value })} />}
        </div>
      </Section>
    </div>
  );
}
