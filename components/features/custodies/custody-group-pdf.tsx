// Client-only — imported via dynamic import() to avoid SSR issues
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, pdf,
} from "@react-pdf/renderer";
import { Custody } from "@/types";

// ── Theme ─────────────────────────────────────────────────────────────────────
const BRAND       = "#1e3a5f";
const BRAND_LIGHT = "#e8edf4";
const TEXT        = "#111827";
const MUTED       = "#6b7280";
const BORDER      = "#cbd5e1";

// ── Styles ────────────────────────────────────────────────────────────────────
// Cairo has full Arabic + Latin glyph coverage and proper OpenType Arabic
// joining tables, so @react-pdf/renderer's built-in bidi (bidi-js) + Arabic
// shaper (fontkit) handle mixed Arabic/Latin text correctly on their own —
// no manual shaping or run-splitting needed.
const S = StyleSheet.create({
  page: {
    fontFamily: "Cairo",
    fontSize: 10,
    color: TEXT,
    paddingTop: 70,
    paddingBottom: 50,
    paddingHorizontal: 28,
    direction: "rtl" as any,
    textAlign: "right",
    backgroundColor: "#ffffff",
  },
  pageHeader: {
    position: "absolute",
    top: 12,
    left: 28,
    right: 28,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 6,
  },
  pageHeaderTitle:  { fontSize: 14, fontWeight: "bold", color: BRAND },
  pageHeaderSub:    { fontSize: 8, color: MUTED, marginTop: 2 },
  pageFooter: {
    position: "absolute",
    bottom: 10,
    left: 28,
    right: 28,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 4,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageFooterText: { fontSize: 7.5, color: MUTED },
  // Employee info card
  empCard: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    borderRightWidth: 4,
    borderRightColor: BRAND,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row-reverse",
    gap: 24,
  },
  empCardItem: { flexDirection: "column", gap: 2 },
  empCardLabel: { fontSize: 7.5, color: BRAND, fontWeight: "bold" },
  empCardValue: { fontSize: 10, fontWeight: "bold", color: TEXT },
  empCardNameValue: { fontSize: 10, color: TEXT },
  // Table
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: BRAND,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 5,
    minHeight: 22,
  },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  thNum:    { width: 24, fontSize: 8, color: "#ffffff", fontWeight: "bold", textAlign: "center" },
  thName:   { flex: 3,   fontSize: 8, color: "#ffffff", fontWeight: "bold" },
  thCat:    { flex: 1.5, fontSize: 8, color: "#ffffff", fontWeight: "bold" },
  thSerial: { flex: 2,   fontSize: 8, color: "#ffffff", fontWeight: "bold" },
  thDate:   { flex: 1.5, fontSize: 8, color: "#ffffff", fontWeight: "bold", textAlign: "center" },
  thStatus: { flex: 1.5, fontSize: 8, color: "#ffffff", fontWeight: "bold", textAlign: "center" },
  tdNum:    { width: 24, fontSize: 8.5, color: MUTED,  textAlign: "center", fontFamily: "Courier" as any },
  tdName:   { flex: 3,   fontSize: 8.5, color: TEXT, lineHeight: 1.4 },
  tdCat:    { flex: 1.5, fontSize: 8.5, color: MUTED },
  tdSerial: { flex: 2,   fontSize: 8,   color: MUTED, fontFamily: "Courier" as any },
  tdDate:   { flex: 1.5, fontSize: 8.5, color: MUTED, textAlign: "center", direction: "ltr" as any },
  tdStatus: { flex: 1.5, fontSize: 8.5, textAlign: "center" },
  statusWith:     { color: "#0f6624" },
  statusReturned: { color: "#6b7280" },
  statusDamaged:  { color: "#b45309" },
  statusLost:     { color: "#dc2626" },
  acknowledgmentBox: {
    position: "absolute",
    bottom: 95,
    left: 28,
    right: 28,
  },
  acknowledgmentText: {
    fontSize: 8,
    color: TEXT,
    lineHeight: 1.6,
    textAlign: "right",
  },
  signatureBox: {
    position: "absolute",
    bottom: 40,
    left: 28,
    width: 180,
    alignItems: "center",
  },
  signatureLabel: { fontSize: 9, color: TEXT, fontWeight: "bold" },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: TEXT,
    width: "100%",
    marginTop: 28,
  },
});

