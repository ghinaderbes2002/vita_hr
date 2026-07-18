// Client-only — imported via dynamic import() to avoid SSR issues.
// Renders the Prosthetics Gait-Analysis form (Pro-016) in the shared VitaSyr PDF
// style (see pdf-kit.tsx). Each on-screen tab becomes one page/section.
import React from "react";
import { Document, Page, Image, Text, View, pdf } from "@react-pdf/renderer";
import {
  S, TEXT, MUTED,
  ar, PageHeader, PageFooter, SecHead, SubHead, F, Bool, Chk, OptGrid, InfoGrid,
  ensureAmiriFonts, saveBlob, toDataUri, type Opt,
} from "./pdf-kit";

// ── Option label maps (mirrored from the prosthetics page) ──────────────────────
const SUSPENSION_OPTS: Opt[] = [
  { v: "PIN", l: "Pin" }, { v: "PASSIVE_VACUUM", l: "Passive vacuum" }, { v: "ACTIVE_VACUUM", l: "Active vacuum" },
  { v: "DVS", l: "DVS" }, { v: "SOFT_SOCKET", l: "Soft socket" }, { v: "BELT_STRAP", l: "belt/strap" }, { v: "OTHER", l: "other" },
];
const SOCKET_BEARING_OPTS: Opt[] = [
  { v: "PTB", l: "التحميل على وتر الرصفة" },
  { v: "TSB", l: "تحميل كامل على سطح الجذع" },
  { v: "MAS", l: "سوكيت تشريحي عند الكاحل" },
  { v: "ISCHIAL_CONTAINMENT", l: "التحميل على عظم الاسك" },
  { v: "OTHER", l: "أخرى" },
];
const KNEE_JOINT_OPTS: Opt[] = [
  { v: "MKP", l: "MKP" }, { v: "MONOCENTRIC", l: "monocentric" }, { v: "POLYCENTRIC", l: "polycentric" },
  { v: "HYDRAULIC", l: "hydraulic" }, { v: "MECHANICAL", l: "mechanical" }, { v: "OTHER", l: "other" },
];
const FOOT_TYPE_OPTS: Opt[] = [
  { v: "DYNAMIC", l: "dynamic" }, { v: "HYDRAULIC", l: "hydraulic" }, { v: "SACH", l: "SACH" },
  { v: "CARBON", l: "Carbon" }, { v: "SINGLE_AXIS", l: "single-axis" }, { v: "MULTI_AXIS", l: "multi-axis" }, { v: "OTHER", l: "other" },
];
const COMPLAINT_OPTS: Opt[] = [
  { v: "RAPID_FATIGUE", l: "تعب سريع" }, { v: "FALL_NEAR_FALL", l: "تعثّر" },
  { v: "DIFFICULTY_STAIRS", l: "صعوبة استخدام الدرج" }, { v: "FOOT_DRAG", l: "جر القدم" },
  { v: "KNEE_INSTABILITY", l: "عدم ثبات بالركبة" }, { v: "SOCKET_PAIN", l: "ألم بالسوكيت" },
  { v: "RESIDUAL_LIMB_PAIN", l: "ألم بالجذمور" }, { v: "NONE", l: "لا يوجد" },
];
const GFP_OPTS: Opt[] = [{ v: "GOOD", l: "جيد" }, { v: "FAIR", l: "متوسط" }, { v: "POOR", l: "ضعيف" }];
const ALIGNMENT_OPTS: Opt[] = [{ v: "GOOD", l: "جيد" }, { v: "NEEDS_ADJUSTMENT", l: "يحتاج تعديل" }];
const SITTING_BAL_OPTS: Opt[] = [{ v: "INDEPENDENT", l: "مستقل" }, { v: "ASSISTED", l: "بمساعدة" }];
const STANDING_BAL_OPTS: Opt[] = [{ v: "STABLE", l: "مستقر" }, { v: "UNSTABLE", l: "غير مستقر" }];
const GAIT_DEVICE_OPTS: Opt[] = [{ v: "NONE", l: "لا يوجد" }, { v: "CANE", l: "عصا" }, { v: "CRUTCHES", l: "عكاز" }, { v: "WALKER", l: "مشاية" }];
const SYMMETRY_OPTS: Opt[] = [{ v: "GOOD", l: "جيد" }, { v: "FAIR", l: "متوسط" }, { v: "POOR", l: "ضعيف" }];

