// Client-only — imported via dynamic import() to avoid SSR issues.
// Renders the bilingual media-documentation consent form (Pro-002) as a faithful
// copy of the printed sheet: Arabic on the right, English on the left, the three
// tick-boxes in the middle and the name/signature/date lines at the bottom.
// The legal wording is fixed and identical on every copy, so it lives here rather
// than in the i18n messages (the sheet is always printed bilingually).
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { BRAND, TEXT, ar, PageFooter, ensureAmiriFonts, saveBlob } from "./pdf-kit";

export type ConsentChoice = "OFFICIAL_ONLY" | "SOCIAL_MEDIA" | "REFUSED" | null;

export interface ConsentFormPdfData {
  patientName?: string;
  /** Which of the three boxes is ticked; null leaves them all empty. */
  choice?: ConsentChoice;
  /** Defaults to today. */
  date?: Date;
  /** Drawn or uploaded patient signature, as a data URI. */
  signatureDataUri?: string;
}

const AR = {
  title: "نموذج الموافقة على التوثيق",
  undersigned: "أنا الموقع أدناه السيد/السيدة",
  intro:
    "أقرّ بموجب هذا باطلاعي الكامل على إمكانية التوثيق الإعلامي المتعلق بحالتي الصحية ومراحل تلقي الخدمة في المركز بما يشمل على سبيل المثال لا الحصر (قبل/بعد الفحص، مرحلة اختبار السوكيت، تركيب الطرف الصناعي، العلاج الطبيعي، وخدمات التأهيل)",
  authorization:
    "كما أفوض المركز في حال اختياري الموافقة باستخدام المواد المرئية والمسموعة (الصور، مقاطع الفيديو، والتسجيلات الصوتية) لأغراض التوثيق المهني وإعداد التقارير وتقديمها إلى الجهة الداعمة أو الممولة أو المنظمة ذات الصلة مع توجيه الشكر والتقدير للجهة الداعمة وذلك دون الحاجة للرجوع إليّ",
  choicePrompt: "ويكون ذلك وفق الخيار/الخيارات التي أحددها أدناه",
  choices: {
    OFFICIAL_ONLY:
      "أوافق على التوثيق لصالح الجهة الداعمة فقط لأغراض التقارير والتوثيق الرسمي",
    SOCIAL_MEDIA:
      "أوافق على التوثيق لصالح الجهة الداعمة مع السماح بالنشر على وسائل التواصل الاجتماعي الخاصة بالجهة الداعمة والجهة المنفذة",
    REFUSED: "لا أوافق على التوثيق",
  },
  declaration:
    "وأتعهد بصحة ودقة المعلومات المقدّمة وأُقرّ بأنني قد قرأت وفهمت مضمون هذا النموذج فهماً تاماً وقمت بتحديد خياري بحرية تامة ودون أي إكراه",
  fullName: "الاسم والكنية",
  signature: "التوقيع",
  date: "التاريخ",
};

const EN = {
  title: "Consent Form",
  undersigned: "I, the undersigned Mr./Ms.:",
  intro:
    "I hereby acknowledge that I have been fully informed of the possibility of media documentation related to my medical condition and the stages of receiving services at the center. This includes, but is not limited to: pre- and post-assessment, socket trial stage, prosthetic fitting, physical therapy, and rehabilitation services.",
  authorization:
    "In the event that I choose to give my consent, I authorise the center to use visual and audio materials (photographs, videos, and audio recordings) for professional documentation purposes, reporting, and submission to the supporting, funding, or relevant organisation, with due acknowledgement and appreciation to the supporting entity, without the need for further reference to me.",
  choicePrompt: "My choice is indicated below:",
  choices: {
    OFFICIAL_ONLY:
      "I consent to documentation for the benefit of the supporting entity only, for reporting and official documentation purposes.",
    SOCIAL_MEDIA:
      "I consent to documentation for the benefit of the supporting entity, including publication on the official social media platforms of the supporting and implementing entities.",
    REFUSED: "I do not consent to documentation.",
  },
  declaration:
    "I hereby declare that all information provided is accurate and that I have read and fully understood the content of this form. I have made my selection freely and voluntarily, without any coercion.",
  fullName: "Full Name:",
  signature: "Signature:",
  date: "Date:",
};

const CHOICE_ORDER = ["OFFICIAL_ONLY", "SOCIAL_MEDIA", "REFUSED"] as const;

