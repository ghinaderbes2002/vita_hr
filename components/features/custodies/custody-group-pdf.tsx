// Client-only — imported via dynamic import() to avoid SSR issues.
//
// Two sheets share this document:
//   record    — سجل العهد الوظيفية: the full record, landscape, with the status
//               column and per-status counts.
//   clearance — براءة ذمة: the handover sheet, portrait, no status anywhere, and
//               an approvals block (اللوجستي / المحاسب / المدير الإداري) signed
//               by hand.
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, pdf,
} from "@react-pdf/renderer";
import { ar, ensureAmiriFonts, saveBlob } from "@/components/clinic/pdf-kit";
import { Custody } from "@/types";

// ── Theme ─────────────────────────────────────────────────────────────────────
const BRAND       = "#1e3a5f";
const BRAND_LIGHT = "#e8edf4";
const TEXT        = "#111827";
const MUTED       = "#6b7280";
const BORDER      = "#cbd5e1";

// ── Text direction ────────────────────────────────────────────────────────────
// Two rules, and the sheet is only legible when both hold:
//
// 1. `direction` on the Page style drives flex layout only — it is NOT inherited
//    by Text for bidi purposes. Without `direction: "rtl"` on the Text style
//    itself the renderer lays Arabic and Latin runs out left-to-right in logical
//    order, which is what scrambled strings like "موبايل Samsung (اللون أسود
//    ذاكرة 128GB)". With it, the full bidi algorithm runs: runs are ordered
//    right-to-left and brackets are mirrored.
// 2. Arabic must be pre-shaped with ar() — the same Amiri + presentation-forms
//    path the clinic PDFs use. Shaping Arabic through the font's own GSUB
//    ligature tables makes @react-pdf/textkit 6.x crash inside reorderLine
//    ("Cannot read properties of undefined (reading 'id')") on any word with a
//    connected alef — إلكترونيات، مع الموظف، تالفة… — as soon as bidi reordering
//    is requested. Presentation forms carry no ligature glyphs, so the crash
//    cannot happen. This is why the sheet is set in Amiri, not Cairo: Cairo is
//    missing ~550 of the presentation forms and would render them as blanks.
//
// LTR is used for the columns that are always Latin or numeric.
const RTL = { direction: "rtl" as any };
const LTR = { direction: "ltr" as any };

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Page ──
  page: {
    fontFamily: "Amiri",
    fontSize: 10,
    color: TEXT,
    paddingTop: 66,
    paddingBottom: 44,
    paddingHorizontal: 28,
    ...RTL,
    textAlign: "right",
    backgroundColor: "#ffffff",
  },
  header: {
    position: "absolute",
    top: 14,
    left: 28,
    right: 28,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 6,
  },
  headerTitle: { ...RTL, fontSize: 14, fontWeight: "bold", color: BRAND },
  headerDate:  { ...LTR, fontSize: 8, color: MUTED },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  footerText: { ...RTL, fontSize: 7.5, color: MUTED },
  footerPage: { ...LTR, fontSize: 7.5, color: MUTED },

  // ── Employee card ──
  empCard: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    borderRightWidth: 4,
    borderRightColor: BRAND,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 20,
  },
  empItem:     { alignItems: "center", gap: 1 },
  empLabel:    { ...RTL, fontSize: 8, color: BRAND, fontWeight: "bold", textAlign: "center" },
  empValueAr:  { ...RTL, fontSize: 10, color: TEXT, textAlign: "center" },
  empValueLtr: { ...LTR, fontSize: 10, color: TEXT, textAlign: "center" },
  empValueNum: { ...LTR, fontSize: 11, color: TEXT, fontWeight: "bold", textAlign: "center" },

  // ── Table ──
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
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 5,
    minHeight: 20,
  },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  th:       { ...RTL, fontSize: 8.5, color: "#ffffff", fontWeight: "bold" },
  thCenter: { ...RTL, fontSize: 8.5, color: "#ffffff", fontWeight: "bold", textAlign: "center" },
  // Column widths. The status column exists on the record sheet only, so on the
  // clearance sheet the remaining columns simply share the freed space.
  colNum:    { width: 22 },
  colName:   { flex: 3.4 },
  colCat:    { flex: 1.3 },
  colSerial: { flex: 1.9 },
  colDate:   { flex: 1.3 },
  colStatus: { flex: 1.3 },
  tdNum:    { ...LTR, fontSize: 8.5, color: MUTED, textAlign: "center" },
  tdName:   { ...RTL, fontSize: 9, color: TEXT, lineHeight: 1.5, textAlign: "right" },
  tdDesc:   { ...RTL, fontSize: 8, color: MUTED, lineHeight: 1.5, textAlign: "right", marginTop: 1 },
  tdCat:    { ...RTL, fontSize: 9, color: MUTED, textAlign: "right" },
  tdSerial: { ...LTR, fontSize: 8.5, color: MUTED, textAlign: "right" },
  tdDate:   { ...LTR, fontSize: 8.5, color: MUTED, textAlign: "center" },
  tdStatus: { ...RTL, fontSize: 9, textAlign: "center" },
  statusWith:     { color: "#0f6624" },
  statusReturned: { color: "#6b7280" },
  statusDamaged:  { color: "#b45309" },
  statusLost:     { color: "#dc2626" },

  // ── Acknowledgment & signature ──
  ackText: { ...RTL, fontSize: 8.5, color: TEXT, lineHeight: 1.7, textAlign: "right" },
  // The record sheet pins these to the bottom of the page; the clearance sheet
  // lets them flow after the table so the approvals block below always has room.
  ackPinned:       { position: "absolute", bottom: 92, left: 28, right: 28 },
  signPinned:      { position: "absolute", bottom: 38, left: 28, width: 180, alignItems: "center" },
  signPinnedLabel: { ...RTL, fontSize: 9.5, color: TEXT },
  signPinnedLine:  { borderBottomWidth: 1, borderBottomColor: TEXT, width: "100%", marginTop: 26 },

  // ── Clearance approvals ──
  approvals:     { marginTop: 16 },
  rule:          { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 14, marginBottom: 10 },
  checkboxRow:   { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 12 },
  checkbox:      { width: 11, height: 11, borderWidth: 1, borderColor: TEXT, borderRadius: 2 },
  checkboxLabel: { ...RTL, fontSize: 10.5, fontWeight: "bold", color: TEXT },
  signoffBlock:  { marginBottom: 12 },
  fieldRow:      { flexDirection: "row-reverse", alignItems: "flex-end", gap: 6, marginBottom: 9 },
  // A fixed label width keeps every notes and signature line starting at the
  // same x, so the block reads as a column of aligned fields.
  fieldLabel: { ...RTL, width: 96, fontSize: 9.5, color: TEXT, textAlign: "right" },
  notesLine:  { flex: 1, borderBottomWidth: 0.75, borderBottomColor: BORDER, height: 12 },
  signLine:   { width: 190, borderBottomWidth: 0.75, borderBottomColor: TEXT, height: 12 },
});

