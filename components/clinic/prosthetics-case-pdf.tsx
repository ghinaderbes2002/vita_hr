// Client-only — imported via dynamic import() to avoid SSR issues.
// Full Prosthetics Case Report in the shared VitaSyr PDF style (see pdf-kit.tsx).
// Replaces the plain backend-generated report with a branded, Arabic document.
import React from "react";
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import {
  S, TEXT, MUTED,
  ar, PageHeader, PageFooter, SecHead, SubHead, F, Bool, Chk, OptGrid, InfoGrid,
  ensureAmiriFonts, saveBlob,
} from "./pdf-kit";
import { GaitSessionBlock, type ProstheticsGaitPdfForm } from "./prosthetics-gait-pdf";

// ── Label maps ───────────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = { UPPER: "طرف علوي", LOWER: "طرف سفلي", BOTH: "علوي وسفلي" };
const SIDE_LABEL: Record<string, string> = { RIGHT: "أيمن", LEFT: "أيسر", BILATERAL: "ثنائي" };
const PROSTHETIC_TYPE_LABEL: Record<string, string> = {
  BIONIC: "بيوني", MYOBOCK: "ميوبوك", MECHANIC: "ميكانيكي", COSMETIC: "تجميلي",
};
// Mirrors the website intake tab's `intake.cause.*` labels so the PDF reads
// identically to the form.
const CAUSE_LABEL: Record<string, string> = {
  WAR_INJURY: "إصابة حرب", TRAFFIC_ACCIDENT: "حادث مرور", DIABETES: "داء السكري",
  VASCULAR_DISEASE: "مرض الأوعية الدموية", CONGENITAL: "خلقي", INFECTION: "عدوى",
  TUMOR: "ورم", WORK_INJURY: "إصابة عمل", OTHER: "أخرى",
};
const SOURCE_LOCATION_LABEL: Record<string, string> = {
  WAREHOUSE: "مستودع", EXTERNAL: "خارجي", PATIENT_OWNED: "ملك المريض", OTHER: "أخرى", SUPPLIER: "مورد",
};
const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "معلق", APPROVED: "معتمد", DONE: "تم", NOT_AVAILABLE: "لا يوجد",
};

// Assessment option labels — mirror the `assess.*` i18n keys used by the form.
// ── Assessment option lists — ordered EXACTLY as the website assessment tab ─────
type O = { v: string; l: string };
const O_LENGTH: O[] = [
  { v: "LONG", l: "طويل" }, { v: "MEDIUM", l: "وسط" }, { v: "SHORT", l: "قصير" }, { v: "VERY_SHORT", l: "قصير جداً" },
];
const O_SHAPE: O[] = [
  { v: "BONY", l: "عظمي" }, { v: "SOFT", l: "لين" }, { v: "NORMAL", l: "طبيعي" },
  { v: "CONICAL_BONY", l: "عظمي مخروطي" }, { v: "CONICAL_SOFT", l: "لين مخروطي" },
];
// The assessment tab uses its own cause wording (differs from the intake tab).
const O_CAUSE: O[] = [
  { v: "WAR_INJURY", l: "إصابة حرب" }, { v: "TRAFFIC_ACCIDENT", l: "حادث سير" },
  { v: "DIABETES", l: "مضاعفات سكري" }, { v: "VASCULAR_DISEASE", l: "مرض الأوعية" },
  { v: "CONGENITAL", l: "خلقي" }, { v: "INFECTION", l: "عدوى" }, { v: "TUMOR", l: "ورم" },
  { v: "WORK_INJURY", l: "إصابة عمل" }, { v: "OTHER", l: "أخرى" },
];
const O_PAIN_TYPE: O[] = [
  { v: "NUMBNESS", l: "خدر" }, { v: "DULL_ACHE", l: "ألم خفيف" }, { v: "HOT_BURNING", l: "حارق" },
  { v: "SHARP_STABBING", l: "حاد" }, { v: "PINS", l: "واخز" }, { v: "OTHER", l: "أخرى" },
];
const O_SKIN: O[] = [
  { v: "NORMAL", l: "طبيعي" }, { v: "PALE", l: "شاحب" }, { v: "DRY", l: "جاف" },
  { v: "INFLAMED", l: "ملتهب" }, { v: "PEELING", l: "متقشر" }, { v: "OOZING", l: "ناز" },
];
const O_COLOR: O[] = [
  { v: "NORMAL", l: "طبيعي" }, { v: "PALE", l: "شاحب" }, { v: "YELLOWISH", l: "مصفر" },
  { v: "ERYTHEMATOUS", l: "محمر" }, { v: "CYANOTIC", l: "مزرق" },
];
const O_TEMP: O[] = [{ v: "NORMAL", l: "طبيعي" }, { v: "COLD", l: "بارد" }, { v: "HOT", l: "حار" }];
const O_SCAR_UPPER: O[] = [
  { v: "HEALED", l: "ملتئمة" }, { v: "FLEXIBLE", l: "مرنة" }, { v: "HEALED_WITH_PINS", l: "ملتئمة مع ترس" },
  { v: "OPEN", l: "مفتوحة" }, { v: "DRY", l: "جافة" }, { v: "INFLAMED", l: "ملتهبة" }, { v: "OOZING", l: "نازة" },
];
const O_SCAR_LOWER: O[] = [
  { v: "HEALED", l: "ملتئمة" }, { v: "INFLAMED", l: "ملتهبة" }, { v: "FLEXIBLE", l: "مرنة" },
  { v: "HEALED_WITH_PINS", l: "ملتئمة مع ترس" }, { v: "DRY", l: "جافة" }, { v: "OPEN", l: "مفتوحة" }, { v: "OOZING", l: "نازة" },
];
const O_LOAD: O[] = [
  { v: "PALPABLE", l: "قابل للمس" }, { v: "WEIGHT_BEARING", l: "قابل لتحمل الوزن" },
  { v: "NON_WEIGHT_BEARING", l: "غير قابل لتحمل الوزن" }, { v: "NOT_PALPABLE", l: "غير قابل للمس" },
];
const O_WB: O[] = [{ v: "FULL", l: "كامل" }, { v: "HIGH", l: "مرتفع" }, { v: "MEDIUM", l: "متوسط" }, { v: "LOW", l: "منخفض" }];
const O_NORMAL_STATE: O[] = [{ v: "ACTIVE", l: "نشط" }, { v: "SEDENTARY", l: "خامل" }];
const O_KLEVEL: O[] = ["K0", "K1", "K2", "K3", "K4"].map((k) => ({ v: k, l: k }));

