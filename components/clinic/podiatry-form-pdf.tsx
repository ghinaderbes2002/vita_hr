// Client-only — imported via dynamic import() to avoid SSR issues.
// Faithful copy of the printed VitaFoot sheet "نموذج تقييم القدم الاحترافي /
// FootBalance Analysis System": bilingual labels, two columns of tick-boxes,
// the 1-10 VAS strip and the signature block at the bottom.
// One sheet per session — the reception data is the same on every copy, the
// FootBalance analysis / clinical plan / signature come from that session.
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { ar, ensureAmiriFonts, saveBlob } from "./pdf-kit";
import {
  AffectedSide, FootSymptom, MedicalHistoryItem, PodiatrySession, VisitType,
} from "@/lib/api/clinic-podiatry";
import {
  ARCH_ARCHITECTURE_OPTS, DEFORMITY_TYPE_OPTS, EDEMA_TYPE_OPTS, FOOTWEAR_OPTS,
  FOOT_MEASUREMENT_ROWS, JACK_TEST_OPTS, MAIN_CAUSE_OPTS, OUTSOLE_WEAR_OPTS,
  PAIN_CHARACTERISTIC_OPTS, PAIN_LOCATION_OPTS, PALPATION_POINTS,
  REARFOOT_ALIGNMENT_OPTS, ROM_OPTS, TOO_MANY_TOES_OPTS, WALKING_LINE_OPTS,
  labelsOf,
} from "./podiatry-session-schema";

// ── VitaFoot theme (teal), distinct from the VitaSyr reports ──────────────────
const TEAL = "#2E9CAB";
const INK = "#1f2937";
const LINE = "#9ca3af";

const s = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 8.5,
    color: INK,
    paddingTop: 22,
    paddingBottom: 58,
    paddingHorizontal: 26,
    direction: "rtl",
    backgroundColor: "#ffffff",
  },
  logoWrap: { alignItems: "center", marginBottom: 2 },
  logoText: { fontSize: 26, fontWeight: "bold", color: TEAL, letterSpacing: 0.5 },
  logoTag: { fontSize: 6, color: TEAL, letterSpacing: 1 },
  titleAr: { fontSize: 13, fontWeight: "bold", color: INK, textAlign: "center", marginTop: 8 },
  titleEn: { fontSize: 11, color: INK, textAlign: "center", marginBottom: 8 },
  dateRow: { flexDirection: "row-reverse", marginBottom: 6 },
  dateText: { fontSize: 8.5, color: INK },

  columns: { flexDirection: "row-reverse", gap: 18 },
  col: { flex: 1 },

  secHead: { flexDirection: "row-reverse", alignItems: "center", gap: 3, marginTop: 8, marginBottom: 4 },
  secHeadAr: { fontSize: 9, fontWeight: "bold", color: TEAL },
  secHeadEn: { fontSize: 8, color: TEAL },

  fieldRow: { flexDirection: "row-reverse", alignItems: "flex-end", marginBottom: 3.5, gap: 3 },
  fieldLabelAr: { fontSize: 8, color: INK },
  fieldLabelEn: { fontSize: 7.5, color: INK },
  fieldValue: { fontSize: 8, color: INK, flex: 1, borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 1 },

  chkRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 3.5 },
  box: {
    width: 8, height: 8, borderWidth: 0.8, borderColor: INK,
    justifyContent: "center", alignItems: "center",
  },
  boxOn: { backgroundColor: TEAL, borderColor: TEAL },
  chkAr: { fontSize: 8, color: INK },
  chkEn: { fontSize: 7.5, color: INK },

  vasRow: { flexDirection: "row-reverse", alignItems: "center", gap: 3, marginBottom: 3.5, flexWrap: "wrap" },
  vasBox: {
    width: 11, height: 10, borderWidth: 0.8, borderColor: INK,
    justifyContent: "center", alignItems: "center",
  },
  vasNum: { fontSize: 7, color: INK },
  vasNumOn: { color: "#ffffff" },

  signatureImage: { height: 26, width: 80, objectFit: "contain" },
  imagingImage: { marginTop: 3, maxHeight: 150, width: "60%", objectFit: "contain", alignSelf: "flex-end" },

  footer: {
    position: "absolute", bottom: 10, left: 26, right: 26,
    borderTopWidth: 1, borderTopColor: TEAL, paddingTop: 5,
    flexDirection: "row-reverse", justifyContent: "space-between",
  },
  footText: { fontSize: 6.5, color: TEAL },
});