const s = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 10,
    color: TEXT,
    paddingTop: 28,
    paddingBottom: 66,
    paddingHorizontal: 28,
    backgroundColor: "#ffffff",
  },
  brand: { fontSize: 26, fontWeight: "bold", color: BRAND, letterSpacing: 0.5, marginBottom: 12 },
  titleBar: {
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  titleWrap: { flex: 1, alignItems: "center" },
  titleText: { color: "#ffffff", fontSize: 11.5, fontWeight: "bold" },

  // Every block is one row holding its English and Arabic halves, so the two
  // languages stay level with each other however long either side wraps.
  row: { flexDirection: "row", gap: 18 },
  colEn: { flex: 1, textAlign: "left" },
  colAr: { flex: 1, textAlign: "right" },
  divider: { width: 0.8, backgroundColor: BRAND, alignSelf: "stretch" },

  paraEn: { fontSize: 10, lineHeight: 1.6, marginBottom: 10, textAlign: "left" },
  paraAr: { fontSize: 10, lineHeight: 1.75, marginBottom: 10, textAlign: "right" },
  boxRowEn: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 9 },
  boxRowAr: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 6, marginBottom: 9 },
  box: {
    width: 10,
    height: 10,
    borderWidth: 0.9,
    borderColor: TEXT,
    marginTop: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  boxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  signRowEn: { flexDirection: "row", alignItems: "flex-end", gap: 5, marginBottom: 14 },
  signRowAr: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 5, marginBottom: 14 },
  signLabel: { fontSize: 10 },
  signValue: { flex: 1, borderBottomWidth: 0.7, borderBottomColor: TEXT, paddingBottom: 2, fontSize: 10 },
  // The last 66pt of the page are reserved for the footer, so this block has to
  // stay compact enough to fit in what is left or react-pdf spills it to page 2.
  signBlock: { marginTop: 10 },
  signBlockRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 5, marginBottom: 9 },
  signatureImage: { height: 34, objectFit: "contain", alignSelf: "flex-end", marginBottom: 1 },
  bottomRule: { borderTopWidth: 1.5, borderTopColor: BRAND, marginTop: 8 },
});

// A ticked choice is shown as a solid blue square rather than a mark inside it.
const Box = ({ checked }: { checked: boolean }) => (
  <View style={[s.box, checked ? s.boxChecked : {}]} />
);

// One horizontal band of the sheet: English half, rule, Arabic half.
const Row = ({ en, arb }: { en: React.ReactNode; arb: React.ReactNode }) => (
  <View style={s.row} wrap={false}>
    <View style={s.colEn}>{en}</View>
    <View style={s.divider} />
    <View style={s.colAr}>{arb}</View>
  </View>
);

const ConsentFormPdfDoc = ({ data }: { data: ConsentFormPdfData }) => {
  const name = (data.patientName ?? "").trim();
  const d = data.date ?? new Date();
  const dateLine = `${String(d.getDate()).padStart(2, "0")} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${d.getFullYear()}`;

  return (
    <Document title="Consent Form">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>VitaSyr.</Text>

        <View style={s.titleBar}>
          <View style={s.titleWrap}>
            <Text style={s.titleText}>{ar(AR.title)}</Text>
            <Text style={s.titleText}>{EN.title}</Text>
          </View>
        </View>

        <Row
          en={
            <View style={s.signRowEn}>
              <Text style={s.signLabel}>{EN.undersigned}</Text>
              <Text style={s.signValue}>{name}</Text>
            </View>
          }
          arb={
            <View style={s.signRowAr}>
              <Text style={s.signLabel}>{ar(AR.undersigned)}</Text>
              <Text style={s.signValue}>{ar(name)}</Text>
            </View>
          }
        />
        <Row en={<Text style={s.paraEn}>{EN.intro}</Text>} arb={<Text style={s.paraAr}>{ar(AR.intro)}</Text>} />
        <Row en={<Text style={s.paraEn}>{EN.authorization}</Text>} arb={<Text style={s.paraAr}>{ar(AR.authorization)}</Text>} />
        <Row en={<Text style={s.paraEn}>{EN.choicePrompt}</Text>} arb={<Text style={s.paraAr}>{ar(AR.choicePrompt)}</Text>} />

        {CHOICE_ORDER.map((k) => (
          <Row
            key={k}
            en={
              <View style={s.boxRowEn}>
                <Box checked={data.choice === k} />
                <Text style={{ fontSize: 10, lineHeight: 1.65, flex: 1, textAlign: "left" }}>{EN.choices[k]}</Text>
              </View>
            }
            arb={
              <View style={s.boxRowAr}>
                <Box checked={data.choice === k} />
                <Text style={{ fontSize: 10, lineHeight: 1.8, flex: 1, textAlign: "right" }}>{ar(AR.choices[k])}</Text>
              </View>
            }
          />
        ))}

        <Row en={<Text style={s.paraEn}>{EN.declaration}</Text>} arb={<Text style={s.paraAr}>{ar(AR.declaration)}</Text>} />

        {/* Name / signature / date — Arabic only, kept on the same page as the
            form itself (a growing spacer here pushed it onto a second page). */}
        <View style={s.signBlock} wrap={false}>
          <View style={s.signBlockRow}>
            <Text style={s.signLabel}>{ar(AR.fullName)}</Text>
            <Text style={s.signValue}>{ar(name)}</Text>
          </View>
          <View style={s.signBlockRow}>
            <Text style={s.signLabel}>{ar(AR.signature)}</Text>
            <View style={s.signValue}>
              {data.signatureDataUri ? <Image src={data.signatureDataUri} style={s.signatureImage} /> : <Text> </Text>}
            </View>
          </View>
          <View style={s.signBlockRow}>
            <Text style={s.signLabel}>{ar(AR.date)}</Text>
            <Text style={s.signValue}>{dateLine}</Text>
          </View>
        </View>

        <View style={s.bottomRule} />
        <PageFooter />
      </Page>
    </Document>
  );
};

// ── Public export ────────────────────────────────────────────────────────────────
export async function downloadConsentFormPdf(data: ConsentFormPdfData): Promise<void> {
  ensureAmiriFonts();
  const blob = await pdf(<ConsentFormPdfDoc data={data} />).toBlob();
  const tag = (data.patientName ?? "").trim().replace(/\s+/g, "-") || "patient";
  saveBlob(blob, `consent-form-${tag}.pdf`);
}
