// Client-only — imported via dynamic import() to avoid SSR issues.
// Renders the patient's delivery pledge (إقرار وتعهد) that accompanies the final
// delivery form, as a copy of the printed sheet. The wording is fixed legal text,
// so it lives here rather than in the i18n messages.
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { BRAND, TEXT, ar, PageHeader, PageFooter, ensureAmiriFonts, saveBlob, toDataUri } from "./pdf-kit";

export interface PledgeFormPdfData {
  patientName?: string;
  /** Drawn, uploaded, or on-file patient signature. URL or data URI. */
  signatureUrl?: string;
  date?: Date;
}

const AR = {
  intro: "أقر وأتعهد بما يلي:",
  firstTitle: "أولاً: الاستلام والإقرار بالتعليمات:",
  received:
    "أقر بأنني قد استلمت الطرف الصناعي المحدد تفصيلاً في نموذج التسليم النهائي المرفق، الذي يعتبر جزءاً لا يتجزأ من هذا الإقرار، وذلك بحالة فنية سليمة وجهوزية تامة.",
  useAsInstructed: "وأتعهد باستخدامه حصراً وفقاً للتعليمات المكتوبة المرفقة به.",
  explained:
    "وأقر بأنني قد تلقيت شرحاً كافياً ومفصلاً من المختصين حول طريقة الاستخدام الصحيحة، والصيانة الدورية، وحدود الاستخدام المسموحة.",
  secondTitle: "ثانياً: نطاق الضمان وإخلاء المسؤولية:",
  warrantyScope:
    "أقر بأن الضمان الممنوح من الشركة على هذا الطرف الصناعي يغطي فقط عيوب التصنيع والمواد الأولية وفق الشروط المحددة في وثيقة الضمان المستقلة.",
  noLiability:
    "وأوافق وأقر بأن الشركة المصنعة (أوتوبوك) أو الوكيل أو أي من منسوبيهما لن يكونوا مسؤولين بأي حال من الأحوال عن أي أعطال تقنية أو تلف أو حوادث أو إصابات تنشأ عن أي من الأسباب التالية:",
  cause1: "أولاً: مخالفة تعليمات الاستخدام أو الإهمال في الصيانة الدورية.",
  cause2: "ثانياً: تعريض الطرف لصدمات أو أحمال أو استخدامات تتجاوز الحدود الموصى بها في تعليمات الشركة.",
  cause3: "ثالثاً: قيام جهة غير معتمدة من الشركة بأي تعديل أو إصلاح للطرف.",
  finalTitle: "رابعاً: إقرار نهائي:",
  finalStatement:
    "أقر بأنني قد اطلعت على بنود هذا الإقرار وفهمتها وأوقعه بإرادتي الكاملة دون أي إكراه.",
  fullName: "الاسم الكامل / اسم ولي الأمر:",
  signature: "التوقيع:",
  date: "التاريخ:",
};

const EN_LABELS = {
  fullName: "Full Name/Guardian Name",
  signature: "Signature",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 11,
    color: TEXT,
    // Room for the fixed header and footer bands from pdf-kit.
    paddingTop: 70,
    paddingBottom: 68,
    paddingHorizontal: 34,
    backgroundColor: "#ffffff",
    textAlign: "right",
  },
  intro: { fontSize: 12.5, fontWeight: "bold", marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 14, marginBottom: 8 },
  para: { fontSize: 11, lineHeight: 1.95, marginBottom: 12 },
  cause: { fontSize: 11, lineHeight: 1.95, marginBottom: 9, paddingRight: 16 },
  signBlock: { marginTop: 26, flexDirection: "row-reverse", gap: 30 },
  signCol: { flex: 1 },
  signLabelAr: { fontSize: 10.5, marginBottom: 2 },
  signLabelEn: { fontSize: 8, color: BRAND, marginBottom: 4 },
  signLine: { borderBottomWidth: 0.8, borderBottomColor: TEXT, minHeight: 40, justifyContent: "flex-end" },
  signValue: { fontSize: 10.5, paddingBottom: 3 },
  signatureImage: { height: 38, objectFit: "contain", alignSelf: "flex-end", marginBottom: 2 },
  dateRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 6, marginTop: 16 },
});

const PledgeFormPdfDoc = ({ data }: { data: PledgeFormPdfData }) => {
  const name = (data.patientName ?? "").trim();
  const d = data.date ?? new Date();
  const dateLine = `${String(d.getDate()).padStart(2, "0")} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${d.getFullYear()}`;

  return (
    <Document title="Delivery Pledge">
      <Page size="A4" style={s.page}>
        <PageHeader />

        <Text style={s.intro}>{ar(AR.intro)}</Text>

        <Text style={s.sectionTitle}>{ar(AR.firstTitle)}</Text>
        <Text style={s.para}>{ar(AR.received)}</Text>
        <Text style={s.para}>{ar(AR.useAsInstructed)}</Text>
        <Text style={s.para}>{ar(AR.explained)}</Text>

        <Text style={s.sectionTitle}>{ar(AR.secondTitle)}</Text>
        <Text style={s.para}>{ar(AR.warrantyScope)}</Text>
        <Text style={s.para}>{ar(AR.noLiability)}</Text>
        <Text style={s.cause}>{ar(AR.cause1)}</Text>
        <Text style={s.cause}>{ar(AR.cause2)}</Text>
        <Text style={s.cause}>{ar(AR.cause3)}</Text>

        <Text style={s.sectionTitle}>{ar(AR.finalTitle)}</Text>
        <Text style={s.para}>{ar(AR.finalStatement)}</Text>

        <View style={s.signBlock} wrap={false}>
          <View style={s.signCol}>
            <Text style={s.signLabelAr}>{ar(AR.fullName)}</Text>
            <Text style={s.signLabelEn}>{EN_LABELS.fullName}</Text>
            <View style={s.signLine}>
              <Text style={s.signValue}>{ar(name)}</Text>
            </View>
          </View>
          <View style={s.signCol}>
            <Text style={s.signLabelAr}>{ar(AR.signature)}</Text>
            <Text style={s.signLabelEn}>{EN_LABELS.signature}</Text>
            <View style={s.signLine}>
              {data.signatureUrl
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an <img>
                ? <Image src={data.signatureUrl} style={s.signatureImage} />
                : <Text style={s.signValue}> </Text>}
            </View>
          </View>
        </View>

        <View style={s.dateRow} wrap={false}>
          <Text style={s.signValue}>{ar(AR.date)}</Text>
          <Text style={s.signValue}>{dateLine}</Text>
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
};

// ── Public export ────────────────────────────────────────────────────────────────
export async function downloadPledgeFormPdf(data: PledgeFormPdfData): Promise<void> {
  ensureAmiriFonts();
  // react-pdf fetches image bytes itself and a failed fetch aborts the whole
  // render, so resolve the signature to a data URI first and drop it if it fails.
  const signatureUrl = await toDataUri(data.signatureUrl);
  const blob = await pdf(<PledgeFormPdfDoc data={{ ...data, signatureUrl }} />).toBlob();
  const tag = (data.patientName ?? "").trim().replace(/\s+/g, "-") || "patient";
  saveBlob(blob, `delivery-pledge-${tag}.pdf`);
}
