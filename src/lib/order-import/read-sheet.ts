// Server-side only (exceljs is a Node library) -- imported from server actions.
import ExcelJS from "exceljs";

export type Cell = string | number | Date | null;
export type SheetRow = Cell[];

/** Reads the first worksheet of an .xlsx file, or a .csv file, into raw rows. */
export async function readSheet(file: File): Promise<SheetRow[]> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCsv(new TextDecoder("utf-8").decode(buffer));
  if (name.endsWith(".xls")) {
    throw new Error("ไฟล์ .xls แบบเก่ายังไม่รองรับ — กรุณาเปิดแล้วบันทึกเป็น .xlsx หรือ .csv ก่อน");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: SheetRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: SheetRow = [];
    for (let c = 1; c <= row.cellCount; c++) values.push(cellValue(row.getCell(c).value));
    rows.push(values);
  });
  return rows;
}

function cellValue(v: ExcelJS.CellValue): Cell {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number") return v;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return cellValue(v.result as ExcelJS.CellValue);
    if ("error" in v) return null;
  }
  return String(v);
}

/** RFC-4180-ish CSV: quoted fields, escaped quotes, newlines inside quotes, BOM. */
export function parseCsv(text: string): SheetRow[] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.indexOf("\n") >>> 0);
  const delimiter = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";

  const rows: SheetRow[] = [];
  let row: SheetRow = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "" && f !== null)) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== "" && f !== null)) rows.push(row);
  return rows;
}