// ── Bilingual building blocks ────────────────────────────────────────────────
// react-pdf applies no bidi algorithm, so Arabic and Latin must never share a
// Text node — "تحليل FootBalance" in one string comes out as "FootBalance تحليل".
// Arabic labels are therefore passed as tokens and laid out right-to-left by
// flexbox, with the "/" separator as its own node so it spaces evenly.
type ArLabel = string | string[];

const isArabic = (t: string) => /[؀-ۿ]/.test(t);

const ArText = ({ t, style }: { t: ArLabel; style: Style }) => {
  const parts = Array.isArray(t) ? t : [t];
  if (parts.length === 1) return <Text style={style}>{isArabic(parts[0]) ? ar(parts[0]) : parts[0]}</Text>;
  return (
    <View style={{ flexDirection: "row-reverse", gap: 2.5 }}>
      {parts.map((p, i) => (
        <Text key={i} style={style}>{isArabic(p) ? ar(p) : p}</Text>
      ))}
    </View>
  );
};

const SecHead = ({ a, e }: { a: ArLabel; e: string }) => (
  <View style={s.secHead}>
    <ArText t={a} style={s.secHeadAr} />
    <Text style={s.secHeadEn}>{"/"}</Text>
    <Text style={s.secHeadEn}>{e}</Text>
  </View>
);

// Children of a row-reverse row are placed right-to-left in source order, so
// the colon must be its own node AFTER the English label — appended to that
// string it would render at the label's right edge, jammed against the "/".
const Field = ({ a, e, value }: { a: ArLabel; e: string; value?: string | number | null }) => {
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={s.fieldRow} wrap={false}>
      <ArText t={a} style={s.fieldLabelAr} />
      <Text style={s.fieldLabelEn}>{"/"}</Text>
      <Text style={s.fieldLabelEn}>{e}</Text>
      <Text style={[s.fieldLabelEn, { marginRight: -2 }]}>{":"}</Text>
      <Text style={s.fieldValue}>{isArabic(v) ? ar(v) : v}</Text>
    </View>
  );
};