const GAIT_PHASES = [
  { key: "initialContact", label: "بداية ملامسة الأرض", extraField: "notes", deviations: [
    { v: "FLAT_FOOT", l: "ملامسة كاملة للقدم" }, { v: "TOE_CONTACT", l: "ملامسة الأصابع أولاً" },
    { v: "FOOT_SLAP", l: "سقوط القدم" }, { v: "UNSTABLE_KNEE", l: "عدم ثبات الركبة" },
    { v: "WIDE_BASE", l: "قاعدة مشي واسعة" }, { v: "TRUNK_LEAN", l: "ميل الجذع" },
    { v: "LATERAL_HEEL_WHIP", l: "ميلان الكعب للخارج" }, { v: "MEDIAL_HEEL_WHIP", l: "ميلان الكعب للداخل" },
  ]},
  { key: "loadingResponse", label: "استجابة التحميل", extraField: "cause", deviations: [
    { v: "EXCESSIVE_KNEE_FLEXION", l: "انثناء زائد للركبة" }, { v: "KNEE_HYPEREXTENSION", l: "فرط بسط الركبة" },
    { v: "SOCKET_ROTATION", l: "دوران السوكت" }, { v: "LATERAL_TRUNK_BEND", l: "ميل جانبي للجذع" },
    { v: "PAIN_AVOIDANCE", l: "تجنب الألم" }, { v: "VARUS_MOMENT", l: "انحراف للداخل" }, { v: "VALGUS_MOMENT", l: "انحراف للخارج" },
  ]},
  { key: "midStance", label: "منتصف الارتكاز", extraField: "cause", deviations: [
    { v: "ABNORMAL_GAIT_PATTERN", l: "نمط مشي غير طبيعي" }, { v: "LATERAL_TRUNK_LEAN", l: "ميل جانبي للجذع" },
    { v: "SHORT_STANCE_TIME", l: "وقت ارتكاز قصير على الطرف الصناعي" }, { v: "UNEQUAL_STEP_LENGTH", l: "عدم تساوي طول الخطوة" },
    { v: "BODY_RISE_SOUND", l: "رفع الجسم على الطرف السليم" },
  ]},
  { key: "terminalStance", label: "نهاية الارتكاز / الدفع", extraField: "cause", deviations: [
    { v: "REDUCED_PUSH_OFF", l: "ضعف الدفع" }, { v: "EARLY_HEEL_RISE", l: "رفع الكعب مبكراً" },
    { v: "LATE_HEEL", l: "رفع الكعب متأخراً" }, { v: "KNEE_INSTABILITY", l: "عدم ثبات الركبة" },
  ]},
  { key: "preSwing", label: "قبل التأرجح", extraField: "cause", deviations: [
    { v: "HIP_HIKING", l: "رفع الحوض" }, { v: "CIRCUMDUCTION", l: "دوران جانبي للطرف" },
    { v: "EXCESSIVE_PELVIC_ROTATION", l: "دوران زائد للحوض" }, { v: "DELAYED_TOE_OFF", l: "تأخر رفع الأصابع" },
  ]},
  { key: "swingPhase", label: "مرحلة التأرجح", extraField: "notes", deviations: [
    { v: "TOE_DRAG", l: "جر الأصابع" }, { v: "CIRCUMDUCTION", l: "دوران جانبي" }, { v: "HIP_HIKING", l: "رفع الحوض" },
    { v: "TERMINAL_IMPACT", l: "اصطدام نهاية التأرجح" }, { v: "LACK_KNEE_FLEXION", l: "نقص انثناء الركبة" }, { v: "EXCESS_KNEE_FLEXION", l: "انثناء زائد للركبة" },
  ]},
];