// ── Balance assessment (Pro-015) option lists — mirror the website bal.* labels ──
type OK = { k: string; l: string };
const BAL_STATIC: OK[] = [
  { k: "standing_feet_together", l: "الوقوف والقدمان متلاصقتان" },
  { k: "narrow_base_standing", l: "الوقوف بقاعدة ضيقة" },
  { k: "prosthetic_side", l: "الوقوف على الطرف الصناعي" },
  { k: "sound_side", l: "الوقوف على الطرف السليم" },
  { k: "eyes_closed", l: "الوقوف مع إغماض العينين" },
];
const BAL_STATIC_OPTS: O[] = [{ v: "INDEPENDENT", l: "مستقل" }, { v: "ASSISTED", l: "بمساعدة" }, { v: "UNABLE", l: "غير قادر" }];
const BAL_DYN_TASK: OK[] = [
  { k: "weight_shifting", l: "نقل الوزن (أمامي/خلفي ـ جانبي)" },
  { k: "reaching_outside_bos", l: "الوصول خارج قاعدة الارتكاز" },
  { k: "turning", l: "الالتفاف (360°/180°)" },
  { k: "stepping_forward_back", l: "الخطو للأمام / للخلف" },
  { k: "obstacle_negotiation", l: "تجاوز العوائق" },
];
const BAL_DYN_TASK_OPTS: O[] = [{ v: "GOOD", l: "جيد" }, { v: "FAIR", l: "متوسط" }, { v: "POOR", l: "ضعيف" }];
const BAL_DYN_ACT: OK[] = [
  { k: "sit_to_stand", l: "الجلوس إلى الوقوف" },
  { k: "stand_to_sit", l: "الوقوف إلى الجلوس" },
  { k: "gait_initiation", l: "بدء المشي" },
  { k: "stair_negotiation", l: "صعود ونزول الدرج" },
  { k: "uneven_surface_walking", l: "المشي على أسطح غير مستوية" },
];
const BAL_DYN_ACT_OPTS: O[] = [{ v: "INDEPENDENT", l: "مستقل" }, { v: "WITH_DIFFICULTY", l: "بصعوبة" }, { v: "UNABLE", l: "غير قادر" }];
const BAL_ASSIST_OPTS: O[] = [{ v: "NONE", l: "لا يوجد" }, { v: "CANE", l: "عصا" }, { v: "CRUTCHES", l: "عكاز" }, { v: "WALKER", l: "مشاية" }];
const BAL_FALLRISK_OPTS: O[] = [{ v: "LOW", l: "منخفض" }, { v: "MODERATE", l: "متوسط" }, { v: "HIGH", l: "عالي" }];
const BAL_OVERALL_OPTS: O[] = [{ v: "GOOD", l: "جيد" }, { v: "FAIR", l: "مقبول" }, { v: "POOR", l: "ضعيف" }];
const BAL_FACTORS: O[] = [
  { v: "PROSTHETIC_CONTROL", l: "التحكم بالطرف الصناعي" }, { v: "MUSCLE_WEAKNESS", l: "ضعف العضلات" },
  { v: "CORE_INSTABILITY", l: "عدم استقرار الجذع" }, { v: "FEAR_OF_FALLING", l: "الخوف من السقوط" },
  { v: "ALIGNMENT_FIT_ISSUES", l: "مشاكل المحاذاة والملاءمة" },
];
const BAL_PROGRESSION: O[] = [
  { v: "REDUCE_HAND_SUPPORT", l: "تقليل دعم اليدين" }, { v: "INCREASE_DURATION", l: "زيادة المدة" },
  { v: "INCREASE_REPS", l: "زيادة التكرار" }, { v: "INCREASE_DIFFICULTY", l: "زيادة الصعوبة" },
  { v: "ADD_DUAL_TASKS", l: "إضافة مهام مزدوجة" }, { v: "HOME_EXERCISE_PROGRAM", l: "برنامج تمارين منزلية" },
  { v: "NOT_PRESCRIBED", l: "لم يوصف" }, { v: "PRESCRIBED_WITH_SAFETY", l: "وصف وتم شرح السلامة للمريض" },
];
const BAL_OUTCOMES: O[] = [
  { v: "IMPROVE_WEIGHT", l: "تحسين الوزن" }, { v: "REDUCED_FALL_RISK", l: "تقليل خطر السقوط" },
  { v: "IMPROVED_CONFIDENCE", l: "زيادة الثقة" },
];
const BAL_SUPPORT_LBL: Record<string, string> = { NONE: "لا يوجد", BARS: "قضبان", SUPPORT: "بدعم", SUPERVISED: "إشراف" };

// ── Muscle strength (ROM) — mirrors UPPER_ROM_MOVES / LOWER_ROM_MOVES in the form ─
type RomMove = { key: string; label: string; group: string; hasGrade: boolean };
const UPPER_ROM: RomMove[] = [
  { key: "عطف المرفق", label: "العطف", group: "المرفق", hasGrade: true },
  { key: "بسط المرفق", label: "البسط", group: "المرفق", hasGrade: true },
  { key: "الكب", label: "الكب", group: "المرفق", hasGrade: true },
  { key: "الاستلقاء", label: "الاستلقاء", group: "المرفق", hasGrade: true },
  { key: "عطف الكتف", label: "العطف", group: "الكتف", hasGrade: true },
  { key: "بسط الكتف", label: "البسط", group: "الكتف", hasGrade: true },
  { key: "التقريب", label: "التقريب", group: "الكتف", hasGrade: true },
  { key: "التبعيد", label: "التبعيد", group: "الكتف", hasGrade: true },
  { key: "دوران داخلي", label: "دوران داخلي", group: "الكتف", hasGrade: false },
  { key: "عطف الرسغ", label: "العطف", group: "الرسغ", hasGrade: true },
  { key: "بسط الرسغ", label: "البسط", group: "الرسغ", hasGrade: true },
  { key: "انحراف كعبري", label: "انحراف كعبري", group: "الرسغ", hasGrade: false },
  { key: "انحراف زندي", label: "انحراف زندي", group: "الرسغ", hasGrade: false },
];
const LOWER_ROM: RomMove[] = [
  { key: "عطف ظهري", label: "عطف ظهري", group: "الكاحل", hasGrade: true },
  { key: "عطف أخمصي", label: "عطف أخمصي", group: "الكاحل", hasGrade: true },
  { key: "انقلاب داخلي", label: "انقلاب داخلي", group: "الكاحل", hasGrade: false },
  { key: "انقلاب خارجي", label: "انقلاب خارجي", group: "الكاحل", hasGrade: false },
  { key: "عطف الركبة", label: "العطف", group: "الركبة", hasGrade: true },
  { key: "بسط الركبة", label: "البسط", group: "الركبة", hasGrade: true },
  { key: "عطف الورك", label: "العطف", group: "الورك", hasGrade: true },
  { key: "بسط الورك", label: "البسط", group: "الورك", hasGrade: true },
  { key: "التقريب", label: "التقريب", group: "الورك", hasGrade: true },
  { key: "التبعيد", label: "التبعيد", group: "الورك", hasGrade: true },
  { key: "دوران داخلي", label: "دوران داخلي", group: "الورك", hasGrade: false },
];

const lbl = (map: Record<string, string>, v?: string | null) => (v ? map[v] ?? v : "");