// Arabic-style guillemets («»), not straight ASCII quotes — real glyphs with
// well-defined bracket pairing, so they render on the correct side without
// needing an invisible bidi-control character.
//
// Split into short clauses rendered as separate <Text> elements instead of
// one long paragraph string: @react-pdf/textkit's RTL line-reordering
// (reorderLine, running in a WASM yoga-layout module in the browser) has a
// known crash — "Cannot read properties of undefined (reading 'id')" — on
// long RTL paragraphs that wrap across multiple lines. Keeping each Text's
// content short avoids the code path that triggers it. See
// https://github.com/diegomura/react-pdf/issues/3050 and
// https://github.com/diegomura/react-pdf/issues/3292
const ACKNOWLEDGMENT_LINES = [
  "«أقرّ أنا الموقّع أدناه بأنني استلمت المواد المبيّنة في هذا النموذج وهي بحالة سليمة،",
  "وأتحمل المسؤولية الكاملة عن المحافظة عليها واستخدامها وفق الأنظمة والتعليمات المعتمدة.",
  "كما أقرّ بتحمّل مسؤولية أي تلف أو فقدان أو سوء استخدام قد يلحق بهذه المواد طوال فترة وجودها في عهدتي،",
  "وألتزم بإعادتها عند الطلب بحالة جيدة قدر الإمكان، مع علمي بخضوعي للإجراءات الإدارية أو المالية المترتبة في حال الإخلال بما ورد أعلاه.»",
];

// ── Label maps ────────────────────────────────────────────────────────────────
const CAT_LABEL: Record<string, string> = {
  ELECTRONICS: "إلكترونيات", FURNITURE: "أثاث", VEHICLE: "مركبة",
  TOOLS: "أدوات عمل", KEYS: "مفاتيح", UNIFORM: "زي رسمي", OTHER: "أخرى",
};
const STATUS_LABEL: Record<string, string> = {
  WITH_EMPLOYEE: "مع الموظف", RETURNED: "تم إرجاعها", DAMAGED: "تالفة", LOST: "مفقودة",
};
const STATUS_STYLE: Record<string, any> = {
  WITH_EMPLOYEE: S.statusWith,
  RETURNED:      S.statusReturned,
  DAMAGED:       S.statusDamaged,
  LOST:          S.statusLost,
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d.slice(0, 10);
}

// ── Mixed Arabic/Latin text ──────────────────────────────────────────────────
// @react-pdf/textkit's RTL reordering (reorderLine, running in a WASM
// yoga-layout module in the browser) crashes with "Cannot read properties of
// undefined (reading 'id')" on some Arabic+Latin mixed strings — its glyph
// index bookkeeping breaks once a run contains ligature-formed glyphs (which
// virtually all connected Arabic text does) AND the line actually needs bidi
// reordering (only triggered when a line mixes RTL and LTR runs). Item names
// like "طابعة BROTHER لون اسود" hit exactly that combination.
// See https://github.com/diegomura/react-pdf/issues/3050 and
// https://github.com/diegomura/react-pdf/issues/3292 (open, unfixed upstream).
//
// Splitting mixed text into separate same-direction <Text> runs keeps each
// one single-direction, so reorderLine's "no bidi reordering needed" early
// exit applies to every run and the buggy code path never executes.
const hasAr = (s: string) => /[؀-ۿ]/.test(s);

function splitRuns(s: string): { text: string; ar: boolean }[] {
  const runs: { text: string; ar: boolean }[] = [];
  let cur = "";
  let curAr = false;
  for (const ch of s) {
    const isAr = hasAr(ch);
    if (cur && !/\s/.test(ch) && isAr !== curAr) {
      runs.push({ text: cur, ar: curAr });
      cur = ch;
      curAr = isAr;
    } else {
      if (!cur) curAr = isAr;
      cur += ch;
    }
  }
  if (cur) runs.push({ text: cur, ar: curAr });
  return runs;
}

function MixedText({ text, style }: { text: string; style?: any }) {
  if (!text) return null;
  if (!hasAr(text)) return <Text style={[style, { direction: "ltr" as any }]}>{text}</Text>;
  const runs = splitRuns(text);
  if (runs.length <= 1) return <Text style={style}>{text}</Text>;
  const { flex, ...runStyle } = (Array.isArray(style) ? Object.assign({}, ...style) : style) ?? {};
  return (
    <View style={{ flex, flexDirection: "row-reverse", flexWrap: "wrap" }}>
      {runs.map((r, idx) => (
        <Text key={idx} style={[runStyle, !r.ar && { direction: "ltr" as any }]}>
          {r.text}
        </Text>
      ))}
    </View>
  );
}

// ── PDF Document ──────────────────────────────────────────────────────────────

interface PdfData {
  employeeName: string;
  employeeNumber?: string;
  department?: string;
  custodies: Custody[];
  printDate: string;
}