const PROSTHETIC_ISSUE_OPTS: Opt[] = [
  { v: "PISTONING", l: "حركة عمودية داخل السوكت" },
  { v: "LOOSE_SUSPENSION", l: "تعليق ضعيف" },
  { v: "TOO_MANY_SOCKS", l: "الحاجة إلى جوارب كثيرة" },
  { v: "LEG_TOO_LONG", l: "الطرف طويل" },
  { v: "LEG_TOO_SHORT", l: "الطرف قصير" },
  { v: "FOOT_TOO_STIFF", l: "القدم قاسية" },
  { v: "FOOT_TOO_SOFT", l: "القدم طرية" },
  { v: "INCORRECT_KNEE_SETTINGS", l: "إعدادات الركبة غير مناسبة" },
];
const LIKELY_CAUSE_OPTS: Opt[] = [
  { v: "ALIGNMENT", l: "ضبط" }, { v: "SOCKET", l: "سوكت" }, { v: "SUSPENSION", l: "تعليق" },
  { v: "COMPONENT_SELECTION", l: "اختيار المكونات" }, { v: "MUSCLE_WEAKNESS", l: "ضعف عضلي" },
  { v: "PAIN", l: "ألم" }, { v: "LEARNED_GAIT_PATTERN", l: "نمط مكتسب" }, { v: "BALANCE", l: "توازن" },
];
const RECOMMENDATION_OPTS: Opt[] = [
  { v: "ALIGNMENT_ADJUSTMENT", l: "تعديل الضبط" },
  { v: "SOCKET_MODIFICATION", l: "تعديل / تبديل السوكت" },
  { v: "IMPROVE_SUSPENSION", l: "تحسين التعليق" },
  { v: "CHANGE_FOOT", l: "تغيير القدم" },
  { v: "ADJUST_KNEE_SETTINGS", l: "تعديل إعدادات الركبة" },
  { v: "ADD_SHOCK_ABSORBER", l: "إضافة ممتص صدمات / تخميد" },
];
const REHAB_PLAN_OPTS: Opt[] = [
  { v: "STRENGTHENING", l: "تقوية (مبعدات الورك / الجذع)" },
  { v: "BALANCE_TRAINING", l: "تدريب توازن" },
  { v: "GAIT_STEP_SYMMETRY", l: "تدريب مشي (تماثل الخطوات)" },
  { v: "STAIRS_SLOPES", l: "تدريب درج ومنحدرات" },
  { v: "COMMUNITY_AMBULATION", l: "تدريب خارج المنزل" },
];

// ── Data type ──────────────────────────────────────────────────────────────────
export interface GaitPdfPhase { deviations: string[]; possibleCause: string; notes: string }
export interface ProstheticsGaitPdfForm {
  sessionDate: string;
  suspensionSystem: string[];
  socketBearing: string; kneeJointType: string; footType: string;
  patientComplaints: string[]; painIntensity: string | number;
  alignmentCheck: string; hasRomLimitations: boolean | null;
  hasHipFlexionContracture: boolean | null; hasKneeFlexionContracture: boolean | null;
  weakHipAbductors: boolean | null; weakHipExtensors: boolean | null;
  weakTrunkMuscles: boolean | null; otherWeakness: string;
  trunkStability: string; abdominalControl: string; pelvicControl: string;
  sittingBalance: string; standingBalance: string;
  assistiveDevice: string; speedMs: string | number; cadence: string | number;
  stepLengthProsCm: string | number; stepLengthSoundCm: string | number;
  stancePercProsthetic: string | number; stancePercSound: string | number; symmetry: string;
  phases: Record<string, GaitPdfPhase>;
  gaitNotes: string;
  prostheticIssues: string[];
  mainProblem: string; likelyCauses: string[]; recommendations: string[];
  rehabPlanItems: string[]; rehabNotes: string;
  prosthetistSignatureUrl: string;
  notes: string;
  recommendationsNotes: string; mainProblemNotes: string;
  patientComplaintsOtherNotes: string; suspensionSystemOtherNotes: string;
  prostheticIssuesOtherNotes: string; likelyCausesOtherNotes: string;
}

