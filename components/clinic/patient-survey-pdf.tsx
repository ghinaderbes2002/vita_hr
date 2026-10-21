// Client-only — imported via dynamic import() to avoid SSR issues.
// One customer-satisfaction survey as a VitaSyr sheet: the same header, footer,
// section bars and RTL layout as the physio and prosthetics PDFs (pdf-kit).
// The caller hands over the wording already resolved — question labels depend
// on the department and service type, and patient-survey.tsx owns those rules.
import React from "react";
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import {
  BORDER, BRAND, BRAND_LIGHT, MUTED, TEXT, F, InfoGrid, PageFooter, PageHeader, S, SecHead,
  ar, ensureAmiriFonts, saveBlob,
} from "./pdf-kit";

export interface SurveyPdfRating {
  label: string;
  /** 1–5; missing when the question was left unanswered. */
  value?: number | null;
  /** What 5 and 1 mean, as printed on the paper form: [5, 1]. */
  hint?: [string, string];
  /** One explanatory line under the question. */
  note?: string;
}

export interface SurveyPdfData {
  /** Header fields: department, customer, gender, age group, … */
  info: { label: string; value?: string | number | null }[];
  ratings: SurveyPdfRating[];
  /** Single-choice answers (complaint stage, reason for not fitting). */
  choices: { label: string; value?: string | null }[];
  overall: SurveyPdfRating;
  notesLabel: string;
  notes?: string | null;
  /** For the file name. */
  fileTag: string;
}

/**
 * `direction` on the page drives layout only; mixed Arabic/Latin text (digits,
 * "5 = …") needs it on the Text itself to be ordered right-to-left — see
 * custody-group-pdf.tsx. Arabic still goes through ar() for shaping.
 */
const RTL = { direction: "rtl" as const, textAlign: "right" as const };

/** Five boxes, the first `value` filled, then "value / 5" — reads like the paper scale. */
const Scale = ({ value }: { value?: number | null }) => (
  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3 }}>
    {[1, 2, 3, 4, 5].map((n) => {
      const on = !!value && n <= value;
      return (
        <View
          key={n}
          style={{
            width: 14, height: 14, borderWidth: 0.8, borderColor: BRAND, borderRadius: 2,
            backgroundColor: on ? BRAND : "transparent", justifyContent: "center", alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 7, color: on ? "#ffffff" : MUTED }}>{n}</Text>
        </View>
      );
    })}
    <Text style={{ fontSize: 8.5, color: value ? TEXT : MUTED, marginRight: 6 }}>
      {value ? `${value} / 5` : "—"}
    </Text>
  </View>
);

const RatingRow = ({ r, n, highlight }: { r: SurveyPdfRating; n: number; highlight?: boolean }) => (
  <View
    wrap={false}
    style={{
      flexDirection: "column", paddingVertical: 6, paddingHorizontal: 6,
      borderBottomWidth: 0.5, borderBottomColor: BORDER,
      backgroundColor: highlight ? BRAND_LIGHT : "transparent",
    }}
  >
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <View style={{ flexDirection: "row-reverse", flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 8.5, color: BRAND, fontWeight: "bold" }}>{`.${n}`}</Text>
        <Text style={{ ...RTL, fontSize: 9, color: TEXT, flex: 1 }}>{ar(r.label)}</Text>
      </View>
      <Scale value={r.value} />
    </View>
    {r.note && <Text style={{ ...RTL, fontSize: 7.5, color: MUTED, marginTop: 2 }}>{ar(r.note)}</Text>}
    {r.hint && (
      <View style={{ marginTop: 2 }}>
        <Text style={{ ...RTL, fontSize: 7.5, color: "#15803d" }}>{ar(`5 = ${r.hint[0]}`)}</Text>
        <Text style={{ ...RTL, fontSize: 7.5, color: "#15803d" }}>{ar(`1 = ${r.hint[1]}`)}</Text>
      </View>
    )}
  </View>
);

const SurveyPdfDoc = ({ data }: { data: SurveyPdfData }) => (
  <Document>
    <Page size="A4" style={S.page}>
      <PageHeader />

      <SecHead label="استبيان تقييم رضا العملاء" />
      <InfoGrid items={data.info} />

      <SecHead label="تقييم الخدمة" />
      <View>
        {data.ratings.map((r, i) => <RatingRow key={r.label} r={r} n={i + 1} />)}
      </View>

      {data.choices.length > 0 && (
        <View style={{ marginTop: 6 }}>
          {data.choices.map((c) => <F key={c.label} label={c.label} value={c.value} />)}
        </View>
      )}

      <View style={{ marginTop: 6 }}>
        <RatingRow r={data.overall} n={data.ratings.length + 1} highlight />
      </View>

      <SecHead label="ملاحظات" />
      <Text style={{ ...RTL, fontSize: 8.5, color: TEXT, marginBottom: 2 }}>{ar(data.notesLabel)}</Text>
      <Text style={{ ...RTL, fontSize: 9, color: data.notes ? MUTED : "#9ca3af" }}>
        {data.notes ? ar(data.notes) : "—"}
      </Text>

      <PageFooter />
    </Page>
  </Document>
);

export async function downloadPatientSurveyPdf(data: SurveyPdfData): Promise<void> {
  ensureAmiriFonts();
  const blob = await pdf(<SurveyPdfDoc data={data} />).toBlob();
  saveBlob(blob, `survey-${data.fileTag.replace(/\s+/g, "-") || "patient"}.pdf`);
}