const Chk = ({ on, a, e }: { on: boolean; a: ArLabel; e: string }) => (
  <View style={s.chkRow} wrap={false}>
    <View style={on ? [s.box, s.boxOn] : s.box}>
      {on && <Text style={{ fontSize: 5.5, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
    </View>
    <ArText t={a} style={s.chkAr} />
    <Text style={s.chkEn}>{"/"}</Text>
    <Text style={s.chkEn}>{e}</Text>
  </View>
);

/** Right foot first, matching the sheet. */
const SIDES = [
  ["Right", "القدم اليمنى", "Right Foot"],
  ["Left", "القدم اليسرى", "Left Foot"],
] as const;

// Sub-heading for a per-foot block inside a section.
const SideHead = ({ a, e }: { a: string; e: string }) => (
  <View style={{ flexDirection: "row-reverse", gap: 3, marginTop: 2, marginBottom: 2 }}>
    <Text style={[s.chkAr, { fontWeight: "bold" }]}>{ar(a)}</Text>
    <Text style={s.chkEn}>{e}</Text>
  </View>
);

// The sheet ticks the affected side inline on one row (R / L / Bilateral).
const SideRow = ({ sides }: { sides: AffectedSide[] }) => (
  <View style={s.fieldRow} wrap={false}>
    <Text style={s.fieldLabelAr}>{ar("القدم المصابة")}</Text>
    <Text style={s.fieldLabelEn}>{"/"}</Text>
    <Text style={s.fieldLabelEn}>{"Affected Side"}</Text>
    <Text style={[s.fieldLabelEn, { marginRight: -2 }]}>{":"}</Text>
    <View style={{ flexDirection: "row-reverse", gap: 8, flex: 1 }}>
      {([["R", "R"], ["L", "L"], ["BILATERAL", "Bilateral"]] as const).map(([v, l]) => (
        <View key={v} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3 }}>
          <View style={sides.includes(v) ? [s.box, s.boxOn] : s.box}>
            {sides.includes(v) && <Text style={{ fontSize: 5.5, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
          </View>
          <Text style={s.chkEn}>{l}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ── Option tables, in the printed sheet's order ──────────────────────────────
const VISIT_TYPES: [VisitType, ArLabel, string][] = [
  ["FOOT_PAIN", "ألم قدم", "Foot Pain"],
  ["FOOTBALANCE_ASSESSMENT", ["تحليل", "FootBalance"], "FootBalance Assessment"],
  ["CUSTOM_INSOLES", "ضبان مخصص", "Custom Insoles"],
  ["PERFORMANCE_OPTIMIZATION", "تحسين الأداء", "Performance Optimization"],
  ["FOLLOW_UP", "متابعة", "Follow-up"],
];

const MEDICAL_HISTORY: [MedicalHistoryItem, ArLabel, string][] = [
  ["DIABETES", "سكري", "Diabetes"],
  ["HYPERTENSION", "ارتفاع ضغط", "Hypertension"],
  ["NEUROLOGICAL", "أمراض أعصاب", "Neurological"],
  ["VASCULAR", "أمراض أوعية", "Vascular"],
  ["ARTHRITIS", "التهاب مفاصل", "Arthritis"],
  ["OTHER", "أخرى", "Other"],
];

const FOOT_SYMPTOMS: [FootSymptom, ArLabel, string][] = [
  ["PAIN", "ألم", "Pain"],
  ["NUMBNESS", "تنميل", "Numbness"],
  ["SWELLING", "تورم", "Swelling"],
  ["INSTABILITY", "عدم ثباته", "Instability"],
  ["FATIGUE", "تعب سريع", "Fatigue"],
];

export interface PodiatryFormPdfData {
  /** Sheet date — defaults to the session's date, else today. */
  date?: string;
  patientName?: string;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  phone?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  occupation?: string | null;
  activities?: string | null;
  problemDescription?: string | null;
  historyOfSymptoms?: string | null;
  affectedSide?: AffectedSide[] | null;
  footSymptoms?: FootSymptom[] | null;
  visitTypes?: VisitType[] | null;
  /** Filled instead of the shared pair when both feet are affected. */
  footSymptomsRight?: FootSymptom[] | null;
  footSymptomsLeft?: FootSymptom[] | null;
  visitTypesRight?: VisitType[] | null;
  visitTypesLeft?: VisitType[] | null;
  medicalHistory?: MedicalHistoryItem[] | null;
  medicalHistoryOther?: string | null;
  vasScore?: number | null;
  /** The session this sheet is for; its analysis fills the left column. */
  session?: PodiatrySession | null;
  /** Both live on the reception, each on its own endpoint. */
  reviews?: string[];
  doctorDecision?: string | null;
}

const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-GB") : "");

const PodiatryFormPdfDoc = ({ data }: { data: PodiatryFormPdfData }) => {
  const se = data.session;
  const sub = se?.subjectiveHistory ?? {};
  const vis = se?.visualInspection ?? {};
  const pal = se?.palpation ?? {};
  const rom = se?.rangeOfMotion ?? {};
  const dyn = se?.dynamicAnalysis ?? {};
  const shoe = se?.shoeWearPattern ?? {};
  const meas = (se?.footMeasurements ?? {}) as Record<string, string | undefined>;

  // The VAS lives on the assessment now; older receptions still carry their own.
  const vasScore = Number(sub.vasScore) || data.vasScore || 0;

  // Every per-foot finding prints on one line, right foot first like the sheet.
  const pair = (r?: string, l?: string) =>
    [r ? `يمين: ${r}` : "", l ? `يسار: ${l}` : ""].filter(Boolean).join("   —   ");

  const measRows = FOOT_MEASUREMENT_ROWS
    .map(([k, a, e]) => [a, e, pair(meas[`${k}Right`], meas[`${k}Left`])] as const)
    .filter(([, , v]) => v);

  // Both feet affected → the symptoms and the visit types print per foot.
  const bilateral = (data.affectedSide ?? []).includes("BILATERAL");

  const sig = se?.clinicianSignature ?? "";
  const sigIsImage = sig.startsWith("data:") || sig.startsWith("http");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Masthead — text stand-in for the VitaFoot logo until the artwork is supplied. */}
        <View style={s.logoWrap}>
          <Text style={s.logoText}>VitaFoot</Text>
          {/* <Text style={s.logoTag}>Foot Health Diagnostic Solutions</Text> */}
        </View>
        <Text style={s.titleAr}>{ar("نموذج تقييم القدم الاحترافي")}</Text>
        <Text style={s.titleEn}>FootBalance Analysis System</Text>

        <View style={[s.dateRow, { gap: 3 }]}>
          <Text style={s.dateText}>{ar("التاريخ")}</Text>
          <Text style={s.dateText}>{"/"}</Text>
          <Text style={s.dateText}>{"Date"}</Text>
          <Text style={[s.dateText, { marginRight: -2 }]}>{":"}</Text>
          <Text style={s.dateText}>{d(data.date) || new Date().toLocaleDateString("en-GB")}</Text>
        </View>

        <View style={s.columns}>
          {/* ── Right column ─────────────────────────────────────────────── */}
          <View style={s.col}>
            <SecHead a="البيانات الشخصية" e="Personal Information" />
            <Field a="اسم المريض" e="Patient Name" value={data.patientName} />
            <Field a="تاريخ الميلاد" e="Date of Birth" value={d(data.dateOfBirth)} />
            <Field
              a="الجنس"
              e="Gender"
              value={data.gender === "MALE" ? "ذكر" : data.gender === "FEMALE" ? "أنثى" : ""}
            />
            <Field a="رقم الهاتف" e="Phone" value={data.phone} />
            <Field a="الطول" e="Height" value={data.heightCm ?? ""} />
            <Field a="الوزن" e="Weight" value={data.weightKg ?? ""} />
            <Field a="المهنة" e="Occupation" value={data.occupation} />
            <Field a="نشاطات" e="Activities" value={data.activities} />

            <SecHead a="الشكوى الرئيسية" e="Chief Complaint" />
            <Field a="وصف المشكلة" e="Problem Description" value={data.problemDescription} />
            <Field a="التاريخ العرضي" e="History of Symptoms" value={data.historyOfSymptoms} />
            <SideRow sides={data.affectedSide ?? []} />

            <SecHead a="أعراض القدم" e="Foot Symptoms" />
            {bilateral ? (
              SIDES.map(([side, sa, se_]) => (
                <View key={side} wrap={false}>
                  <SideHead a={sa} e={se_} />
                  {FOOT_SYMPTOMS.map(([v, a, e]) => (
                    <Chk
                      key={v}
                      on={((side === "Right" ? data.footSymptomsRight : data.footSymptomsLeft) ?? []).includes(v)}
                      a={a}
                      e={e}
                    />
                  ))}
                </View>
              ))
            ) : (
              FOOT_SYMPTOMS.map(([v, a, e]) => (
                <Chk key={v} on={(data.footSymptoms ?? []).includes(v)} a={a} e={e} />
              ))
            )}
          </View>

          {/* ── Left column ──────────────────────────────────────────────── */}
          <View style={s.col}>
            <SecHead a="نوع الزيارة" e="Visit Type" />
            {bilateral ? (
              SIDES.map(([side, sa, se_]) => (
                <View key={side} wrap={false}>
                  <SideHead a={sa} e={se_} />
                  {VISIT_TYPES.map(([v, a, e]) => (
                    <Chk
                      key={v}
                      on={((side === "Right" ? data.visitTypesRight : data.visitTypesLeft) ?? []).includes(v)}
                      a={a}
                      e={e}
                    />
                  ))}
                </View>
              ))
            ) : (
              VISIT_TYPES.map(([v, a, e]) => (
                <Chk key={v} on={(data.visitTypes ?? []).includes(v)} a={a} e={e} />
              ))
            )}

            <SecHead a="التاريخ المرضي" e="Medical History" />
            {MEDICAL_HISTORY.map(([v, a, e]) => (
              <Chk key={v} on={(data.medicalHistory ?? []).includes(v)} a={a} e={e} />
            ))}
            {data.medicalHistoryOther && (
              <Field a="التفاصيل" e="Details" value={data.medicalHistoryOther} />
            )}

            <SecHead a="شدة الألم" e="Pain Scale" />
            <View style={s.vasRow}>
              <Text style={s.chkAr}>{ar("درجة الألم")}</Text>
              <Text style={s.chkEn}>{"/"}</Text>
              <Text style={s.chkEn}>{"VAS Score"}</Text>
              <Text style={[s.chkEn, { marginRight: -2 }]}>{":"}</Text>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <View key={n} style={vasScore === n ? [s.vasBox, s.boxOn] : s.vasBox}>
                  <Text style={vasScore === n ? [s.vasNum, s.vasNumOn] : s.vasNum}>{n}</Text>
                </View>
              ))}
            </View>

            <SecHead a="التوقيع" e="Signature" />
            <Field a="اسم الأخصائي" e="Clinician Name" value={se?.clinicianName} />
            <Field a={["عبّأ", "النموذج"]} e="Filled By" value={se?.createdByName} />
            <Field a={["تاريخ", "التركيب"]} e="Installed On" value={d(se?.installedAt)} />
            <View style={s.fieldRow} wrap={false}>
              <Text style={s.fieldLabelAr}>{ar("التوقيع")}</Text>
              <Text style={s.fieldLabelEn}>{"/"}</Text>
              <Text style={s.fieldLabelEn}>{"Signature"}</Text>
              <Text style={[s.fieldLabelEn, { marginRight: -2 }]}>{":"}</Text>
              <View style={s.fieldValue}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an <img> */}
                {sigIsImage ? <Image src={sig} style={s.signatureImage} /> : <Text>{ar(sig)}</Text>}
              </View>
            </View>
          </View>
        </View>

        {/* The assessment, printed full width under the two columns. */}
        <SecHead a={["التاريخ المرضي", "وتوصيف الألم"]} e="Subjective History & Pain Profiling" />
        <Field a={["السبب الرئيسي", "والأصل المرضي"]} e="Main Cause" value={labelsOf(MAIN_CAUSE_OPTS, sub.mainCause)} />
        <Field a="موقع الألم" e="Pain Location" value={labelsOf(PAIN_LOCATION_OPTS, sub.painLocation)} />
        <Field a="طبيعة الألم" e="Pain Characteristics" value={labelsOf(PAIN_CHARACTERISTIC_OPTS, sub.painCharacteristics)} />

        <SecHead a={["الفحص البصري", "وتحديد التشوهات"]} e="Visual Inspection & Deformity Mapping" />
        <Field a={["استقامة", "الجزء الخلفي", "من القدم"]} e="Rearfoot Alignment" value={pair(
          labelsOf(REARFOOT_ALIGNMENT_OPTS, vis.rightRearfootAlignment),
          labelsOf(REARFOOT_ALIGNMENT_OPTS, vis.leftRearfootAlignment),
        )} />
        <Field a={["علامة", "كثرة الأصابع", "الظاهرة"]} e="Too Many Toes Sign" value={pair(
          [labelsOf(TOO_MANY_TOES_OPTS, vis.rightTooManyToes), vis.rightTooManyToesCount].filter(Boolean).join(" "),
          [labelsOf(TOO_MANY_TOES_OPTS, vis.leftTooManyToes), vis.leftTooManyToesCount].filter(Boolean).join(" "),
        )} />
        <Field a={["بنية", "قوس القدم"]} e="Arch Architecture" value={pair(
          labelsOf(ARCH_ARCHITECTURE_OPTS, vis.rightArchArchitecture),
          labelsOf(ARCH_ARCHITECTURE_OPTS, vis.leftArchArchitecture),
        )} />
        <Chk on={!!vis.halluxValgus} a={["إبهام القدم", "الأفحج"]} e="Hallux Valgus" />
        {vis.halluxValgus && vis.halluxValgusType?.length ? (
          <Field a="النوع" e="Type" value={labelsOf(DEFORMITY_TYPE_OPTS, vis.halluxValgusType)} />
        ) : null}
        <Chk on={!!vis.tailorsBunion} a="ورم الخياط" e="Tailor's Bunion" />
        {vis.tailorsBunion && vis.tailorsBunionType?.length ? (
          <Field a="النوع" e="Type" value={labelsOf(DEFORMITY_TYPE_OPTS, vis.tailorsBunionType)} />
        ) : null}
        <Chk on={!!vis.hammerToes} a="أصابع مطرقية" e="Hammer Toes" />
        {vis.hammerToes && vis.hammerToesAffected ? (
          <Field a="الأصابع المصابة" e="Affected" value={vis.hammerToesAffected} />
        ) : null}
        <Chk on={!!vis.clawToes} a="أصابع مخلبية" e="Claw Toes" />
        {vis.clawToes && vis.clawToesAffected ? (
          <Field a="الأصابع المصابة" e="Affected" value={vis.clawToesAffected} />
        ) : null}
        <Chk on={!!vis.malletToes} a="أصابع ماليت" e="Mallet Toes" />
        {vis.malletToes && vis.malletToesAffected ? (
          <Field a="الأصابع المصابة" e="Affected" value={vis.malletToesAffected} />
        ) : null}
        <Chk on={!!vis.hyperkeratosisCallus} a={["الفرط التقرن", "والمسامير الجلدية"]} e="Hyperkeratosis / Callus" />
        {vis.hyperkeratosisCallus && vis.hyperkeratosisLocation ? (
          <Field a="الموقع" e="Location" value={vis.hyperkeratosisLocation} />
        ) : null}
        <Chk on={!!vis.preTrophicLesions} a={["الآفات الجلدية", "قبل التقرحية"]} e="Pre-Ulcerative Lesions" />
        {vis.preTrophicLesions && vis.preTrophicLesionsNotes ? (
          <Field a="ملاحظات" e="Notes" value={vis.preTrophicLesionsNotes} />
        ) : null}
        <Chk on={!!vis.edema} a="الوذمة" e="Edema" />
        {vis.edema && vis.edemaType?.length ? (
          <Field a="النوع" e="Type" value={labelsOf(EDEMA_TYPE_OPTS, vis.edemaType)} />
        ) : null}

        <SecHead a={["نقاط الجس", "والمضض"]} e="Palpation & Tenderness Points" />
        <Text style={[s.chkAr, { marginBottom: 3 }]}>
          {ar("ضع علامة إذا كان الضغط على المنطقة يسبب ألماً أو حساسية:")}
        </Text>
        {PALPATION_POINTS.map(([k, a, e]) => (
          <Chk key={k} on={!!pal[k]} a={a} e={e} />
        ))}

        <SecHead a={["مدى الحركة", "والمرونة المقاسة"]} e="Range of Motion & Measured Flexibility" />
        <Field a={["العطف الظهري", "للكاحل"]} e="Ankle Dorsiflexion" value={labelsOf(ROM_OPTS, rom.ankleDorsiflexion)} />
        <Field a={["العطف الأخمصي", "للكاحل"]} e="Ankle Plantarflexion" value={labelsOf(ROM_OPTS, rom.anklePlantarflexion)} />

        <SecHead a={["التحليل الديناميكي", "المشي والحركة"]} e="Dynamic Analysis" />
        <Field a={["اختبار جاك", "رفع الإبهام"]} e="Jack Test" value={pair(
          labelsOf(JACK_TEST_OPTS, dyn.rightJackTest),
          labelsOf(JACK_TEST_OPTS, dyn.leftJackTest),
        )} />
        <Field a={["خط ومسار", "المشي"]} e="Walking Line" value={pair(
          labelsOf(WALKING_LINE_OPTS, dyn.rightWalkingLine),
          labelsOf(WALKING_LINE_OPTS, dyn.leftWalkingLine),
        )} />

        <SecHead a={["نمط تآكل الحذاء", "وفحص التقويم"]} e="Shoe Wear Pattern & Orthotic Audit" />
        <Field a={["الأحذية الحالية", "المستخدمة"]} e="Current Footwear" value={labelsOf(FOOTWEAR_OPTS, shoe.currentFootwear)} />
        <Field a={["خصائص تآكل", "النعل الخارجي"]} e="Outsole Wear" value={labelsOf(OUTSOLE_WEAR_OPTS, shoe.outsoleWear)} />

        {measRows.length > 0 && (
          <>
            <SecHead a={["قياسات القدم", "وأبعادها"]} e="Foot Measurements" />
            {measRows.map(([a, e, v]) => <Field key={e} a={a} e={e} value={v} />)}
          </>
        )}

        <SecHead a="الضبانة والقرار" e="Insole and Decision" />
        <Field a="نوع الضبانة" e="Insole Type" value={(se?.insoleType ?? []).join(" / ")} />
        <Field a="ملاحظات" e="Notes" value={se?.notes} />
        {(data.reviews ?? []).length > 0 ? (
          (data.reviews ?? []).map((r, i) => (
            <Field key={i} a={["مراجعة", String(i + 1)]} e={`Review ${i + 1}`} value={r} />
          ))
        ) : (
          <Field a="المراجعة" e="Review" value="" />
        )}
        <Field a="قرار الطبيب" e="Doctor Decision" value={data.doctorDecision} />

        <Footer />
      </Page>

    </Document>
  );
};

// Shared footer used on every sheet.
const Footer = () => (
  <View style={s.footer} fixed>
    <View style={{ alignItems: "flex-end", gap: 1.5 }}>
      <Text style={s.footText}>{ar("سوريا - حلب - حي حلب الجديدة شمالي")}</Text>
      <Text style={s.footText}>{ar("خلف فيلا العقاد - شارع إيكاردا")}</Text>
    </View>
    <View style={{ alignItems: "center", gap: 1.5 }}>
      <Text style={s.footText}>vitafoot@vitaxir.com</Text>
    </View>
    <View style={{ alignItems: "flex-start", gap: 1.5 }}>
      <Text style={s.footText}>MOB: +963 935 813 333</Text>
      <Text style={s.footText}>TEL: +963 21 522 6391  |  FAX: +963 21 522 6392</Text>
    </View>
  </View>
);

// ── Public export ────────────────────────────────────────────────────────────
export async function downloadPodiatryFormPdf(data: PodiatryFormPdfData): Promise<void> {
  ensureAmiriFonts();
  const blob = await pdf(<PodiatryFormPdfDoc data={data} />).toBlob();
  const tag = (data.patientName ?? "").trim().replace(/\s+/g, "-") || "patient";
  saveBlob(blob, `footbalance-${tag}.pdf`);
}
