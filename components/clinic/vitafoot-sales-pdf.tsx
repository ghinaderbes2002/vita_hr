// Client-only — imported via dynamic import() to avoid SSR issues.
// The VitaFoot sales list on the VitaFoot letterhead, as filtered on screen.
import React from "react";
import { Document, Image, Page, Text, View, pdf } from "@react-pdf/renderer";
import { freshCairoFamily, saveBlob } from "./pdf-kit";
import type { PodiatryCurrency, PodiatrySale } from "@/lib/api/clinic-podiatry";

export interface VitaFootSalesPdfData {
  sales: PodiatrySale[];
  /** Fitting-date filter in force, YYYY-MM-DD; empty when unset. */
  dateFrom?: string;
  dateTo?: string;
  /** Only viewers allowed to see costs get the two cost columns and the totals. */
  withCosts: boolean;
}

const LINE = "#808080";
const HEAD_BG = "#D9D9D9";
const CURRENCIES: PodiatryCurrency[] = ["USD", "SYP"];
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const fmtAmount = (v: number) => Number(v).toLocaleString("en-US");
const fmtMoney = (v: number, c: PodiatryCurrency) => (c === "USD" ? `$${fmtAmount(v)}` : `${fmtAmount(v)} ل.س`);
const PAGE = { fontSize: 10, color: "#000000", paddingTop: 113, paddingBottom: 99, paddingHorizontal: 30 };

const Cell = ({ width, children, bold, last }: {
  width: string; children: string; bold?: boolean; last?: boolean;
}) => (
  <View style={{
    width, justifyContent: "center", paddingVertical: 3, paddingHorizontal: 3,
    borderLeftWidth: last ? 0 : 0.5, borderLeftColor: LINE,
  }}>
    <Text style={{ textAlign: "center", fontSize: 8.5, fontWeight: bold ? "bold" : "normal" }}>{children}</Text>
  </View>
);

const lastCost = (s: PodiatrySale) =>
  s.insoleCost == null ? "—"
    : s.insoleCostCurrency ? fmtMoney(s.insoleCost, s.insoleCostCurrency)
      : `${fmtAmount(s.insoleCost)} (عملة غير محددة)`;
const totalCosts = (s: PodiatrySale) =>
  CURRENCIES.filter((c) => s.totalCosts?.[c] != null).map((c) => fmtMoney(s.totalCosts![c]!, c)).join(" + ") || "—";

export const VitaFootSalesDoc = ({ data, letterhead, fontFamily }: {
  data: VitaFootSalesPdfData; letterhead: string; fontFamily: string;
}) => {
  const cols = data.withCosts
    ? { n: "4%", number: "12%", name: "17%", insole: "9%", size: "7%", count: "8%", date: "11%", cost: "15%", total: "17%" }
    : { n: "5%", number: "16%", name: "27%", insole: "14%", size: "10%", count: "12%", date: "16%", cost: "0%", total: "0%" };
  const installs = data.sales.reduce((n, s) => n + (s.installCount ?? 0), 0);
  // Pounds and dollars are totalled apart, never summed together.
  const grand = CURRENCIES.map((c) => [c, data.sales.reduce((n, s) => n + (s.totalCosts?.[c] ?? 0), 0)] as const)
    .filter(([, v]) => v > 0);
  const summary = [
    { label: "عدد المرضى", value: String(data.sales.length) },
    { label: "عدد التركيبات", value: String(installs) },
    ...(data.withCosts
      ? [{ label: "إجمالي التكلفة", value: grand.map(([c, v]) => fmtMoney(v, c)).join(" + ") || "—" }]
      : []),
  ];
  return (
    <Document title="مبيعات فيتافوت">
      <Page size="A4" style={{ ...PAGE, fontFamily }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
        <Image fixed src={letterhead} style={{ position: "absolute", top: 0, left: 0, width: 595.28, height: 841.89 }} />

        <Text style={{ textAlign: "center", fontWeight: "bold", marginBottom: data.dateFrom || data.dateTo ? 2 : 14 }}>
          مبيعات فيتافوت
        </Text>
        {(data.dateFrom || data.dateTo) && (
          <Text style={{ textAlign: "center", fontSize: 9, marginBottom: 12 }}>
            {`فترة التركيب: ${fmt(data.dateFrom)} - ${fmt(data.dateTo)}`}
          </Text>
        )}

        <View fixed style={{ flexDirection: "row-reverse", backgroundColor: HEAD_BG, borderWidth: 0.5, borderColor: LINE }}>
          <Cell width={cols.n} bold>#</Cell>
          <Cell width={cols.number} bold>رقم المريض</Cell>
          <Cell width={cols.name} bold>الاسم</Cell>
          <Cell width={cols.insole} bold>نوع الضبان</Cell>
          <Cell width={cols.size} bold>المقاس</Cell>
          <Cell width={cols.count} bold>التركيبات</Cell>
          <Cell width={cols.date} bold last={!data.withCosts}>آخر تركيب</Cell>
          {data.withCosts && <Cell width={cols.cost} bold>تكلفة آخر تركيب</Cell>}
          {data.withCosts && <Cell width={cols.total} bold last>إجمالي التكلفة</Cell>}
        </View>
        {data.sales.map((s, i) => (
          <View
            key={s.patientId}
            wrap={false}
            style={{ flexDirection: "row-reverse", borderWidth: 0.5, borderTopWidth: 0, borderColor: LINE }}
          >
            <Cell width={cols.n}>{String(i + 1)}</Cell>
            <Cell width={cols.number}>{s.patientNumber || "—"}</Cell>
            <Cell width={cols.name}>{s.patientName || "—"}</Cell>
            <Cell width={cols.insole}>{s.insoleType?.join("، ") || "—"}</Cell>
            <Cell width={cols.size}>{s.shoeSize != null ? String(s.shoeSize) : "—"}</Cell>
            <Cell width={cols.count}>{String(s.installCount ?? 0)}</Cell>
            <Cell width={cols.date} last={!data.withCosts}>{fmt(s.installedAt)}</Cell>
            {data.withCosts && <Cell width={cols.cost}>{lastCost(s)}</Cell>}
            {data.withCosts && <Cell width={cols.total} last>{totalCosts(s)}</Cell>}
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 24, borderWidth: 0.5, borderColor: "#000000" }}>
          {summary.map((row, i) => (
            <View key={row.label} style={{ flexDirection: "row-reverse", borderTopWidth: i ? 0.5 : 0, borderTopColor: "#000000" }}>
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

export async function downloadVitaFootSalesPdf(data: VitaFootSalesPdfData): Promise<void> {
  const fontFamily = freshCairoFamily();
  const letterhead = `${window.location.origin}/assets/images/vitafoot-letterhead.jpg`;
  const blob = await pdf(<VitaFootSalesDoc data={data} letterhead={letterhead} fontFamily={fontFamily} />).toBlob();
  const range = [data.dateFrom, data.dateTo].filter(Boolean).join("_");
  saveBlob(blob, `vitafoot-sales${range ? `-${range}` : ""}.pdf`);
}