// ── Data types ───────────────────────────────────────────────────────────────────
export interface CasePdfAssessment {
  region: string;            // "طرف علوي" / "طرف سفلي"
  side?: string | null;
  residualLimbLength?: string | null;
  residualLimbShape?: string | null;
  amputationLevelNote?: string | null;
  // Pain & sensation
  painPresent?: boolean | null;
  painIntensity?: number | null;
  painArea?: string | null;
  painTypes?: string[] | null;
  painTypeOtherDetail?: string | null;
  phantomPainPresent?: boolean | null;
  phantomPainIntensity?: number | null;
  neuromaPalpable?: boolean | null;
  neuromaPresent?: boolean | null;
  skinNotes?: string | null;
  // Case-level fields the website shows inside the assessment tab
  clinicalHistory?: string | null;
  amputationCause?: string | null;
  amputationDate?: string | null;
  currentlyUsingProsthesis?: boolean | null;
  previouslyUsedProsthesis?: boolean | null;
  previousProsthesisSystemDetail?: string | null;
  // Muscle strength (range of motion)
  romData?: Record<string, { selected?: boolean | null; grade?: string | null }> | null;
  muscleMotionNotes?: string | null;
  closureNotes?: string | null;
  // Skin
  skinAppearance?: string[] | null;
  skinColor?: string[] | null;
  skinTemperature?: string | null;
  scarCondition?: string[] | null;
  hasSkinGrafts?: boolean | null;
  graftArea?: string | null;
  // General & function
  generalHealthNotes?: string | null;
  otherLimbCondition?: string | null;
  loadTolerance?: string | null;
  weightBearingLevel?: string | null;
  usesAssistiveDevices?: boolean | null;
  assistiveDeviceTypes?: string | null;
  canClimbStairs?: boolean | null;
  canBalanceOneSide?: boolean | null;
  usesCompressionBandage?: boolean | null;
  jointsRangeOfMotion?: string | null;
  activityLevel?: string | null;  // K-level
  usesProstheticLimb?: boolean | null;
  prostheticLimbType?: string | null;
  examinedAt?: string | null;
  notes?: string | null;
}
export interface CasePdfComponent {
  partName?: string | null; partCode?: string | null;
  sourceLocation?: string | null; supplier?: string | null;
  reason?: string | null; requestStatus?: string | null;
  addedAt?: string | null; matched?: boolean | null;
}
export interface CasePdfGaitItem {
  sessionNumber?: number | null; sessionDate?: string | null; prosthetistName?: string | null;
  form: ProstheticsGaitPdfForm;
}
export interface CasePdfSession {
  sessionDate?: string | null; sessionTime?: string | null; description?: string | null;
  therapistName?: string | null; startTime?: string | null; endTime?: string | null; notes?: string | null;
}
export interface CasePdfDeliveryItem {
  name?: string | null; symbol?: string | null; quantity?: number | string | null;
  company?: string | null; source?: string | null; addedDate?: string | null;
}
export interface CasePdfDelivery {
  dischargeDate?: string | null; prosthetist?: string | null; physiotherapist?: string | null;
  medicalDirector?: string | null; date?: string | null; items?: CasePdfDeliveryItem[];
}
export interface CasePdfFinalDelivery {
  dischargeDate?: string | null; prosthetist?: string | null; physiotherapist?: string | null;
  ceo?: string | null; date?: string | null; patientName?: string | null;
  items?: CasePdfDeliveryItem[];
}
export interface CasePdfBalance {
  assessmentDate?: string | null;
  previousProsthesis?: boolean | null; previousProsthesisNotes?: string | null; assistiveDevice?: string | null;
  staticBalance?: Record<string, string>; dynamicTasks?: Record<string, string>; dynamicActivities?: Record<string, string>;
  historyOfFalls?: boolean | null; nearFalls?: boolean | null; fearOfFalling?: boolean | null; fallRiskNotes?: string | null;
  fallRiskLevel?: string | null; overallBalanceLevel?: string | null;
  limitingFactors?: string[]; limitingFactorsOtherNotes?: string | null;
  exerciseProgram?: { exercise?: string; position?: string; dosage?: string; support?: string; notes?: string; selected?: boolean }[];
  programProgression?: string[]; followUpWeeks?: string | number | null; expectedOutcomes?: string[];
  notes?: string | null; physiotherapistName?: string | null; committeeHeadName?: string | null;
}
export interface CasePdfData {
  patient: {
    firstName?: string; lastName?: string; patientNumber?: string;
    dateOfBirth?: string; gender?: string; phone?: string;
    heightCm?: number | string | null; weightKg?: number | string | null; bmi?: number | string | null;
  };
  caseId: string;
  status?: string | null;
  createdAt?: string | null;
  amputation: {
    types: string[]; side?: string | null; level?: string | null; date?: string | null;
    cause?: string | null; causeOther?: string | null; count?: number | string | null;
  };
  currentlyUsingProsthesis?: boolean | null;
  previouslyUsedProsthesis?: boolean | null;
  previousProsthesisSystemDetail?: string | null;
  clinical: {
    hasChronicDiseases?: boolean | null; chronicDiseases?: string | null;
    hasPhysicalTherapy?: boolean | null; physicalTherapyDetails?: string | null;
    hasPreviousProsthesis?: boolean | null; previousProsthesisDetails?: string | null;
    previousProsthesisWhen?: string | null; previousProsthesisWhere?: string | null;
    previousProsthesisType?: string | null;
    hasRevisionSurgery?: boolean | null; revisionDetails?: string | null;
  };
  team: { prosthetist?: string; physiotherapist?: string; supervisingDoctor?: string; workshopSupervisor?: string };
  assessments: CasePdfAssessment[];
  committee?: {
    prosthetistOpinion?: string | null; physiotherapistOpinion?: string | null;
    doctorOpinion?: string | null; committeeHeadOpinion?: string | null; expertOpinion?: string | null;
    finalDecision?: string | null; finalSummary?: string | null;
    prosthetistName?: string | null; physioName?: string | null; doctorName?: string | null;
    decidedByName?: string | null; decidedAt?: string | null;
  } | null;
  proposed: {
    proposedProstheticType?: string | null; prosthesisType?: string | null;
    prosthesisCompleted?: boolean | null; prosthesisSuitable?: boolean | null;
    proposedProsthesisType?: string | null;
  };
  components: CasePdfComponent[];
  gait: CasePdfGaitItem[];
  sessions?: CasePdfSession[];
  delivery?: CasePdfDelivery | null;
  finalDelivery?: CasePdfFinalDelivery | null;
  balance?: CasePdfBalance[];
  finalEval?: {
    residualLimbCondition?: string | null; suspensionSystemUsed?: string | null;
    socksDelivered?: number | null; linersDelivered?: number | null; fittingDate?: string | null;
    physioOpinion?: string | null; departmentHeadOpinion?: string | null;
    prosthetistOpinion?: string | null; prosthetistSupervisorOpinion?: string | null;
    committeeHeadOpinion?: string | null; expertOpinion?: string | null;
    readyForDelivery?: boolean | null; needsFollowUp?: boolean | null; followUpPlan?: string | null;
    generalNotes?: string | null; medicalDirectorNotes?: string | null; managerNotes?: string | null;
    patientFileComplete?: boolean | null; managerName?: string | null;
  } | null;
  followUps: { date?: string | null; notes?: string | null; kLevel?: string | null; painLevel?: number | null }[];
}

const dt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-GB") : "—");
const numOrDash = (v: unknown) => (v !== "" && v != null ? String(v) : "—");

// "المخزون" column — mirrors the website's inventory-status derivation.
const inventoryLabel = (status?: string | null, matched?: boolean | null) => {
  if (status === "APPROVED" || status === "DONE") return "خُصم";
  if (status === "PENDING") return "معلق";
  if (status === "NOT_AVAILABLE") return "لم يُخصم";
  if (matched === false) return "غير موجود بالمخزون";
  return "—";
};

// Long free-text block (opinions, summaries) — wraps naturally.
const Para = ({ label, value }: { label?: string; value?: string | null }) => {
  const v = (value ?? "").trim();
  if (!v) return null;
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={{ fontSize: 8.5, color: TEXT, marginBottom: 1, textAlign: "right", fontWeight: "bold" }}>{ar(label)}</Text>}
      <Text style={S.fieldValue}>{ar(v)}</Text>
    </View>
  );
};

// Committee opinion — bold label with the author's name badge, then the free text.
// Mirrors each opinion box in the website committee tab (shown even when empty).
const OpinionBlock = ({ label, author, value, note }: { label: string; author?: string | null; value?: string | null; note?: string | null }) => (
  <View style={{ marginBottom: 6 }} wrap={false}>
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 1 }}>
      <Text style={{ fontSize: 9, color: TEXT, fontWeight: "bold", textAlign: "right" }}>{ar(label)}</Text>
      {author ? <Text style={{ fontSize: 7.5, color: MUTED }}>{ar(author)}</Text> : null}
    </View>
    {note ? <Text style={{ fontSize: 7, color: MUTED, textAlign: "right", marginBottom: 1 }}>{ar(note)}</Text> : null}
    <Text style={S.fieldValue}>{ar((value ?? "").trim()) || "—"}</Text>
  </View>
);

// Lightweight sub-section divider inside a limb assessment (mirrors the website's
// "الألم والحساسية" / "الجلد" / "الحالة العامة" separators).
const Sub = ({ label }: { label: string }) => (
  <View wrap={false} style={{ marginTop: 6, marginBottom: 3 }}>
    <Text style={{ fontSize: 9, color: TEXT, fontWeight: "bold", textAlign: "right", borderBottomWidth: 0.5, borderBottomColor: MUTED, paddingBottom: 2 }}>
      {ar(label)}
    </Text>
  </View>
);

