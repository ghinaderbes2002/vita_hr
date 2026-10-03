"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWarehouseFormat, useWarehouseLookups } from "./shared";

// Each of the eight reports has its own shape, so rather than eight bespoke
// layouts this renders any JSON shape: a list of records becomes a table, a
// record's plain values become stat tiles, and nested lists/records become
// titled sections.
// Field names are translated where known (warehouse.reports.columns) and shown
// as readable words otherwise.

type Row = Record<string, unknown>;

const isRecord = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);
const isPrimitive = (v: unknown) => v === null || ["string", "number", "boolean", "undefined"].includes(typeof v);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;
// Codes that may look numeric but are never quantities.
const TEXT_KEYS = /(id|sku|documentNo|code)$/i;
// Echoes of the filters already on screen.
const HIDDEN_KEYS = new Set(["dateFrom", "dateTo"]);

// Namespaces whose keys are enum values that may show up as report cells.
const ENUM_NAMESPACES = [
  "warehouse.statuses",
  "warehouse.returns.types",
  "warehouse.stock.movementTypes",
  "warehouse.items.types",
  "warehouse.warehouses.types",
];

const humanize = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());

function useReportText() {
  const t = useTranslations();
  const locale = useLocale();
  const fmt = useWarehouseFormat();
  const { itemName, warehouseName } = useWarehouseLookups();

  const label = (key: string) =>
    t.has(`warehouse.reports.columns.${key}`) ? t(`warehouse.reports.columns.${key}`) : humanize(key);

  const value = (key: string, v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? t("common.yes") : t("common.no");
    if (typeof v === "number") return fmt.qty(v);
    if (typeof v === "string") {
      // Bare ids are resolved through the cached master lists.
      if (key === "itemId") return itemName(v);
      if (key === "warehouseId") return warehouseName(v);
      if (ISO_DATE.test(v)) return v.length > 10 ? fmt.dateTime(v) : fmt.date(v);
      // The returns summary may name a type without its _RETURN suffix.
      if (key === "returnType" && t.has(`warehouse.returns.types.${v}_RETURN`)) {
        return t(`warehouse.returns.types.${v}_RETURN`);
      }
      const ns = ENUM_NAMESPACES.find((n) => t.has(`${n}.${v}`));
      if (ns) return t(`${ns}.${v}`);
      // Decimals may arrive as strings.
      if (v.trim() !== "" && !Number.isNaN(Number(v)) && !TEXT_KEYS.test(key)) return fmt.qty(v);
      return v;
    }
    if (Array.isArray(v)) return String(v.length);
    if (isRecord(v)) {
      const name = (locale === "ar" && v.nameAr) || v.name || v.code || v.sku;
      if (typeof name === "string") return name;
      // A small map in a cell, e.g. totals per currency: "USD: 1,200 · SYP: 5,000,000".
      return Object.entries(v).map(([k, x]) => `${k}: ${value(k, x)}`).join(" · ");
    }
    return String(v);
  };

  return { label, value, empty: t("warehouse.reports.empty") };
}

/** Columns for a list of records: every key seen, minus ids that are noise. */
function columnsOf(rows: Row[]): string[] {
  const keys: string[] = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
  return keys.filter((k) => {
    if (k === "id") return false;
    // The Arabic name is folded into the name column.
    if (k === "nameAr" && keys.includes("name")) return false;
    // "itemId" next to "itemName" (and the like) is noise.
    if (/Id$/.test(k) && keys.includes(`${k.slice(0, -2)}Name`)) return false;
    // `itemId` is redundant next to an embedded `item`.
    if (/Id$/.test(k) && keys.includes(k.slice(0, -2))) return false;
    return true;
  });
}

function RecordsTable({ rows }: { rows: Row[] }) {
  const { label, value, empty } = useReportText();
  const locale = useLocale();
  // A record that itself holds a list (a warehouse with its variances, say)
  // cannot be a table row — each one becomes its own titled section instead.
  if (rows.length > 0 && rows.every((r) => Object.values(r).some(Array.isArray))) {
    return (
      <div className="space-y-6">
        {rows.map((r, i) => {
          const title = [r.warehouseName, r.name, r.documentNo].filter((x) => typeof x === "string").join(" — ");
          const rest = Object.fromEntries(Object.entries(r).filter(([k]) => !/Id$|^id$|Name$|^name$|^documentNo$/.test(k)));
          return <ReportView key={i} data={rest} title={title || undefined} />;
        })}
      </div>
    );
  }

  const columns = columnsOf(rows);

  if (rows.length === 0) {
    return <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => <TableHead key={c} className="whitespace-nowrap">{label(c)}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={typeof row.id === "string" ? row.id : i}>
              {columns.map((c) => (
                <TableCell key={c}>
                  {c === "name" && locale === "ar" && typeof row.nameAr === "string" && row.nameAr
                    ? row.nameAr
                    : value(c, row[c])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      {title && <h3 className="text-sm font-semibold">{title}</h3>}
      {children}
    </section>
  );
}

export function ReportView({ data, title }: { data: unknown; title?: string }) {
  const { label, value, empty } = useReportText();

  if (data === null || data === undefined) {
    return <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  if (Array.isArray(data)) {
    const records = data.filter(isRecord);
    return (
      <Section title={title}>
        {records.length === data.length ? (
          <RecordsTable rows={records} />
        ) : (
          <p className="text-sm">{data.map((v) => value("", v)).join("، ")}</p>
        )}
      </Section>
    );
  }

  if (isRecord(data)) {
    const entries = Object.entries(data).filter(([k]) => !HIDDEN_KEYS.has(k));
    const stats = entries.filter(([, v]) => isPrimitive(v));
    const nested = entries.filter(([, v]) => !isPrimitive(v));
    // A record made only of plain numbers (e.g. counts per status) reads
    // better as a two-column table than as a wall of tiles.
    const asBreakdown = !!title && nested.length === 0 && stats.length > 0;

    return (
      <Section title={title}>
        {asBreakdown ? (
          <div className="rounded-md border">
            <Table>
              <TableBody>
                {stats.map(([k, v]) => (
                  <TableRow key={k}>
                    {/* The keys here are often enum values (a count per status). */}
                    <TableCell className="text-muted-foreground">
                      {value("", k) === k ? label(k) : value("", k)}
                    </TableCell>
                    <TableCell className="font-medium">{value(k, v)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          stats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {stats.map(([k, v]) => (
                <Card key={k}>
                  <CardContent className="pt-4 pb-3">
                    <p className="mb-1 text-sm text-muted-foreground">{label(k)}</p>
                    <p className="text-xl font-bold break-words">{value(k, v)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
        {nested.map(([k, v]) => <ReportView key={k} data={v} title={label(k)} />)}
      </Section>
    );
  }

  return <p className="text-sm">{value("", data)}</p>;
}
