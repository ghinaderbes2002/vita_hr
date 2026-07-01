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
const S = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
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
  empCardLabel: { fontSize: 7.5, color: MUTED },
  empCardValue: { fontSize: 10, fontWeight: "bold", color: TEXT },
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
  tdNum:    { width: 24, fontSize: 8.5, color: MUTED,  textAlign: "center" },
  tdName:   { flex: 3,   fontSize: 8.5, color: TEXT },
  tdCat:    { flex: 1.5, fontSize: 8.5, color: MUTED },
  tdSerial: { flex: 2,   fontSize: 8,   color: MUTED, fontFamily: "Courier" as any },
  tdDate:   { flex: 1.5, fontSize: 8.5, color: MUTED, textAlign: "center" },
  tdStatus: { flex: 1.5, fontSize: 8.5, textAlign: "center" },
  statusWith:     { color: "#0f6624" },
  statusReturned: { color: "#6b7280" },
  statusDamaged:  { color: "#b45309" },
  statusLost:     { color: "#dc2626" },
  summaryRow: {
    flexDirection: "row-reverse",
    marginTop: 12,
    gap: 12,
  },
  summaryChip: {
    flexDirection: "row-reverse",
    backgroundColor: BRAND_LIGHT,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    alignItems: "center",
  },
  summaryChipLabel: { fontSize: 8, color: MUTED },
  summaryChipVal:   { fontSize: 9, fontWeight: "bold", color: BRAND },
});

// ── Arabic shaping ────────────────────────────────────────────────────────────
const _AF: Record<number, readonly [string,string,string,string]> = {
  0x0622:['آ','ﺂ','',''],   0x0623:['أ','ﺄ','',''],   0x0624:['ؤ','ﺆ','',''],
  0x0625:['إ','ﺈ','',''],   0x0626:['ﺉ','ﺊ','ﺋ','ﺌ'], 0x0627:['ﺍ','ﺎ','',''],
  0x0628:['ﺏ','ﺐ','ﺑ','ﺒ'], 0x0629:['ﺓ','ﺔ','',''],   0x062A:['ﺕ','ﺖ','ﺗ','ﺘ'],
  0x062B:['ﺙ','ﺚ','ﺛ','ﺜ'], 0x062C:['ﺝ','ﺞ','ﺟ','ﺠ'], 0x062D:['ﺡ','ﺢ','ﺣ','ﺤ'],
  0x062E:['ﺥ','ﺦ','ﺧ','ﺨ'], 0x062F:['ﺩ','ﺪ','',''],   0x0630:['ﺫ','ﺬ','',''],
  0x0631:['ﺭ','ﺮ','',''],   0x0632:['ﺯ','ﺰ','',''],   0x0633:['ﺱ','ﺲ','ﺳ','ﺴ'],
  0x0634:['ﺵ','ﺶ','ﺷ','ﺸ'], 0x0635:['ﺹ','ﺺ','ﺻ','ﺼ'], 0x0636:['ﺽ','ﺾ','ﺿ','ﻀ'],
  0x0637:['ﻁ','ﻂ','ﻃ','ﻄ'], 0x0638:['ﻅ','ﻆ','ﻇ','ﻈ'], 0x0639:['ﻉ','ﻊ','ﻋ','ﻌ'],
  0x063A:['ﻍ','ﻎ','ﻏ','ﻐ'], 0x0641:['ﻑ','ﻒ','ﻓ','ﻔ'], 0x0642:['ﻕ','ﻖ','ﻗ','ﻘ'],
  0x0643:['ﻙ','ﻚ','ﻛ','ﻜ'], 0x0644:['ﻝ','ﻞ','ﻟ','ﻠ'], 0x0645:['ﻡ','ﻢ','ﻣ','ﻤ'],
  0x0646:['ﻥ','ﻦ','ﻧ','ﻨ'], 0x0647:['ﻩ','ﻪ','ﻫ','ﻬ'], 0x0648:['ﻭ','ﻮ','',''],
  0x0649:['ﻯ','ﻰ','',''],   0x064A:['ﻱ','ﻲ','ﻳ','ﻴ'],
};
const _NJL = new Set([0x0621,0x0622,0x0623,0x0624,0x0625,0x0627,0x0629,0x062F,0x0630,0x0631,0x0632,0x0648,0x0649]);
const _LA: Record<number,[string,string]> = {
  0x0622:['ﻵ','ﻶ'], 0x0623:['ﻷ','ﻸ'], 0x0625:['ﻹ','ﻺ'], 0x0627:['ﻻ','ﻼ'],
};
const _CMB = new Set([
  0x0610,0x0611,0x0612,0x0613,0x0614,0x0615,0x0616,0x0617,0x0618,0x0619,0x061A,
  0x064B,0x064C,0x064D,0x064E,0x064F,0x0650,0x0651,0x0652,0x0653,0x0654,0x0655,
  0x0656,0x0657,0x0658,0x0659,0x065A,0x065B,0x065C,0x065D,0x065E,0x065F,0x0640,
]);

