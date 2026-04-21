import * as XLSX from "xlsx";

export function downloadExcel(
  rows: Record<string, any>[],
  filename: string,
  sheetName = "Sheet1"
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function downloadExcelMultiSheet(
  sheets: { name: string; rows: Record<string, any>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