// ── Copy ──────────────────────────────────────────────────────────────────────
// One <Text> per clause rather than a single paragraph, so each clause breaks
// cleanly and stays legible at 8.5pt.
const ACKNOWLEDGMENT_LINES = [
  "«أقرّ أنا الموقّع أدناه بأنني استلمت المواد المبيّنة في هذا النموذج وهي بحالة سليمة،",
  "وأتحمل المسؤولية الكاملة عن المحافظة عليها واستخدامها وفق الأنظمة والتعليمات المعتمدة.",
  "كما أقرّ بتحمّل مسؤولية أي تلف أو فقدان أو سوء استخدام قد يلحق بهذه المواد طوال فترة وجودها في عهدتي،",
  "وألتزم بإعادتها عند الطلب بحالة جيدة قدر الإمكان، مع علمي بخضوعي للإجراءات الإدارية أو المالية المترتبة في حال الإخلال بما ورد أعلاه.»",
];

// The clearance sheet states the reverse: everything has been handed back.
const CLEARANCE_LINES = [
  "أقرّ أنا الموقّع أدناه بأنني سلّمت كافة العهد اللوجستية الموضّحة أعلاه",
  "والذمم المالية المترتبة عليّ.",
];

// Each approver signs off in turn, with room for a remark above the signature.
const CLEARANCE_SIGNOFFS = ["اللوجستي", "المحاسب", "المدير الإداري"];

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d.slice(0, 10);
}

