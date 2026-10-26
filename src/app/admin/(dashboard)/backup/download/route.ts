import { createClient } from "@/lib/supabase/server";
import { getCurrentRoles } from "@/lib/current-role";
import { logAuditEvent } from "@/lib/audit";
import { bangkokToday } from "@/lib/thai-money";
import { xlsxResponse, type Sheet } from "@/lib/xlsx-export";

// Full copy of the tax-document data (admin only): every column of every
// row, cancelled ones included, plus the documents' audit history.

type Row = Record<string, unknown>;
type Page = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

/** Reads every row, 1,000 at a time (PostgREST's page limit). */
async function fetchAll(page: (from: number, to: number) => Page) {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) return rows;
  }
}

function sheetOf(name: string, rows: Row[]): Sheet {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return { name, columns: keys.map((k) => ({ header: k, key: k, width: Math.min(40, Math.max(10, k.length + 2)) })), rows };
}

export async function GET() {
  const roles = await getCurrentRoles();
  if (!roles.includes("admin")) return new Response("เฉพาะผู้ดูแลระบบ", { status: 403 });

  const s = await createClient();
  const sheets = [
    sheetOf("บริษัท", await fetchAll((a, b) => s.from("companies").select("*").range(a, b))),
    sheetOf("ใบกำกับภาษี", await fetchAll((a, b) => s.from("tax_invoices").select("*").order("tax_invoice_number").range(a, b))),
    sheetOf("รายการใบกำกับภาษี", await fetchAll((a, b) => s.from("tax_invoice_items").select("*").range(a, b))),
    sheetOf("ออเดอร์ในใบกำกับภาษี", await fetchAll((a, b) => s.from("tax_invoice_orders").select("*").range(a, b))),
    sheetOf("หนังสือหัก ณ ที่จ่าย", await fetchAll((a, b) => s.from("wht_certificates").select("*").order("issue_date").range(a, b))),
    sheetOf("รายการเงินได้ 50 ทวิ", await fetchAll((a, b) => s.from("wht_certificate_lines").select("*").range(a, b))),
    sheetOf(
      "ประวัติเอกสาร",
      await fetchAll((a, b) =>
        s
          .from("audit_logs")
          .select("*")
          .in("table_name", ["tax_invoices", "tax_invoice_orders", "wht_certificates", "companies"])
          .order("id")
          .range(a, b),
      ),
    ),
  ];

  await logAuditEvent("data.backup", { details: Object.fromEntries(sheets.map((x) => [x.name, x.rows.length])) });
  return xlsxResponse(`backup-เอกสารภาษี-${bangkokToday()}.xlsx`, sheets);
}