function ar(s: string): string {
  if (!s) return "";
  if (!/[؀-ۿ]/.test(s)) return s;
  const cs = [...s];
  const out: string[] = [];
  const base = (idx: number, dir: -1 | 1): number => {
    let i = idx + dir;
    while (i >= 0 && i < cs.length) {
      const cp = cs[i].codePointAt(0) ?? 0;
      if (!_CMB.has(cp)) return cp;
      i += dir;
    }
    return 0;
  };
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i].codePointAt(0) ?? 0;
    if (_CMB.has(c)) { out.push(cs[i]); continue; }
    const f = _AF[c];
    if (!f) { out.push(cs[i]); continue; }
    const p = base(i, -1);
    const n = base(i,  1);
    if (c === 0x0644 && _LA[n]) {
      const pj = !!(p && _AF[p] && !_NJL.has(p));
      out.push(_LA[n][pj ? 1 : 0]);
      i++;
      while (i + 1 < cs.length && _CMB.has(cs[i + 1].codePointAt(0) ?? 0)) out.push(cs[++i]);
      continue;
    }
    const pj = !!(p && _AF[p] && !_NJL.has(p));
    const nj = !_NJL.has(c) && !!(n && _AF[n]);
    out.push(f[pj && nj ? 3 : pj ? 1 : nj ? 2 : 0] || cs[i]);
  }
  return out.join('');
}

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
  try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" }); }
  catch { return d.slice(0, 10); }
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
            <Text style={S.pageHeaderTitle}>{ar("سجل العهد الوظيفية")}</Text>
            <Text style={S.pageHeaderSub}>{ar("Vita HR System")}</Text>
          </View>
          <Text style={S.pageHeaderSub}>{ar(data.printDate)}</Text>
        </View>

        {/* ── Employee card ── */}
        <View style={S.empCard}>
          <View style={S.empCardItem}>
            <Text style={S.empCardLabel}>{ar("اسم الموظف")}</Text>
            <Text style={S.empCardValue}>{ar(data.employeeName)}</Text>
          </View>
          {data.employeeNumber && (
            <View style={S.empCardItem}>
              <Text style={S.empCardLabel}>{ar("الرقم الوظيفي")}</Text>
              <Text style={S.empCardValue}>{data.employeeNumber}</Text>
            </View>
          )}
          {data.department && (
            <View style={S.empCardItem}>
              <Text style={S.empCardLabel}>{ar("القسم")}</Text>
              <Text style={S.empCardValue}>{ar(data.department)}</Text>
            </View>
          )}
          <View style={S.empCardItem}>
            <Text style={S.empCardLabel}>{ar("إجمالي العهد")}</Text>
            <Text style={S.empCardValue}>{data.custodies.length}</Text>
          </View>
        </View>

        {/* ── Table ── */}
        <View style={S.tableHeader}>
          <Text style={S.thNum}>{ar("م")}</Text>
          <Text style={S.thName}>{ar("اسم الأصل")}</Text>
          <Text style={S.thCat}>{ar("الفئة")}</Text>
          <Text style={S.thSerial}>{ar("الرقم التسلسلي")}</Text>
          <Text style={S.thDate}>{ar("تاريخ التسليم")}</Text>
          <Text style={S.thStatus}>{ar("الحالة")}</Text>
        </View>

        {data.custodies.map((c, i) => (
          <View key={c.id} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
            <Text style={S.tdNum}>{i + 1}</Text>
            <View style={{ flex: 3 }}>
              <Text style={S.tdName}>{ar(c.name)}</Text>
              {c.description && <Text style={{ fontSize: 7.5, color: MUTED }}>{ar(c.description)}</Text>}
            </View>
            <Text style={S.tdCat}>{ar(CAT_LABEL[c.category] ?? c.category)}</Text>
            <Text style={S.tdSerial}>{c.serialNumber ?? "—"}</Text>
            <Text style={S.tdDate}>{fmtDate(c.assignedDate)}</Text>
            <Text style={[S.tdStatus, STATUS_STYLE[c.status] ?? {}]}>{ar(STATUS_LABEL[c.status] ?? c.status)}</Text>
          </View>
        ))}

        {/* ── Summary chips ── */}
        <View style={S.summaryRow}>
          {[
            { label: "مع الموظف", val: counts.with, color: "#0f6624" },
            { label: "تم إرجاعها", val: counts.returned, color: "#6b7280" },
            { label: "تالفة",      val: counts.damaged,  color: "#b45309" },
            { label: "مفقودة",    val: counts.lost,     color: "#dc2626" },
          ].filter((x) => x.val > 0).map((x) => (
            <View key={x.label} style={S.summaryChip}>
              <Text style={[S.summaryChipVal, { color: x.color }]}>{x.val}</Text>
              <Text style={S.summaryChipLabel}>{ar(x.label)}</Text>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={S.pageFooter} fixed>
          <Text style={S.pageFooterText}>{ar("سجل العهد الوظيفية — Vita HR")}</Text>
          <Text style={S.pageFooterText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
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
      family: "Amiri",
      fonts: [
        { src: `${origin}/fonts/amiri-regular.ttf`, fontWeight: "normal",  fontStyle: "normal" },
        { src: `${origin}/fonts/amiri-bold.ttf`,    fontWeight: "bold",    fontStyle: "normal" },
        { src: `${origin}/fonts/amiri-italic.ttf`,  fontWeight: "normal",  fontStyle: "italic" },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
  }

  const printDate = new Date().toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric",
  });

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