// "تقييم قوة حركة العضلات" — ROM moves grouped by joint, ticked with their grade.
const MuscleStrength = ({ a, isLower }: { a: CasePdfAssessment; isLower: boolean }) => {
  const rom = a.romData;
  const moves = isLower ? LOWER_ROM : UPPER_ROM;
  if (!rom || !moves.some((m) => rom[m.key]?.selected)) return null;
  const groups = [...new Set(moves.map((m) => m.group))];
  return (
    <>
      <Sub label="تقييم قوة حركة العضلات" />
      {groups.map((group) => (
        <View key={group} style={{ marginBottom: 3 }} wrap={false}>
          <Text style={{ fontSize: 8.5, color: TEXT, fontWeight: "bold", marginBottom: 2, textAlign: "right" }}>{ar(group)}</Text>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap" }}>
            {moves.filter((m) => m.group === group).map((m) => {
              const e = rom[m.key];
              const label = m.hasGrade && e?.selected && e?.grade ? `${m.label} (${e.grade})` : m.label;
              return (
                <View key={m.key} style={{ width: "33%" }}>
                  <Chk checked={!!e?.selected} label={label} />
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {a.muscleMotionNotes ? <Para label="ملاحظات" value={a.muscleMotionNotes} /> : null}
    </>
  );
};

// One limb's full assessment, laid out EXACTLY like the website's assessment tab —
// the same questions, in the same order, with the same option grids as tick boxes.
// Upper and lower limbs have slightly different question sets (region-aware below).
const AssessmentBlock = ({ a }: { a: CasePdfAssessment }) => {
  const title = `${a.region}${a.side ? ` — ${lbl(SIDE_LABEL, a.side)}` : ""}`;
  const isLower = a.region.includes("سفلي");
  const wb = (v?: boolean | null) => (v === true ? "موجود" : "غير موجود");
  const yn = (v?: boolean | null) => (v === true ? "نعم" : "لا");
  return (
    <View style={{ marginBottom: 6 }}>
      <SubHead label={title} />

      {/* جانب البتر */}
      <OptGrid label="جانب البتر" cols={3}
        options={[{ v: "RIGHT", l: "يمين" }, { v: "LEFT", l: "يسار" }, { v: "BILATERAL", l: "ثنائي الأطراف" }]}
        selected={a.side ?? ""} />

      {/* طول الجذمور — سؤال مختلف بين العلوي والسفلي */}
      <OptGrid cols={4} options={O_LENGTH} selected={a.residualLimbLength ?? ""}
        label={isLower ? "ما هو طول الجذمور في البتر فوق الركبة وتحت الركبة" : "في البتور عبر الساعد والعضد، كم طول الجذمور؟"} />

      {/* شكل الطرف المتبقي */}
      <OptGrid label="شكل الطرف المتبقي" cols={5} options={O_SHAPE} selected={a.residualLimbShape ?? ""} />

      {a.amputationLevelNote ? <Para label="ملاحظة حول مستوى البتر" value={a.amputationLevelNote} /> : null}
      <F label="تاريخ البتر" value={dt(a.amputationDate)} />
      <OptGrid label="سبب البتر" cols={3} options={O_CAUSE} selected={a.amputationCause ?? ""} />
      {a.clinicalHistory ? <Para label="القصة السريرية" value={a.clinicalHistory} /> : null}

      {/* ── الألم والحساسية ── */}
      <Sub label="الألم والحساسية" />
      <F label="الألم والحساسية" value={wb(a.painPresent)} />
      {a.painPresent ? (
        <>
          {isLower && a.painArea ? <F label="المنطقة" value={a.painArea} /> : null}
          {a.painIntensity != null ? <F label="شدة الألم" value={String(a.painIntensity)} /> : null}
        </>
      ) : null}
      <F label="ألم وهمي" value={wb(a.phantomPainPresent)} />
      {a.phantomPainPresent && a.phantomPainIntensity != null
        ? <F label="شدة الألم الوهمي" value={String(a.phantomPainIntensity)} /> : null}
      <OptGrid label="نوع الألم" cols={3} options={O_PAIN_TYPE} selected={a.painTypes ?? []} />
      {a.painTypeOtherDetail ? <F label="نوع الألم (أخرى)" value={a.painTypeOtherDetail} /> : null}

      {isLower ? (
        <>
          <F label="النوروم العصبي" value={wb(a.neuromaPalpable)} />
          <OptGrid label="قابلية التحميل على الجذمور" cols={4} options={O_LOAD} selected={a.loadTolerance ?? ""} />
          {a.loadTolerance === "WEIGHT_BEARING"
            ? <OptGrid label="إذا كان قابل لتحمل الوزن" cols={4} options={O_WB} selected={a.weightBearingLevel ?? ""} /> : null}
        </>
      ) : (
        <>
          <F label="النوروم العصبي" value={wb(a.neuromaPresent)} />
          <OptGrid label="وضع الجذمور" cols={2}
            options={[{ v: "TOUCH", l: "قابل للمس" }, { v: "NOTOUCH", l: "غير قابل للمس" }]}
            selected={a.neuromaPalpable === true ? "TOUCH" : a.neuromaPalpable === false ? "NOTOUCH" : ""} />
        </>
      )}
      {a.skinNotes ? <Para label="ملاحظات" value={a.skinNotes} /> : null}

      {/* ── الجلد ── */}
      <Sub label="الجلد" />
      <OptGrid label={isLower ? "المظهر العام للجلد" : "المظهر العام"} cols={3} options={O_SKIN} selected={a.skinAppearance ?? []} />
      <OptGrid label="لون البشرة" cols={3} options={O_COLOR} selected={a.skinColor ?? []} />
      <OptGrid label={isLower ? "درجة حرارة الجسم" : "درجة حرارة الجلد"} cols={3} options={O_TEMP} selected={a.skinTemperature ?? ""} />
      <View wrap={false} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Chk checked={!!a.hasSkinGrafts} label="يوجد طعم جلدي" />
        {a.hasSkinGrafts && a.graftArea ? <Text style={S.fieldValue}>{ar(a.graftArea)}</Text> : null}
      </View>
      <OptGrid label="حالة الندبة" cols={4} options={isLower ? O_SCAR_LOWER : O_SCAR_UPPER} selected={a.scarCondition ?? []} />
      {!isLower && a.closureNotes ? <Para label="تعليقات" value={a.closureNotes} /> : null}

      {/* ── الحالة العامة ── */}
      <Sub label="الحالة العامة" />
      {a.generalHealthNotes ? <Para label="حالة الصحة العامة" value={a.generalHealthNotes} /> : null}
      {a.otherLimbCondition ? <Para label="حالة الأطراف الأخرى" value={a.otherLimbCondition} /> : null}
      <F label="هل يستخدم المريض طرفاً صناعياً حالياً؟" value={yn(a.currentlyUsingProsthesis)} />
      {a.currentlyUsingProsthesis && a.prostheticLimbType ? <F label="نوع الطرف الصناعي" value={a.prostheticLimbType} /> : null}
      {a.currentlyUsingProsthesis === false ? (
        <>
          <F label={isLower ? "إذا كانت الإجابة لا هل استخدمه سابقاً" : "هل استخدم الطرف الصناعي سابقاً؟"} value={yn(a.previouslyUsedProsthesis)} />
          {a.previouslyUsedProsthesis && a.previousProsthesisSystemDetail
            ? <F label="نظام الطرف الصناعي" value={a.previousProsthesisSystemDetail} /> : null}
        </>
      ) : null}
      {isLower ? (
        <>
          <F label="هل يستخدم وسائل مساعدة في عملية التنقل" value={yn(a.usesAssistiveDevices)} />
          {a.usesAssistiveDevices && a.assistiveDeviceTypes ? <F label="نوع الوسيلة المساعدة" value={a.assistiveDeviceTypes} /> : null}
          <F label="هل يمكنه صعود ونزول درج" value={yn(a.canClimbStairs)} />
        </>
      ) : null}
      <F label="هل يستطيع الحفاظ على توازنه على جانب واحد فقط؟" value={yn(a.canBalanceOneSide)} />
      {!isLower ? <F label="هل يستخدم المريض رباط ضاغط؟" value={yn(a.usesCompressionBandage)} /> : null}
      <OptGrid label="الحالة الطبيعية" cols={2} options={O_NORMAL_STATE} selected={a.jointsRangeOfMotion ?? ""} />
      <OptGrid label="مستوى النشاط" cols={5} options={O_KLEVEL} selected={a.activityLevel ?? ""} />

      {/* ── تقييم قوة حركة العضلات ── */}
      <MuscleStrength a={a} isLower={isLower} />

      <F label="تاريخ التقييم" value={dt(a.examinedAt)} />
    </View>
  );
};

// One row of a balance sub-scale: test label + its options as ticked boxes.
const BalRow = ({ label, opts, selected }: { label: string; opts: O[]; selected?: string | null }) => (
  <View wrap={false} style={{ flexDirection: "row-reverse", alignItems: "center", marginBottom: 2 }}>
    <Text style={{ flex: 1.8, fontSize: 8.5, color: TEXT, textAlign: "right" }}>{ar(label)}</Text>
    {opts.map((o) => (
      <View key={o.v} style={{ flex: 1 }}><Chk checked={selected === o.v} label={o.l} /></View>
    ))}
  </View>
);

// One balance assessment (Pro-015), laid out to mirror the website balance tab.
const BalanceBlock = ({ b }: { b: CasePdfBalance }) => {
  const yn = (v?: boolean | null) => (v === true ? "نعم" : "لا");
  const sb = b.staticBalance ?? {}, dtk = b.dynamicTasks ?? {}, da = b.dynamicActivities ?? {};
  return (
    <View style={{ marginBottom: 6 }}>
      <SubHead label={`التقييم${b.assessmentDate ? ` — ${dt(b.assessmentDate)}` : ""}`} />

      <Sub label="بيانات أساسية" />
      <F label="تاريخ التقييم" value={dt(b.assessmentDate)} />
      <F label="هل استخدم طرف صناعي سابق" value={yn(b.previousProsthesis)} />
      {b.previousProsthesis && b.previousProsthesisNotes ? <F label="تفاصيل الطرف السابق" value={b.previousProsthesisNotes} /> : null}
      <OptGrid label="وسيلة مساعدة" cols={4} options={BAL_ASSIST_OPTS} selected={b.assistiveDevice ?? ""} />

      <Sub label="تقييم التوازن الثابت" />
      {BAL_STATIC.map((r) => <BalRow key={r.k} label={r.l} opts={BAL_STATIC_OPTS} selected={sb[r.k]} />)}

      <Sub label="تقييم التوازن الديناميكي" />
      {BAL_DYN_TASK.map((r) => <BalRow key={r.k} label={r.l} opts={BAL_DYN_TASK_OPTS} selected={dtk[r.k]} />)}

      <Sub label="تقييم الأنشطة الديناميكية" />
      {BAL_DYN_ACT.map((r) => <BalRow key={r.k} label={r.l} opts={BAL_DYN_ACT_OPTS} selected={da[r.k]} />)}

      <Sub label="تقييم خطر السقوط" />
      <F label="تاريخ سقوط سابق" value={yn(b.historyOfFalls)} />
      {b.historyOfFalls && b.fallRiskNotes ? <F label="تاريخ السقوط" value={b.fallRiskNotes} /> : null}
      <F label="شبه سقوط" value={yn(b.nearFalls)} />
      <F label="خوف من السقوط" value={yn(b.fearOfFalling)} />
      <OptGrid label="مستوى خطر السقوط" cols={3} options={BAL_FALLRISK_OPTS} selected={b.fallRiskLevel ?? ""} />

      <Sub label="خلاصة التوازن والانطباع السريري" />
      <OptGrid label="مستوى التوازن العام" cols={3} options={BAL_OVERALL_OPTS} selected={b.overallBalanceLevel ?? ""} />
      <OptGrid label="العوامل المؤثرة الرئيسية" cols={2} options={BAL_FACTORS} selected={b.limitingFactors ?? []} />
      {b.limitingFactorsOtherNotes ? <F label="تفاصيل أخرى" value={b.limitingFactorsOtherNotes} /> : null}

      {b.exerciseProgram && b.exerciseProgram.length ? (
        <>
          <Sub label="برنامج تمارين التوازن" />
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 0.4 }]}>✓</Text>
              <Text style={[S.tableCellHead, { flex: 1.8 }]}>{ar("التمرين")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.8 }]}>{ar("الوضعية")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("الجرعة")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("الدعم")}</Text>
              <Text style={[S.tableCellHead, { flex: 1.4 }]}>{ar("ملاحظات")}</Text>
            </View>
            {b.exerciseProgram.map((ex, i) => (
              <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                <Text style={[S.tableCell, { flex: 0.4 }]}>{ex.selected ? "✓" : "—"}</Text>
                <Text style={[S.tableCell, { flex: 1.8 }]}>{ar(ex.exercise ?? "") || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.8 }]}>{ar(ex.position ?? "") || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{ex.dosage || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.9 }]}>{ar(lbl(BAL_SUPPORT_LBL, ex.support)) || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1.4 }]}>{ar(ex.notes ?? "") || "—"}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Sub label="خطة تطوير البرنامج" />
      <OptGrid cols={2} options={BAL_PROGRESSION} selected={b.programProgression ?? []} />

      <Sub label="المراجعة والمتابعة" />
      <F label="المراجعة بعد (أسابيع)" value={numOrDash(b.followUpWeeks)} />
      <OptGrid label="الهدف المتوقع" cols={2} options={BAL_OUTCOMES} selected={b.expectedOutcomes ?? []} />

      <Sub label="التوقيعات" />
      <F label="رئيس لجنة التقييم" value={b.committeeHeadName} />
      <F label="المعالج الفيزيائي" value={b.physiotherapistName} />
      {b.notes ? <Para label="ملاحظات" value={b.notes} /> : null}
    </View>
  );
};

// ── PDF Document ─────────────────────────────────────────────────────────────────
const ProstheticsCasePdfDoc = ({ data, age }: { data: CasePdfData; age: string }) => {
  const p = data.patient;
  const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—";
  const gender = p.gender === "MALE" ? "ذكر" : p.gender === "FEMALE" ? "أنثى" : "—";
  const ampTypes = data.amputation.types.map((tt) => TYPE_LABEL[tt] ?? tt).join(" / ") || "—";
  const c = data.committee;
  const committeeHasContent = (!!c && (c.prosthetistOpinion || c.physiotherapistOpinion || c.doctorOpinion ||
    c.finalSummary)) || data.proposed.prosthesisSuitable != null || !!data.proposed.proposedProsthesisType;
  const fe = data.finalEval;
  const feHasContent = !!fe && Object.values(fe).some((v) => v != null && v !== "");

  return (
    <Document title={`تقرير حالة أطراف صناعية — ${fullName}`} author="Vita HR System" language="ar">
      <Page size="A4" style={S.page}>
        <PageHeader />
        <PageFooter />

        {/* ── معلومات المريض ── */}
        <SecHead label="تقرير حالة الأطراف الصناعية" />
        <InfoGrid
          items={[
            { label: "اسم المريض", value: fullName },
            { label: "رقم تعريف المريض", value: p.patientNumber || "—" },
            { label: "العمر", value: age },
            { label: "الجنس", value: gender },
            { label: "رقم الهاتف", value: p.phone || "—" },
            { label: "تاريخ الميلاد", value: dt(p.dateOfBirth) },
            { label: "الطول", value: p.heightCm ? `${p.heightCm} cm` : "—" },
            { label: "الوزن", value: p.weightKg ? `${p.weightKg} kg` : "—" },
            { label: "مؤشر الكتلة", value: p.bmi ? Number(p.bmi).toFixed(1) : "—" },
          ]}
        />

        {/* ── الاستقبال ── (mirrors the website "intake" tab: same fields & order) */}
        <SecHead label="الاستقبال" />

        {/* 1. أمراض مزمنة */}
        <Bool label="هل يوجد أمراض مزمنة؟" value={data.clinical.hasChronicDiseases} />
        {data.clinical.hasChronicDiseases && data.clinical.chronicDiseases
          ? <F label="اسم المرض" value={data.clinical.chronicDiseases} /> : null}

        {/* 2. سبب الإصابة + تاريخ البتر */}
        <View style={{ flexDirection: "row-reverse", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <F label="سبب الإصابة" value={lbl(CAUSE_LABEL, data.amputation.cause)} />
          </View>
          <View style={{ flex: 1 }}>
            <F label="تاريخ البتر" value={dt(data.amputation.date)} />
          </View>
        </View>
        {data.amputation.cause === "OTHER" && data.amputation.causeOther
          ? <F label="يرجى التحديد" value={data.amputation.causeOther} /> : null}

        {/* 3. عدد البتور — checkboxes 1..4 like the website (defaults to 1) */}
        <OptGrid
          label="عدد البتور"
          cols={4}
          options={[{ v: "1", l: "1" }, { v: "2", l: "2" }, { v: "3", l: "3" }, { v: "4", l: "4" }]}
          selected={String(data.amputation.count ?? "1")}
        />

        {/* 4. جانب الاصابة — checkboxes like the website */}
        <OptGrid
          label="جانب الاصابة"
          cols={3}
          options={[{ v: "RIGHT", l: "يمين (R)" }, { v: "LEFT", l: "يسار (L)" }, { v: "BILATERAL", l: "ثنائي" }]}
          selected={data.amputation.side ?? ""}
        />

        {/* 5. نوع البتر — checkboxes like the website */}
        <OptGrid
          label="نوع البتر"
          cols={2}
          options={[{ v: "UPPER", l: "طرف علوي" }, { v: "LOWER", l: "طرف سفلي" }]}
          selected={data.amputation.types ?? []}
        />

        {/* 6. مستوى البتر */}
        <F label="مستوى البتر" value={data.amputation.level} />

        {/* 7. علاج فيزيائي سابق */}
        <Bool label="هل خضع لجلسات علاج فيزيائي سابقاً؟" value={data.clinical.hasPhysicalTherapy} />
        {data.clinical.hasPhysicalTherapy && data.clinical.physicalTherapyDetails
          ? <F label="التوضيح" value={data.clinical.physicalTherapyDetails} /> : null}

        {/* 8. طرف صناعي سابق */}
        <Bool label="هل سبق له تركيب طرف صناعي؟" value={data.clinical.hasPreviousProsthesis} />
        {data.clinical.hasPreviousProsthesis ? (
          <>
            {data.clinical.previousProsthesisDetails
              ? <F label="التوضيح" value={data.clinical.previousProsthesisDetails} /> : null}
            {data.clinical.previousProsthesisWhen
              ? <F label="متى؟" value={data.clinical.previousProsthesisWhen} /> : null}
            {data.clinical.previousProsthesisWhere
              ? <F label="أين؟" value={data.clinical.previousProsthesisWhere} /> : null}
            {data.clinical.previousProsthesisType
              ? <F label="نوع الطرف" value={data.clinical.previousProsthesisType} /> : null}
          </>
        ) : null}

        {/* 9. تصحيح بتر */}
        <Bool label="هل سبق أن خضع لعملية تصحيح بتر؟" value={data.clinical.hasRevisionSurgery} />
        {data.clinical.hasRevisionSurgery && data.clinical.revisionDetails
          ? <F label="التوضيح" value={data.clinical.revisionDetails} /> : null}

        {/* ── الفريق الطبي ── */}
        <SecHead label="الفريق الطبي" />
        <F label="أخصائي الأطراف الصناعية" value={data.team.prosthetist} />
        <F label="أخصائي العلاج الفيزيائي" value={data.team.physiotherapist} />
        <F label="الطبيب المشرف" value={data.team.supervisingDoctor} />
        {data.team.workshopSupervisor && <F label="مشرف الورشة" value={data.team.workshopSupervisor} />}

        {/* ── التقييم ── */}
        <SecHead label="التقييم" break />
        {data.assessments.length === 0 ? (
          <Text style={S.note}>{ar("لا يوجد تقييم مسجّل")}</Text>
        ) : (
          data.assessments.map((a, i) => <AssessmentBlock key={i} a={a} />)
        )}

        {/* ── مراجعة اللجنة ── (mirrors the website committee tab exactly) */}
        <SecHead label="أعضاء لجنة القبول وتقييماتهم" break />
        {!committeeHasContent ? (
          <Text style={S.note}>{ar("لم تُسجّل مراجعة اللجنة بعد")}</Text>
        ) : (
          <>
            <OpinionBlock label="تقييم فني الأطراف الصناعية" author={c?.prosthetistName} value={c?.prosthetistOpinion} />
            <OpinionBlock label="تقييم المعالج الفيزيائي" author={c?.physioName} value={c?.physiotherapistOpinion} />
            <OpinionBlock label="رأي الطبيب المختص" author={c?.doctorName} value={c?.doctorOpinion} />
            <OpinionBlock
              label="الخلاصة"
              author={c?.decidedByName}
              note={c?.decidedAt ? `تم اعتماد القرار بتاريخ ${new Date(c.decidedAt).toLocaleString("en-GB")}` : undefined}
              value={c?.finalSummary}
            />

            {/* القرار النهائي */}
            <SecHead label="القرار النهائي" />
            <F label="هل المريض مناسب للطرف الصناعي؟"
              value={data.proposed.prosthesisSuitable === true ? "مناسب" : data.proposed.prosthesisSuitable === false ? "غير مناسب" : "—"} />
            {data.proposed.prosthesisSuitable && data.proposed.proposedProsthesisType
              ? <F label="نوع الطرف الصناعي المقترح" value={data.proposed.proposedProsthesisType} /> : null}
          </>
        )}

        {/* ── الطرف الصناعي المقترح ── */}
        <SecHead label="الطرف الصناعي المقترح" />
        <F label="النوع المقترح" value={lbl(PROSTHETIC_TYPE_LABEL, data.proposed.proposedProstheticType)} />
        <F label="النوع المعتمد" value={lbl(PROSTHETIC_TYPE_LABEL, data.proposed.prosthesisType)} />
        {data.proposed.proposedProsthesisType && <F label="وصف النوع المقترح" value={data.proposed.proposedProsthesisType} />}
        <Bool label="اكتمل تصنيع الطرف" value={data.proposed.prosthesisCompleted} />
        <Bool label="الطرف مناسب للمريض" value={data.proposed.prosthesisSuitable} />

        {/* ── الأجزاء المضافة ── (mirrors the website "الأجزاء المضافة" table columns) */}
        <SecHead label="الأجزاء المضافة" break />
        {data.components.length === 0 ? (
          <Text style={S.note}>{ar("لا توجد أجزاء مضافة")}</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 1.3 }]}>{ar("الكود")}</Text>
              <Text style={[S.tableCellHead, { flex: 1.3 }]}>{ar("القطعة")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("الشركة")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("المصدر")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("تاريخ الإضافة")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("حالة الطلب")}</Text>
              <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("المخزون")}</Text>
            </View>
            {data.components.map((cp, i) => (
              <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                <Text style={[S.tableCell, { flex: 1.3 }]}>{cp.partCode || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1.3 }]}>{ar(cp.partName ?? "") || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{cp.supplier || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.9 }]}>{ar(lbl(SOURCE_LOCATION_LABEL, cp.sourceLocation)) || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{dt(cp.addedAt)}</Text>
                <Text style={[S.tableCell, { flex: 0.9 }]}>{ar(lbl(REQUEST_STATUS_LABEL, cp.requestStatus)) || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1 }]}>{ar(inventoryLabel(cp.requestStatus, cp.matched))}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── الجلسات ── (برنامج المتابعة: session table with the website's fields) */}
        <SecHead label="الجلسات" break />
        {!data.sessions || data.sessions.length === 0 ? (
          <Text style={S.note}>{ar("لا توجد جلسات مسجّلة")}</Text>
        ) : (
          <View style={S.table}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("التاريخ")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("الوقت")}</Text>
              <Text style={[S.tableCellHead, { flex: 2 }]}>{ar("الشرح / الوصف")}</Text>
              <Text style={[S.tableCellHead, { flex: 1.3 }]}>{ar("المعالج")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.8 }]}>{ar("وقت الدخول")}</Text>
              <Text style={[S.tableCellHead, { flex: 0.8 }]}>{ar("وقت الخروج")}</Text>
              <Text style={[S.tableCellHead, { flex: 1.6 }]}>{ar("ملاحظات")}</Text>
            </View>
            {data.sessions.map((s, i) => (
              <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                <Text style={[S.tableCell, { flex: 0.9 }]}>{dt(s.sessionDate)}</Text>
                <Text style={[S.tableCell, { flex: 0.7 }]}>{s.sessionTime || "—"}</Text>
                <Text style={[S.tableCell, { flex: 2 }]}>{ar(s.description ?? "") || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1.3 }]}>{ar(s.therapistName ?? "") || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.8 }]}>{s.startTime || "—"}</Text>
                <Text style={[S.tableCell, { flex: 0.8 }]}>{s.endTime || "—"}</Text>
                <Text style={[S.tableCell, { flex: 1.6 }]}>{ar(s.notes ?? "") || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── التسليم التجريبي ── (mirrors the website "delivered" tab) */}
        <SecHead label="التسليم التجريبي" break />
        {!data.delivery ? (
          <Text style={S.note}>{ar("لا توجد بيانات تسليم")}</Text>
        ) : (
          <>
            <View style={{ flexDirection: "row-reverse", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <F label="تاريخ الخروج" value={dt(data.delivery.dischargeDate)} />
                <F label="الفني — الأطراف الصناعية" value={data.delivery.prosthetist} />
              </View>
              <View style={{ flex: 1 }}>
                <F label="المعالج الفيزيائي" value={data.delivery.physiotherapist} />
                <F label="المدير الطبي" value={data.delivery.medicalDirector} />
              </View>
            </View>
            <F label="التاريخ" value={dt(data.delivery.date)} />

            <SubHead label="القطع المُسلَّمة" />
            {!data.delivery.items || data.delivery.items.length === 0 ? (
              <Text style={S.note}>{ar("لا توجد قطع بعد")}</Text>
            ) : (
              <View style={S.table}>
                <View style={S.tableHeaderRow} fixed>
                  <Text style={[S.tableCellHead, { flex: 1.5 }]}>{ar("الاسم")}</Text>
                  <Text style={[S.tableCellHead, { flex: 1.2 }]}>{ar("الرمز")}</Text>
                  <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("الكمية")}</Text>
                  <Text style={[S.tableCellHead, { flex: 1.2 }]}>{ar("الشركة")}</Text>
                  <Text style={[S.tableCellHead, { flex: 0.9 }]}>{ar("المصدر")}</Text>
                  <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("تاريخ الإضافة")}</Text>
                </View>
                {data.delivery.items.map((it, i) => (
                  <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                    <Text style={[S.tableCell, { flex: 1.5 }]}>{ar(it.name ?? "") || "—"}</Text>
                    <Text style={[S.tableCell, { flex: 1.2 }]}>{it.symbol || "—"}</Text>
                    <Text style={[S.tableCell, { flex: 0.7 }]}>{numOrDash(it.quantity)}</Text>
                    <Text style={[S.tableCell, { flex: 1.2 }]}>{it.company || "—"}</Text>
                    <Text style={[S.tableCell, { flex: 0.9 }]}>{ar(it.source ?? "") || "—"}</Text>
                    <Text style={[S.tableCell, { flex: 1 }]}>{dt(it.addedDate)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── تحليل المشي ── (full per-session detail, mirroring the website form) */}
        <SecHead label="تحليل المشي" break />
        {data.gait.length === 0 ? (
          <Text style={S.note}>{ar("لا توجد جلسات تحليل مشي مسجّلة")}</Text>
        ) : (
          data.gait.map((g, i) => (
            <View key={i}>
              <SubHead label={`جلسة ${g.sessionNumber ?? i + 1}${g.sessionDate ? ` — ${dt(g.sessionDate)}` : ""}`} />
              <GaitSessionBlock form={g.form} prosthetistName={g.prosthetistName} />
            </View>
          ))
        )}

        {/* ── التوازن ── (mirrors the website "balance" tab — lower-limb only) */}
        {data.amputation.types.includes("LOWER") && (
          <>
            <SecHead label="التوازن" break />
            {!data.balance || data.balance.length === 0 ? (
              <Text style={S.note}>{ar("لا توجد تقييمات توازن مسجّلة")}</Text>
            ) : (
              data.balance.map((b, i) => <BalanceBlock key={i} b={b} />)
            )}
          </>
        )}

        {/* ── التقييم النهائي ── (mirrors the website final-evaluation tab: 4 sections) */}
        <SecHead label="التقييم النهائي" break />
        {!feHasContent ? (
          <Text style={S.note}>{ar("لم يُسجّل التقييم النهائي بعد")}</Text>
        ) : (
          <>
            {/* 1. المعلومات الطبية حول الطرف الصناعي */}
            <Sub label="المعلومات الطبية حول الطرف الصناعي" />
            {fe?.residualLimbCondition ? <Para label="حالة الجذمور" value={fe.residualLimbCondition} /> : null}
            <F label="نظام التعليق" value={fe?.suspensionSystemUsed} />
            <F label="عدد الجوارب المسلّمة" value={numOrDash(fe?.socksDelivered)} />
            <F label="عدد اللاينر (السيليكون) المسلّم" value={numOrDash(fe?.linersDelivered)} />
            <F label="تاريخ التركيب" value={dt(fe?.fittingDate)} />
            {fe?.generalNotes ? <Para label="ملاحظات عامة" value={fe.generalNotes} /> : null}

            {/* 2. الرأي النهائي للجنة */}
            <Sub label="الرأي النهائي للجنة" />
            <Para label="رأي المعالج الفيزيائي" value={fe?.physioOpinion} />
            <Para label="رأي رئيس القسم" value={fe?.departmentHeadOpinion} />
            <Para label="رأي فني الأطراف الصناعية" value={fe?.prosthetistOpinion} />
            <Para label="رأي مسؤول فني الأطراف الصناعية" value={fe?.prosthetistSupervisorOpinion} />
            <Para label="رأي رئيس اللجنة" value={fe?.committeeHeadOpinion} />
            <Para label="رأي الخبير (إن وجد)" value={fe?.expertOpinion} />

            {/* 3. اعتماد المدير الطبي */}
            <Sub label="اعتماد المدير الطبي" />
            <Text style={S.note}>{ar("بعد مراجعة التقييمات أعلاه، أقر بأن الطرف الصناعي جاهز للتسليم ولا يوجد مانع طبي أو فني من خروج المريض.")}</Text>
            <OptGrid cols={2}
              options={[{ v: "READY", l: "معتمد للتسليم" }, { v: "FOLLOWUP", l: "يحتاج متابعة / تعديل قبل التسليم" }]}
              selected={fe?.readyForDelivery ? "READY" : fe?.needsFollowUp ? "FOLLOWUP" : ""} />
            {fe?.needsFollowUp && fe?.followUpPlan ? <Para label="خطة المتابعة (إن وجدت)" value={fe.followUpPlan} /> : null}
            {fe?.medicalDirectorNotes ? <Para label="ملاحظات عامة" value={fe.medicalDirectorNotes} /> : null}

            {/* 4. تدقيق المدير */}
            <Sub label="تدقيق المدير" />
            {fe?.managerNotes ? <Para label="ملاحظات عامة" value={fe.managerNotes} /> : null}
            <OptGrid label="اضبارة المريض" cols={2}
              options={[{ v: "COMPLETE", l: "مكتملة" }, { v: "INCOMPLETE", l: "غير مكتملة" }]}
              selected={fe?.patientFileComplete === true ? "COMPLETE" : fe?.patientFileComplete === false ? "INCOMPLETE" : ""} />
            <F label="توقيع المدير" value={fe?.managerName} />
          </>
        )}

        {/* ── التسليم النهائي ── (mirrors the website final_delivery tab + pledge) */}
        <SecHead label="التسليم النهائي" break />
        {!data.finalDelivery ? (
          <Text style={S.note}>{ar("لم يُنشأ التسليم النهائي بعد")}</Text>
        ) : (
          <>
            <View style={{ flexDirection: "row-reverse", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <F label="تاريخ الخروج" value={dt(data.finalDelivery.dischargeDate)} />
                <F label="الفني — الأطراف الصناعية" value={data.finalDelivery.prosthetist} />
                <F label="المدير التنفيذي (CEO)" value={data.finalDelivery.ceo} />
              </View>
              <View style={{ flex: 1 }}>
                <F label="المعالج الفيزيائي" value={data.finalDelivery.physiotherapist} />
                <F label="التاريخ" value={dt(data.finalDelivery.date)} />
              </View>
            </View>

            <SubHead label="القطع" />
            {!data.finalDelivery.items || data.finalDelivery.items.length === 0 ? (
              <Text style={S.note}>{ar("لا توجد قطع.")}</Text>
            ) : (
              <View style={S.table}>
                <View style={S.tableHeaderRow} fixed>
                  <Text style={[S.tableCellHead, { flex: 1.6 }]}>{ar("الاسم")}</Text>
                  <Text style={[S.tableCellHead, { flex: 1.2 }]}>{ar("الرمز")}</Text>
                  <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("الكمية")}</Text>
                  <Text style={[S.tableCellHead, { flex: 1.2 }]}>{ar("الشركة")}</Text>
                  <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("تاريخ الإضافة")}</Text>
                </View>
                {data.finalDelivery.items.map((it, i) => (
                  <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                    <Text style={[S.tableCell, { flex: 1.6 }]}>{ar(it.name ?? "") || "—"}</Text>
                    <Text style={[S.tableCell, { flex: 1.2 }]}>{it.symbol || "—"}</Text>
                    <Text style={[S.tableCell, { flex: 0.7 }]}>{numOrDash(it.quantity)}</Text>
                    <Text style={[S.tableCell, { flex: 1.2 }]}>{it.company || "—"}</Text>
                    <Text style={[S.tableCell, { flex: 1 }]}>{dt(it.addedDate)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* إقرار وتعهد */}
            <SubHead label="إقرار وتعهد" />
            <Text style={{ fontSize: 9, color: TEXT, fontWeight: "bold", textAlign: "right", marginBottom: 3 }}>{ar("أقر وأتعهد بما يلي:")}</Text>
            <Sub label="أولاً: الاستلام والإقرار بالتعليمات" />
            <Text style={S.fieldValue}>{ar("أقر بأنني قد استلمت الطرف الصناعي المحدد تفصيلاً في نموذج التسليم النهائي المرفق، الذي يعتبر جزءاً لا يتجزأ من هذا الإقرار، وذلك بحالة فنية سليمة وجهوزية تامة.")}</Text>
            <Text style={S.fieldValue}>{ar("وأتعهد باستخدامه حصراً وفقاً للتعليمات المكتوبة المرفقة به.")}</Text>
            <Text style={S.fieldValue}>{ar("وأقر بأنني قد تلقيت شرحاً كافياً ومفصلاً من المختصين حول طريقة الاستخدام الصحيحة، والصيانة الدورية، وحدود الاستخدام المسموحة.")}</Text>
            <Sub label="ثانياً: نطاق الضمان وإخلاء المسؤولية" />
            <Text style={S.fieldValue}>{ar("أقر بأن الضمان الممنوح من الشركة على هذا الطرف الصناعي يغطي فقط عيوب التصنيع والمواد الأولية وفق الشروط المحددة في وثيقة الضمان المستقلة.")}</Text>
            <Text style={S.fieldValue}>{ar("وأوافق وأقر بأن الشركة المصنعة (أوتوبوك) أو الوكيل أو أي من منسوبيهما لن يكونوا مسؤولين بأي حال من الأحوال عن أي أعطال تقنية أو تلف أو حوادث أو إصابات تنشأ عن أي من الأسباب التالية:")}</Text>
            <Text style={S.fieldValue}>{ar("• مخالفة تعليمات الاستخدام أو الإهمال في الصيانة الدورية.")}</Text>
            <Text style={S.fieldValue}>{ar("• تعريض الطرف لصدمات أو أحمال أو استخدامات تتجاوز الحدود الموصى بها في تعليمات الشركة.")}</Text>
            <Text style={S.fieldValue}>{ar("• قيام جهة غير معتمدة من الشركة بأي تعديل أو إصلاح للطرف.")}</Text>
            <Sub label="ثالثاً: إقرار نهائي" />
            <Text style={S.fieldValue}>{ar("أقر بأنني قد اطلعت على بنود هذا الإقرار وفهمتها وأوقعه بإرادتي الكاملة دون أي إكراه.")}</Text>
            <F label="الاسم الكامل / اسم ولي الأمر" value={data.finalDelivery.patientName} />
          </>
        )}

        {/* ── المتابعة ── */}
        {data.followUps.length > 0 && (
          <>
            <SecHead label="جلسات المتابعة" />
            <View style={S.table}>
              <View style={S.tableHeaderRow} fixed>
                <Text style={[S.tableCellHead, { flex: 1 }]}>{ar("التاريخ")}</Text>
                <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("مستوى K")}</Text>
                <Text style={[S.tableCellHead, { flex: 0.7 }]}>{ar("الألم")}</Text>
                <Text style={[S.tableCellHead, { flex: 2 }]}>{ar("ملاحظات")}</Text>
              </View>
              {data.followUps.map((f, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
                  <Text style={[S.tableCell, { flex: 1 }]}>{dt(f.date)}</Text>
                  <Text style={[S.tableCell, { flex: 0.7 }]}>{f.kLevel || "—"}</Text>
                  <Text style={[S.tableCell, { flex: 0.7 }]}>{f.painLevel != null ? `${f.painLevel}/10` : "—"}</Text>
                  <Text style={[S.tableCell, { flex: 2 }]}>{ar(f.notes ?? "") || "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── توقيعات ── */}
        <View style={{ marginTop: 30, flexDirection: "row-reverse", justifyContent: "space-around" }}>
          {["توقيع فني الأطراف الصناعية", "توقيع الطبيب المشرف", "توقيع رئيس القسم"].map((label, i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <View style={{ width: 100, borderBottomWidth: 0.5, borderBottomColor: TEXT }} />
              <Text style={{ fontSize: 8.5, color: MUTED, textAlign: "center" }}>{ar(label)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

// ── Public export ────────────────────────────────────────────────────────────────
export async function downloadProstheticsCasePdf(data: CasePdfData): Promise<void> {
  ensureAmiriFonts();
  const dob = data.patient.dateOfBirth;
  const age = dob
    ? `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} سنة`
    : "—";
  const blob = await pdf(<ProstheticsCasePdfDoc data={data} age={age} />).toBlob();
  const tag = data.patient.patientNumber?.trim() || data.caseId.slice(-8);
  saveBlob(blob, `prosthetics-case-${tag}.pdf`);
}