function CustodyPdfDoc({ data }: { data: PdfData }) {
  const counts = {
    with: data.custodies.filter((c) => c.status === "WITH_EMPLOYEE").length,
    returned: data.custodies.filter((c) => c.status === "RETURNED").length,
    damaged: data.custodies.filter((c) => c.status === "DAMAGED").length,
    lost: data.custodies.filter((c) => c.status === "LOST").length,
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        {/* ── Header ── */}
        <View style={S.pageHeader} fixed>
          <View>
            <Text style={S.pageHeaderTitle}>سجل العهد الوظيفية</Text>
          </View>
          <Text style={S.pageHeaderSub}>{data.printDate}</Text>
        </View>

        {/* ── Employee card ── */}
        <View style={S.empCard}>
          <View style={[S.empCardItem, { alignItems: "center" }]}>
            <Text style={[S.empCardLabel, { textAlign: "center" }]}>
              اسم الموظف
            </Text>
            <Text style={[S.empCardNameValue, { textAlign: "center" }]}>
              {data.employeeName}
            </Text>
          </View>
          {data.employeeNumber && (
            <View style={[S.empCardItem, { alignItems: "center" }]}>
              <Text style={[S.empCardLabel, { textAlign: "center" }]}>
                الرقم الوظيفي
              </Text>
              <Text style={[S.empCardNameValue, { textAlign: "center" }]}>
                {data.employeeNumber}
              </Text>
            </View>
          )}
          {data.department && (
            <View style={[S.empCardItem, { alignItems: "center" }]}>
              <Text style={[S.empCardLabel, { textAlign: "center" }]}>
                القسم
              </Text>
              <Text style={[S.empCardNameValue, { textAlign: "center" }]}>
                {data.department}
              </Text>
            </View>
          )}
          <View style={S.empCardItem}>
            <Text style={S.empCardLabel}>إجمالي العهد</Text>
            <Text style={S.empCardValue}>{data.custodies.length}</Text>
          </View>
          {[
            { label: "مع الموظف", val: counts.with, color: "#0f6624" },
            { label: "تم إرجاعها", val: counts.returned, color: "#6b7280" },
            { label: "تالفة", val: counts.damaged, color: "#b45309" },
            { label: "مفقودة", val: counts.lost, color: "#dc2626" },
          ]
            .filter((x) => x.val > 0)
            .map((x) => (
              <View key={x.label} style={S.empCardItem}>
                <Text style={S.empCardLabel}>{x.label}</Text>
                <Text style={[S.empCardValue, { color: x.color }]}>
                  {x.val}
                </Text>
              </View>
            ))}
        </View>

        {/* ── Table ── */}
        <View style={S.tableHeader}>
          <Text style={S.thNum}>م</Text>
          <Text style={S.thName}>اسم الأصل</Text>
          <Text style={S.thCat}>الفئة</Text>
          <Text style={S.thSerial}>الرقم التسلسلي</Text>
          <Text style={S.thDate}>تاريخ التسليم</Text>
          <Text style={S.thStatus}>الحالة</Text>
        </View>

        {data.custodies.map((c, i) => (
          <View
            key={c.id}
            style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={S.tdNum}>{i + 1}</Text>
            <MixedText
              style={S.tdName}
              text={`${c.name}${c.description ? ` (${c.description})` : ""}`}
            />
            <Text style={S.tdCat}>{CAT_LABEL[c.category] ?? c.category}</Text>
            <Text style={S.tdSerial}>{c.serialNumber ?? "—"}</Text>
            <Text style={S.tdDate}>{fmtDate(c.assignedDate)}</Text>
            <Text style={[S.tdStatus, STATUS_STYLE[c.status] ?? {}]}>
              {STATUS_LABEL[c.status] ?? c.status}
            </Text>
          </View>
        ))}

        {/* ── Acknowledgment ── */}
        <View style={S.acknowledgmentBox}>
          {ACKNOWLEDGMENT_LINES.map((line, i) => (
            <Text key={i} style={S.acknowledgmentText}>{line}</Text>
          ))}
        </View>

        {/* ── Employee signature ── */}
        <View style={S.signatureBox}>
          <Text style={[S.signatureLabel, { fontWeight: "normal" }]}>
            توقيع الموظف
          </Text>
          <View style={S.signatureLine} />
        </View>

        {/* ── Footer ── */}
        <View style={S.pageFooter} fixed>
          <Text style={S.pageFooterText}>سجل العهد الوظيفية — Vita HR</Text>
          <Text
            style={S.pageFooterText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

// ── Export function ───────────────────────────────────────────────────────────

let fontsRegistered = false;

export async function downloadCustodyGroupPdf(
  custodies: Custody[],
  employee: { name: string; number?: string; department?: string },
): Promise<void> {
  if (!fontsRegistered) {
    const origin = window.location.origin;
    Font.register({
      family: "Cairo",
      fonts: [
        { src: `${origin}/fonts/cairo-regular.ttf`, fontWeight: "normal" },
        { src: `${origin}/fonts/cairo-bold.ttf`,    fontWeight: "bold" },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
  }

  const now = new Date();
  const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const blob = await pdf(
    <CustodyPdfDoc data={{
      employeeName:   employee.name,
      employeeNumber: employee.number,
      department:     employee.department,
      custodies,
      printDate,
    }} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = `custodies-${employee.name.replace(/\s+/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