/** Latin/numeric cell value — no pre-shaping needed, just a dash when empty. */
const num = (v?: string | number | null) =>
  v == null || String(v).trim() === "" ? "—" : String(v);

/** One notes line above one signature line, e.g. توقيع اللوجستي. */
function SignoffFields({ role }: { role: string }) {
  return (
    <View style={S.signoffBlock} wrap={false}>
      <View style={S.fieldRow}>
        <Text style={S.fieldLabel}>{ar("ملاحظات:")}</Text>
        <View style={S.notesLine} />
      </View>
      <View style={S.fieldRow}>
        <Text style={S.fieldLabel}>{ar(`توقيع ${role}:`)}</Text>
        <View style={S.signLine} />
      </View>
    </View>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

/**
 * `record` = سجل العهد الوظيفية — landscape, status column, status counts.
 * `clearance` = براءة ذمة — portrait, no status, approvals block.
 */
export type CustodyPdfVariant = "record" | "clearance";

interface PdfData {
  employeeName: string;
  employeeNumber?: string;
  department?: string;
  custodies: Custody[];
  printDate: string;
  variant: CustodyPdfVariant;
}

function CustodyPdfDoc({ data }: { data: PdfData }) {
  const isClearance = data.variant === "clearance";
  const title = isClearance ? "براءة ذمة" : "سجل العهد الوظيفية";

  const counts = [
    { label: "مع الموظف", status: "WITH_EMPLOYEE", color: "#0f6624" },
    { label: "تم إرجاعها", status: "RETURNED",      color: "#6b7280" },
    { label: "تالفة",      status: "DAMAGED",       color: "#b45309" },
    { label: "مفقودة",     status: "LOST",          color: "#dc2626" },
  ]
    .map((x) => ({ ...x, val: data.custodies.filter((c) => c.status === x.status).length }))
    .filter((x) => x.val > 0);

  return (
    <Document>
      <Page size="A4" orientation={isClearance ? "portrait" : "landscape"} style={S.page}>
        {/* ── Header ── */}
        <View style={S.header} fixed>
          <Text style={S.headerTitle}>{ar(title)}</Text>
          <Text style={S.headerDate}>{data.printDate}</Text>
        </View>

        {/* ── Employee card ── */}
        <View style={S.empCard}>
          <View style={S.empItem}>
            <Text style={S.empLabel}>{ar("اسم الموظف")}</Text>
            <Text style={S.empValueAr}>{ar(data.employeeName)}</Text>
          </View>
          {data.employeeNumber && (
            <View style={S.empItem}>
              <Text style={S.empLabel}>{ar("الرقم الوظيفي")}</Text>
              <Text style={S.empValueLtr}>{data.employeeNumber}</Text>
            </View>
          )}
          {data.department && (
            <View style={S.empItem}>
              <Text style={S.empLabel}>{ar("القسم")}</Text>
              <Text style={S.empValueAr}>{ar(data.department)}</Text>
            </View>
          )}
          <View style={S.empItem}>
            <Text style={S.empLabel}>{ar("إجمالي العهد")}</Text>
            <Text style={S.empValueNum}>{data.custodies.length}</Text>
          </View>
          {/* Status counts belong to the record sheet only. */}
          {!isClearance && counts.map((x) => (
            <View key={x.label} style={S.empItem}>
              <Text style={S.empLabel}>{ar(x.label)}</Text>
              <Text style={[S.empValueNum, { color: x.color }]}>{x.val}</Text>
            </View>
          ))}
        </View>

        {/* ── Table ── */}
        <View style={S.tableHeader} fixed>
          <Text style={[S.thCenter, S.colNum]}>{ar("م")}</Text>
          <Text style={[S.th, S.colName]}>{ar("اسم الأصل")}</Text>
          <Text style={[S.th, S.colCat]}>{ar("الفئة")}</Text>
          <Text style={[S.th, S.colSerial]}>{ar("الرقم التسلسلي")}</Text>
          <Text style={[S.thCenter, S.colDate]}>{ar("تاريخ التسليم")}</Text>
          {!isClearance && <Text style={[S.thCenter, S.colStatus]}>{ar("الحالة")}</Text>}
        </View>

        {data.custodies.map((c, i) => (
          <View key={c.id} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
            <Text style={[S.tdNum, S.colNum]}>{i + 1}</Text>
            {/* Description on its own line rather than in brackets after the
                name — the cell is narrow and the two read far better stacked. */}
            <View style={S.colName}>
              <Text style={S.tdName}>{ar(c.name)}</Text>
              {c.description ? <Text style={S.tdDesc}>{ar(c.description)}</Text> : null}
            </View>
            <Text style={[S.tdCat, S.colCat]}>{ar(CAT_LABEL[c.category] ?? c.category)}</Text>
            <Text style={[S.tdSerial, S.colSerial]}>{num(c.serialNumber)}</Text>
            <Text style={[S.tdDate, S.colDate]}>{fmtDate(c.assignedDate)}</Text>
            {!isClearance && (
              <Text style={[S.tdStatus, S.colStatus, STATUS_STYLE[c.status] ?? {}]}>
                {ar(STATUS_LABEL[c.status] ?? c.status)}
              </Text>
            )}
          </View>
        ))}

        {isClearance ? (
          /* ── Clearance: acknowledgment, employee signature, approvals ── */
          <View style={S.approvals}>
            {CLEARANCE_LINES.map((line, i) => (
              <Text key={i} style={S.ackText}>{ar(line)}</Text>
            ))}

            <View style={[S.fieldRow, { marginTop: 14 }]} wrap={false}>
              <Text style={S.fieldLabel}>{ar("توقيع الموظف:")}</Text>
              <View style={S.signLine} />
            </View>

            <View style={S.rule} />

            <View style={S.checkboxRow} wrap={false}>
              <View style={S.checkbox} />
              <Text style={S.checkboxLabel}>{ar("بريء الذمة")}</Text>
            </View>

            {CLEARANCE_SIGNOFFS.map((role) => (
              <SignoffFields key={role} role={role} />
            ))}
          </View>
        ) : (
          <>
            {/* ── Acknowledgment ── */}
            <View style={S.ackPinned}>
              {ACKNOWLEDGMENT_LINES.map((line, i) => (
                <Text key={i} style={S.ackText}>{ar(line)}</Text>
              ))}
            </View>

            {/* ── Employee signature ── */}
            <View style={S.signPinned}>
              <Text style={S.signPinnedLabel}>{ar("توقيع الموظف")}</Text>
              <View style={S.signPinnedLine} />
            </View>
          </>
        )}

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>{`${ar(title)} — Vita HR`}</Text>
          <Text
            style={S.footerPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ── Export function ───────────────────────────────────────────────────────────

export async function downloadCustodyGroupPdf(
  custodies: Custody[],
  employee: { name: string; number?: string; department?: string },
  variant: CustodyPdfVariant = "record",
): Promise<void> {
  ensureAmiriFonts();

  const now = new Date();
  const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const blob = await pdf(
    <CustodyPdfDoc data={{
      employeeName:   employee.name,
      employeeNumber: employee.number,
      department:     employee.department,
      custodies,
      printDate,
      variant,
    }} />
  ).toBlob();

  const prefix = variant === "clearance" ? "clearance" : "custodies";
  saveBlob(blob, `${prefix}-${employee.name.replace(/\s+/g, "-")}.pdf`);
}
