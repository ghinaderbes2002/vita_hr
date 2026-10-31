// Client-only — imported via dynamic import() to avoid SSR issues.
// The patients attributed to one referral source, as a VitaSyr sheet.
import React from "react";
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import {
  BORDER, BRAND, BRAND_LIGHT, InfoGrid, PageFooter, PageHeader, S, SecHead, TEXT,
  ar, ensureAmiriFonts, saveBlob,
} from "./pdf-kit";
import type { ReferralSourcePatient } from "@/lib/api/clinic-referrals";

export interface ReferralPatientsPdfData {
  sourceName: string;
  sourceType: string;
  /** "المرضى المُحالون" or "المبيعات". */
  listLabel: string;
  /** The referral-date filter in force, YYYY-MM-DD; empty when unset. */
  dateFrom?: string;
  dateTo?: string;
  patients: ReferralSourcePatient[];
}

const RTL = { direction: "rtl" as const, textAlign: "right" as const };
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

// Widths in reading order, right to left.
const COLS = { n: "6%", number: "20%", name: "38%", phone: "20%", date: "16%" };

const Cell = ({ width, children, bold, color }: {
  width: string; children: string; bold?: boolean; color?: string;
}) => (
  <Text style={{ ...RTL, width, fontSize: 9, paddingHorizontal: 4, color: color ?? TEXT, fontWeight: bold ? "bold" : "normal" }}>
    {children}
  </Text>
);

const ReferralPatientsDoc = ({ data }: { data: ReferralPatientsPdfData }) => (
  <Document title={`${data.listLabel} - ${data.sourceName}`}>
    <Page size="A4" style={S.page}>
      <PageHeader />

      <SecHead label={data.listLabel} />
      <InfoGrid items={[
        { label: "المصدر", value: data.sourceName },
        { label: "النوع", value: data.sourceType },
        { label: "العدد", value: data.patients.length },
        ...(data.dateFrom || data.dateTo
          ? [{ label: "فترة الإحالة", value: `${fmt(data.dateFrom)} - ${fmt(data.dateTo)}` }]
          : []),
        { label: "تاريخ التصدير", value: fmt(new Date().toISOString()) },
      ]} />

      <View style={{ marginTop: 8 }}>
        <View style={{ flexDirection: "row-reverse", backgroundColor: BRAND, paddingVertical: 4 }}>
          <Cell width={COLS.n} bold color="#ffffff">#</Cell>
          <Cell width={COLS.number} bold color="#ffffff">{ar("رقم المريض")}</Cell>
          <Cell width={COLS.name} bold color="#ffffff">{ar("الاسم")}</Cell>
          <Cell width={COLS.phone} bold color="#ffffff">{ar("الهاتف")}</Cell>
          <Cell width={COLS.date} bold color="#ffffff">{ar("تاريخ الإحالة")}</Cell>
        </View>
        {data.patients.map((p, i) => (
          <View
            key={p.id}
            wrap={false}
            style={{
              flexDirection: "row-reverse", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: BORDER,
              backgroundColor: i % 2 ? BRAND_LIGHT : "transparent",
            }}
          >
            <Cell width={COLS.n}>{String(i + 1)}</Cell>
            <Cell width={COLS.number}>{p.patientNumber || "—"}</Cell>
            <Cell width={COLS.name}>{p.name ? ar(p.name) : "—"}</Cell>
            <Cell width={COLS.phone}>{p.phone || "—"}</Cell>
            <Cell width={COLS.date}>{fmt(p.referredAt)}</Cell>
          </View>
        ))}
      </View>

      <PageFooter />
    </Page>
  </Document>
);

export async function downloadReferralPatientsPdf(data: ReferralPatientsPdfData): Promise<void> {
  ensureAmiriFonts();
  const blob = await pdf(<ReferralPatientsDoc data={data} />).toBlob();
  saveBlob(blob, `referral-patients-${data.sourceName.replace(/\s+/g, "-")}.pdf`);
}
