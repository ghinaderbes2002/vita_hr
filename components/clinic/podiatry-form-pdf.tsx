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
  AffectedSide, ClinicalPlanItem, FootSymptom, MedicalHistoryItem,
  PodiatrySession, VisitType,
} from "@/lib/api/clinic-podiatry";

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

const CLINICAL_PLAN: [ClinicalPlanItem, ArLabel, string][] = [
  ["CUSTOM_FOOTBALANCE_INSOLE", "ضبان مخصص", "Custom FootBalance Insole"],
  ["THERAPEUTIC_EXERCISES", "تمارين علاجية", "Therapeutic Exercises"],
  ["FOOTWEAR_MODIFICATION", "تعديل الحذاء", "Footwear Modification"],
  ["MEDICAL_REFERRAL", "تحويل طبي", "Medical Referral"],
  ["PHYSICAL_THERAPY", "علاج فيزيائي", "Physical Therapy"],
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
  medicalHistory?: MedicalHistoryItem[] | null;
  medicalHistoryOther?: string | null;
  vasScore?: number | null;
  /** The session this sheet is for; its analysis fills the left column. */
  session?: PodiatrySession | null;
}

const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-GB") : "");

const PodiatryFormPdfDoc = ({ data }: { data: PodiatryFormPdfData }) => {
  const se = data.session;
  // The printed analysis block has one tick per finding; our model records each
  // side separately, so a finding is ticked when either foot shows it and the
  // side is spelled out next to it.
  const analysis: [string, string, boolean, boolean][] = [
    ["قدم مسطحة", "Flat Foot", !!se?.rightFlatFoot, !!se?.leftFlatFoot],
    ["قوس مرتفع", "High Arch", !!se?.rightHighArch, !!se?.leftHighArch],
    ["الكب", "Pronation", !!se?.rightPronation, !!se?.leftPronation],
    ["الاستلقاء", "Supination", !!se?.rightSupination, !!se?.leftSupination],
  ];
  const sides = (r: boolean, l: boolean) =>
    r && l ? "R + L" : r ? "R" : l ? "L" : "";

  const pressure = [
    se?.rightPressureNotes ? `R: ${se.rightPressureNotes}` : "",
    se?.leftPressureNotes ? `L: ${se.leftPressureNotes}` : "",
  ].filter(Boolean).join("  |  ");
  const asymmetry = [
    se?.rightAsymmetry ? `R: ${se.rightAsymmetry}` : "",
    se?.leftAsymmetry ? `L: ${se.leftAsymmetry}` : "",
  ].filter(Boolean).join("  |  ");

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
            {FOOT_SYMPTOMS.map(([v, a, e]) => (
              <Chk key={v} on={(data.footSymptoms ?? []).includes(v)} a={a} e={e} />
            ))}

            <SecHead a="الخطة العلاجية" e="Clinical Plan" />
            {CLINICAL_PLAN.map(([v, a, e]) => (
              <Chk key={v} on={(se?.clinicalPlan ?? []).includes(v)} a={a} e={e} />
            ))}
          </View>

          {/* ── Left column ──────────────────────────────────────────────── */}
          <View style={s.col}>
            <SecHead a="نوع الزيارة" e="Visit Type" />
            {VISIT_TYPES.map(([v, a, e]) => (
              <Chk key={v} on={(data.visitTypes ?? []).includes(v)} a={a} e={e} />
            ))}

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
                <View key={n} style={data.vasScore === n ? [s.vasBox, s.boxOn] : s.vasBox}>
                  <Text style={data.vasScore === n ? [s.vasNum, s.vasNumOn] : s.vasNum}>{n}</Text>
                </View>
              ))}
            </View>

            <SecHead a={["تحليل", "FootBalance"]} e="FootBalance Analysis" />
            {analysis.map(([a, e, r, l]) => (
              <View key={e} style={s.chkRow} wrap={false}>
                <View style={r || l ? [s.box, s.boxOn] : s.box}>
                  {(r || l) && <Text style={{ fontSize: 5.5, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
                </View>
                <Text style={s.chkAr}>{ar(a)}</Text>
                <Text style={s.chkEn}>{"/"}</Text>
                <Text style={s.chkEn}>{e}</Text>
                {(r || l) && <Text style={[s.chkEn, { color: TEAL }]}>{`(${sides(r, l)})`}</Text>}
              </View>
            ))}
            <Field a="ملاحظات الضغط" e="Pressure Notes" value={pressure} />
            <Field a="عدم التماثل" e="Asymmetry" value={asymmetry} />

            <SecHead a="التوقيع" e="Signature" />
            <Field a="اسم الأخصائي" e="Clinician Name" value={se?.clinicianName} />
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
      </Page>
    </Document>
  );
};

// ── Public export ────────────────────────────────────────────────────────────
export async function downloadPodiatryFormPdf(data: PodiatryFormPdfData): Promise<void> {
  ensureAmiriFonts();
  const blob = await pdf(<PodiatryFormPdfDoc data={data} />).toBlob();
  const tag = (data.patientName ?? "").trim().replace(/\s+/g, "-") || "patient";
  saveBlob(blob, `footbalance-${tag}.pdf`);
}
