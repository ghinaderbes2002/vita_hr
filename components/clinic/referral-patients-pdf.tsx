// Client-only — imported via dynamic import() to avoid SSR issues.
// The patients attributed to one referral source, on the VitaFoot letterhead.
import React from "react";
import { Document, Image, Page, Text, View, pdf } from "@react-pdf/renderer";
import { freshCairoFamily, saveBlob } from "./pdf-kit";
import type { ReferralSourcePatient } from "@/lib/api/clinic-referrals";

export interface ReferralPatientsPdfData {
  /** Who referred them, as it reads after "من قبل". */
  referrerLabel: string;
  /** "المرضى المُحالون" or "المبيعات". */
  listLabel: string;
  /** The referral-date filter in force, YYYY-MM-DD; empty when unset. */
  dateFrom?: string;
  dateTo?: string;
  patients: ReferralSourcePatient[];
}

const LINE = "#808080";
const HEAD_BG = "#D9D9D9";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

// Widths in reading order, right to left, as in the Word template.
const COLS = { n: "5%", name: "21%", service: "27%", visit: "16%", fitted: "16%", insole: "15%" };

// The page margins leave the letterhead's logo and footer clear on every page.
const PAGE = {
  fontSize: 10, color: "#000000",
  paddingTop: 113, paddingBottom: 99, paddingHorizontal: 42.5,
};

const Cell = ({ width, children, bold, last }: {
  width: string; children: string; bold?: boolean; last?: boolean;
}) => (
  <View style={{
    width, justifyContent: "center", paddingVertical: 3, paddingHorizontal: 4,
    borderLeftWidth: last ? 0 : 0.5, borderLeftColor: LINE,
  }}>
    <Text style={{ textAlign: "center", fontSize: 9, fontWeight: bold ? "bold" : "normal" }}>{children}</Text>
  </View>
);

const fittedLabel = (p: ReferralSourcePatient) =>
  p.installedAt === undefined ? "—" : p.installedAt ? "نعم" : "لا";

export const ReferralPatientsDoc = ({ data, letterhead, fontFamily }: {
  data: ReferralPatientsPdfData; letterhead: string; fontFamily: string;
}) => {
  const isSales = data.listLabel === "المبيعات";
  // undefined means the API did not send the field, which is not the same as nobody fitted.
  const hasFittingData = data.patients.some((p) => p.installedAt !== undefined);
  const fittedCount = data.patients.filter((p) => p.installedAt).length;
  return (
    <Document title={`${data.listLabel} - ${data.referrerLabel}`}>
      <Page size="A4" style={{ ...PAGE, fontFamily }}>
        <Image fixed src={letterhead} style={{ position: "absolute", top: 0, left: 0, width: 595.28, height: 841.89 }} />

        <Text style={{ textAlign: "center", fontWeight: "bold", marginBottom: data.dateFrom || data.dateTo ? 2 : 14 }}>
          {`قائمة ${isSales ? "مبيعات" : "المُستفيدين"} المُحالين من قبل ${data.referrerLabel}`}
        </Text>
        {(data.dateFrom || data.dateTo) && (
          <Text style={{ textAlign: "center", fontSize: 9, marginBottom: 12 }}>
            {`فترة الإحالة: ${fmt(data.dateFrom)} - ${fmt(data.dateTo)}`}
          </Text>
        )}

        <View fixed style={{ flexDirection: "row-reverse", backgroundColor: HEAD_BG, borderWidth: 0.5, borderColor: LINE }}>
          <Cell width={COLS.n} bold>#</Cell>
          <Cell width={COLS.name} bold>اسم المستفيد</Cell>
          <Cell width={COLS.service} bold>نوع الخدمة</Cell>
          <Cell width={COLS.visit} bold>تاريخ الزيارة</Cell>
          <Cell width={COLS.fitted} bold>تركيب الضبان</Cell>
          <Cell width={COLS.insole} bold last>اسم الضبان</Cell>
        </View>
        {data.patients.map((p, i) => (
          <View
            key={p.id}
            wrap={false}
            style={{
              flexDirection: "row-reverse", borderWidth: 0.5, borderTopWidth: 0, borderColor: LINE,
            }}
          >
            <Cell width={COLS.n}>{String(i + 1)}</Cell>
            <Cell width={COLS.name}>{p.name || "—"}</Cell>
            <Cell width={COLS.service}>{p.serviceName || "—"}</Cell>
            <Cell width={COLS.visit}>{fmt(p.lastVisitDate)}</Cell>
            <Cell width={COLS.fitted}>{fittedLabel(p)}</Cell>
            <Cell width={COLS.insole} last>{p.insoleType?.join("، ") || "—"}</Cell>
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 24, borderWidth: 0.5, borderColor: "#000000" }}>
          {[
            { label: "العدد الإجمالي للمُستفيدين المُحالين", value: String(data.patients.length) },
            { label: "عدد المُستفيدين المُحالين تم تركيب الضبان لهم", value: hasFittingData ? String(fittedCount) : "—" },
          ].map((row, i) => (
            <View
              key={row.label}
              style={{ flexDirection: "row-reverse", borderTopWidth: i ? 0.5 : 0, borderTopColor: "#000000" }}
            >
              <View style={{ width: "50%", paddingVertical: 5, borderLeftWidth: 0.5, borderLeftColor: "#000000" }}>
                <Text style={{ textAlign: "center" }}>{row.label}</Text>
              </View>
              <View style={{ width: "50%", paddingVertical: 5 }}>
                <Text style={{ textAlign: "center" }}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export async function downloadReferralPatientsPdf(data: ReferralPatientsPdfData): Promise<void> {
  const fontFamily = freshCairoFamily();
  const letterhead = `${window.location.origin}/assets/images/vitafoot-letterhead.jpg`;
  const blob = await pdf(<ReferralPatientsDoc data={data} letterhead={letterhead} fontFamily={fontFamily} />).toBlob();
  saveBlob(blob, `referral-patients-${data.referrerLabel.replace(/\s+/g, "-")}.pdf`);
}
