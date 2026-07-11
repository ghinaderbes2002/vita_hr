import * as XLSX from "xlsx";

interface ExcelOptions {
  sheetName?: string;
  // Right-to-left sheet direction (columns run right→left) — for Arabic sheets.
  rtl?: boolean;
}

// Auto-size each column to the widest value (header or any cell) it holds,
// clamped to a sensible min/max so nothing is unreadably narrow or absurdly wide.
function autoFitColumns(rows: Record<string, any>[]): XLSX.ColInfo[] {
  const widths = new Map<string, number>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const cell = row[key];
      const len = cell == null ? 0 : String(cell).length;
      widths.set(key, Math.max(widths.get(key) ?? key.length, len));
    }
  }
  return [...widths.values()].map((w) => ({ wch: Math.min(Math.max(w + 2, 8), 60) }));
}

function makeSheet(rows: Record<string, any>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoFitColumns(rows);
  return ws;
}

// SheetJS 0.18.x writes right-to-left only from the workbook-level view
// (`wb.Workbook.Views[0].RTL`) — the per-sheet `ws["!views"]` RTL flag is
// silently dropped on write in this version.
function applyRtl(wb: XLSX.WorkBook) {
  wb.Workbook = { ...wb.Workbook, Views: [{ RTL: true }] };
}

export function downloadExcel(
  rows: Record<string, any>[],
  filename: string,
  sheetNameOrOptions: string | ExcelOptions = "Sheet1"
) {
  const opts: ExcelOptions =
    typeof sheetNameOrOptions === "string" ? { sheetName: sheetNameOrOptions } : sheetNameOrOptions;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), opts.sheetName ?? "Sheet1");
  if (opts.rtl) applyRtl(wb);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function downloadExcelMultiSheet(
  sheets: { name: string; rows: Record<string, any>[] }[],
  filename: string,
  opts: { rtl?: boolean } = {}
) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    XLSX.utils.book_append_sheet(wb, makeSheet(rows), name);
  }
  if (opts.rtl) applyRtl(wb);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
