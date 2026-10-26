// Server-side only (exceljs is a Node library): build an .xlsx download for
// the document exports and backups.
import ExcelJS from "exceljs";

export type Sheet = {
  name: string;
  columns: { header: string; key: string; width?: number; money?: boolean }[];
  rows: Record<string, unknown>[];
};

export async function xlsxResponse(filename: string, sheets: Sheet[]) {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = s.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 16,
      style: c.money ? { numFmt: "#,##0.00" } : undefined,
    }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } };
    for (const r of s.rows) {
      ws.addRow(
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, v != null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v]),
        ),
      );
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.columns.length } };
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

export const statusLabel = (d: { is_cancelled: boolean; cancel_requested_at: string | null }) =>
  d.is_cancelled ? "ยกเลิก" : d.cancel_requested_at ? "รออนุมัติยกเลิก" : "ใช้งาน";