export interface ProstheticsGaitPdfData {
  patient?: {
    firstName?: string; lastName?: string; patientNumber?: string; dateOfBirth?: string;
  };
  caseId?: string;
  sessionNumber?: number;
  prosthetistName?: string;
  form: ProstheticsGaitPdfForm;
}

const num = (v: string | number | null | undefined) =>
  v !== "" && v != null ? String(v) : "—";

// ── PDF Document ─────────────────────────────────────────────────────────────────
const ProstheticsGaitPdfDoc = ({ data, age }: { data: ProstheticsGaitPdfData; age: string }) => {
  const { patient, form } = data;
  const fullName = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() || "—";
  const anyWeakness =
    form.weakHipAbductors || form.weakHipExtensors || form.weakTrunkMuscles || !!form.otherWeakness.trim();

  return (
    <Document title={`تحليل المشي — ${fullName}`} author="Vita HR System" language="ar">
      <Page size="A4" style={S.page}>
        <PageHeader />
        <PageFooter />

        {/* ── معلومات المريض ── */}
        <SecHead label="تحليل المشي — الأطراف الصناعية (Pro-016)" />
        <InfoGrid
          items={[
            { label: "الاسم", value: fullName },
            { label: "رقم تعريف المريض", value: patient?.patientNumber || "—" },
            { label: "العمر", value: age },
            { label: "رقم الجلسة", value: data.sessionNumber != null ? String(data.sessionNumber) : "—" },
            { label: "تاريخ الجلسة", value: form.sessionDate ? new Date(form.sessionDate).toLocaleDateString("en-GB") : "—" },
            { label: "أخصائي الأطراف الصناعية", value: data.prosthetistName || "—" },
          ]}
        />

        {/* ── 1. تفاصيل الطرف الصناعي ── */}
        <SecHead label="تفاصيل الطرف الصناعي" />
        <SubHead label="مكونات الطرف الصناعي" />
        <OptGrid label="نظام التعليق" options={SUSPENSION_OPTS} selected={form.suspensionSystem} cols={3} />
        {form.suspensionSystemOtherNotes && <F label="تفاصيل نظام التعليق الآخر" value={form.suspensionSystemOtherNotes} />}
        <OptGrid label="التحميل على السوكيت" options={SOCKET_BEARING_OPTS} selected={form.socketBearing} cols={1} />
        <OptGrid label="نوع مفصل الركبة" options={KNEE_JOINT_OPTS} selected={form.kneeJointType} cols={3} />
        <OptGrid label="نوع مفصل القدم" options={FOOT_TYPE_OPTS} selected={form.footType} cols={3} />

        <SubHead label="شكاوى المريض والألم" />
        <OptGrid label="شكاوى المريض" options={COMPLAINT_OPTS} selected={form.patientComplaints} cols={2} />
        {form.patientComplaintsOtherNotes && <F label="تفاصيل شكوى أخرى" value={form.patientComplaintsOtherNotes} />}
        <F label="شدة الألم (0-10)" value={num(form.painIntensity)} />
        <OptGrid label="فحص الضبط" options={ALIGNMENT_OPTS} selected={form.alignmentCheck} cols={2} />
        <Bool label="وجود محدوديات في المدى الحركي" value={form.hasRomLimitations} />

        <SubHead label="فحص الجذمور" />
        <Text style={{ fontSize: 8.5, color: TEXT, marginBottom: 2, textAlign: "right" }}>{ar("تيبس / قصر")}</Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap" }}>
          <View style={{ width: "50%" }}><Chk checked={!!form.hasHipFlexionContracture} label="قصر عطف الورك" /></View>
          <View style={{ width: "50%" }}><Chk checked={!!form.hasKneeFlexionContracture} label="قصر عطف الركبة" /></View>
        </View>
        <Text style={{ fontSize: 8.5, color: TEXT, marginBottom: 2, marginTop: 4, textAlign: "right" }}>{ar("ضعف عضلي")}</Text>
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap" }}>
          <View style={{ width: "33%" }}><Chk checked={!!form.weakHipAbductors} label="تبعيد" /></View>
          <View style={{ width: "33%" }}><Chk checked={!!form.weakHipExtensors} label="بسط" /></View>
          <View style={{ width: "33%" }}><Chk checked={!!form.weakTrunkMuscles} label="عضلات الجذع" /></View>
        </View>
        {!anyWeakness && <Text style={S.note}>{ar("لا يوجد ضعف عضلي مسجّل")}</Text>}
        {form.otherWeakness.trim() && <F label="ملاحظات / أخرى" value={form.otherWeakness} />}

        <SubHead label="التقييم الأساسي" />
        <OptGrid label="ثبات الجذع" options={GFP_OPTS} selected={form.trunkStability} cols={3} />
        <OptGrid label="التحكم البطني" options={GFP_OPTS} selected={form.abdominalControl} cols={3} />
        <OptGrid label="التحكم الحوضي" options={GFP_OPTS} selected={form.pelvicControl} cols={3} />

        <SubHead label="التوازن" />
        <OptGrid label="التوازن أثناء الجلوس" options={SITTING_BAL_OPTS} selected={form.sittingBalance} cols={2} />
        <OptGrid label="التوازن أثناء الوقوف" options={STANDING_BAL_OPTS} selected={form.standingBalance} cols={2} />

        <SubHead label="تقييم المشي" />
        <OptGrid label="التماثل" options={SYMMETRY_OPTS} selected={form.symmetry} cols={3} />
        <OptGrid label="الوسيلة المساعدة" options={GAIT_DEVICE_OPTS} selected={form.assistiveDevice} cols={2} />
        <Text style={{ fontSize: 8.5, color: TEXT, marginBottom: 3, marginTop: 4, textAlign: "right" }}>{ar("قياسات المشي")}</Text>
        <F label="السرعة (m/s)" value={num(form.speedMs)} />
        <F label="عدد الخطوات / دقيقة" value={num(form.cadence)} />
        <F label="طول الخطوة — صناعي (cm)" value={num(form.stepLengthProsCm)} />
        <F label="طول الخطوة — سليم (cm)" value={num(form.stepLengthSoundCm)} />
        <F label="نسبة الارتكاز — صناعي (%)" value={num(form.stancePercProsthetic)} />
        <F label="نسبة الارتكاز — سليم (%)" value={num(form.stancePercSound)} />

        {/* ── 2. أخطاء المشي ── */}
        <SecHead label="أخطاء المشي" break />
        {GAIT_PHASES.map((phase) => {
          const ph = form.phases?.[phase.key] ?? { deviations: [], possibleCause: "", notes: "" };
          return (
            <View key={phase.key} wrap={false} style={{ marginBottom: 4 }}>
              <SubHead label={phase.label} />
              <OptGrid options={phase.deviations} selected={ph.deviations ?? []} cols={2} />
              {phase.extraField === "cause" && ph.possibleCause && <F label="السبب المحتمل" value={ph.possibleCause} />}
              {phase.extraField === "notes" && ph.notes && <F label="ملاحظات" value={ph.notes} />}
            </View>
          );
        })}
        {form.gaitNotes && <F label="ملاحظات المشي" value={form.gaitNotes} />}

        {/* ── 3. التشخيص ── */}
        <SecHead label="التشخيص" break />
        <SubHead label="مشاكل خاصة بالطرف" />
        <OptGrid options={PROSTHETIC_ISSUE_OPTS} selected={form.prostheticIssues} cols={2} />
        {form.prostheticIssuesOtherNotes && <F label="تفاصيل مشكلة أخرى" value={form.prostheticIssuesOtherNotes} />}

        <SubHead label="الاستنتاج السريري" />
        <F label="المشكلة الأساسية" value={form.mainProblem} />
        {form.mainProblemNotes && <F label="ملاحظات التشخيص" value={form.mainProblemNotes} />}
        <OptGrid label="السبب المرجح" options={LIKELY_CAUSE_OPTS} selected={form.likelyCauses} cols={2} />
        {form.likelyCausesOtherNotes && <F label="تفاصيل سبب آخر" value={form.likelyCausesOtherNotes} />}

        <SubHead label="التوصيات" />
        <OptGrid options={RECOMMENDATION_OPTS} selected={form.recommendations} cols={2} />
        {form.recommendationsNotes && <F label="ملاحظات التوصيات" value={form.recommendationsNotes} />}

        {/* ── 4. خطة العلاج ── */}
        <SecHead label="خطة العلاج" break />
        <OptGrid label="عناصر خطة العلاج" options={REHAB_PLAN_OPTS} selected={form.rehabPlanItems} cols={1} />
        <F label="ملاحظات" value={form.rehabNotes} />

        {/* ── 5. التوقيعات ── */}
        <SecHead label="التوقيعات" break />
        <F label="اسم فني الأطراف الصناعية" value={data.prosthetistName} />
        {form.prosthetistSignatureUrl ? (
          <View style={{ marginTop: 4, marginBottom: 6 }} wrap={false}>
            <Text style={{ fontSize: 8.5, color: TEXT, marginBottom: 3, textAlign: "right" }}>{ar("التوقيع")}</Text>
            {/* react-pdf Image, not an HTML img — the a11y alt rule does not apply */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={form.prosthetistSignatureUrl} style={{ width: 120, height: 48, objectFit: "contain" }} />
          </View>
        ) : null}
        {form.notes && (
          <>
            <SubHead label="ملاحظات عامة" />
            <Text style={S.fieldValue}>{ar(form.notes)}</Text>
          </>
        )}

        <View style={{ marginTop: 30, flexDirection: "row-reverse", justifyContent: "space-around" }}>
          {["توقيع فني الأطراف الصناعية", "توقيع المريض", "توقيع رئيس القسم"].map((label, i) => (
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
export async function downloadProstheticsGaitPdf(data: ProstheticsGaitPdfData): Promise<void> {
  ensureAmiriFonts();

  // react-pdf fetches image bytes itself (CORS applies), and a failed fetch aborts
  // the whole render. Pre-resolve the signature to a data URI best-effort; drop it
  // if it can't be loaded so the rest of the PDF still exports.
  const safeData: ProstheticsGaitPdfData = {
    ...data,
    form: { ...data.form, prosthetistSignatureUrl: await toDataUri(data.form.prosthetistSignatureUrl) },
  };

  const dob = data.patient?.dateOfBirth;
  const age = dob
    ? `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} سنة`
    : "—";

  const blob = await pdf(<ProstheticsGaitPdfDoc data={safeData} age={age} />).toBlob();
  saveBlob(blob, `gait-analysis-${patientTag(data)}.pdf`);
}

function patientTag(data: ProstheticsGaitPdfData): string {
  const pn = data.patient?.patientNumber?.trim();
  const sn = data.sessionNumber != null ? `s${data.sessionNumber}` : "";
  return [pn, sn].filter(Boolean).join("-") || (data.caseId ? data.caseId.slice(-8) : "export");
}
