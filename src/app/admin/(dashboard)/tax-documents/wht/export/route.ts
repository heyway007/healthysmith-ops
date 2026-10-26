import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRoles, getDocPermissions } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { canDoc } from "@/lib/doc-permissions";
import { parseDocFilters } from "@/lib/doc-list-filters";
import { logAuditEvent } from "@/lib/audit";
import { statusLabel, xlsxResponse } from "@/lib/xlsx-export";
import { WHT_FORM_TYPES, WHT_INCOME_TYPES } from "@/lib/wht";

const FORM = Object.fromEntries(WHT_FORM_TYPES.map((f) => [f.value, f.label]));
const INCOME = Object.fromEntries(WHT_INCOME_TYPES.map((t) => [t.key, t.short ?? t.label]));

// Excel export of 50 ทวิ certificates -- plus one row per income line, ready
// for preparing ภ.ง.ด.3 / ภ.ง.ด.53 -- with the same filters as the page.
export async function GET(request: NextRequest) {
  const [roles, perms] = await Promise.all([getCurrentRoles(), getDocPermissions()]);
  if (!canAccess(roles, ["purchase"]) || !canDoc(perms, "view")) return new Response("ไม่มีสิทธิ์", { status: 403 });

  const f = parseDocFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  let query = supabase
    .from("wht_certificates")
    .select("*")
    .gte("issue_date", f.from)
    .lte("issue_date", f.to)
    .order("issue_date")
    .order("certificate_number")
    .limit(10000);
  if (f.status === "active") query = query.eq("is_cancelled", false);
  if (f.status === "cancelled") query = query.eq("is_cancelled", true);
  if (f.status === "pending") query = query.eq("is_cancelled", false).not("cancel_requested_at", "is", null);
  if (f.q) query = query.or(["certificate_number", "payee_name", "payee_tax_id"].map((c) => `${c}.ilike.*${f.q}*`).join(","));
  const { data: certificates } = await query;
  const list = certificates ?? [];
  const byId = new Map(list.map((c) => [c.id, c]));

  const lines = [];
  for (let i = 0; i < list.length; i += 200) {
    const { data } = await supabase
      .from("wht_certificate_lines")
      .select("*")
      .in("certificate_id", list.slice(i, i + 200).map((c) => c.id))
      .order("sort_order");
    lines.push(...(data ?? []));
  }

  await logAuditEvent("data.export", {
    details: { document: "wht_certificates", period: f.label, status: f.status, q: f.q, rows: list.length },
  });

  return xlsxResponse(`หนังสือหัก-ณ-ที่จ่าย-${f.label}.xlsx`, [
    {
      name: "หนังสือรับรอง",
      columns: [
        { header: "เลขที่", key: "number", width: 12 },
        { header: "เล่มที่", key: "book", width: 8 },
        { header: "วันที่ออก", key: "date", width: 12 },
        { header: "แบบ", key: "form", width: 12 },
        { header: "ลำดับที่ในแบบ", key: "sequence", width: 12 },
        { header: "ผู้ถูกหักภาษี", key: "payee", width: 32 },
        { header: "ประเภท", key: "payee_type", width: 12 },
        { header: "เลขประจำตัวผู้เสียภาษี", key: "tax_id", width: 16 },
        { header: "ที่อยู่", key: "address", width: 40 },
        { header: "รวมเงินที่จ่าย", key: "paid", money: true },
        { header: "รวมภาษีที่หัก", key: "tax", money: true },
        { header: "สถานะ", key: "status", width: 14 },
        { header: "เหตุผลยกเลิก", key: "cancel_reason", width: 28 },
        { header: "ผู้ลงนาม", key: "signer", width: 22 },
        { header: "ออกโดย", key: "created_by", width: 24 },
        { header: "SHA-256", key: "hash", width: 20 },
      ],
      rows: list.map((c) => ({
        number: c.certificate_number,
        book: c.book_number,
        date: c.issue_date,
        form: FORM[c.form_type],
        sequence: c.sequence_label,
        payee: c.payee_name,
        payee_type: c.payee_type === "person" ? "บุคคลธรรมดา" : "นิติบุคคล",
        tax_id: c.payee_tax_id,
        address: c.payee_address,
        paid: c.total_paid,
        tax: c.total_tax,
        status: statusLabel(c),
        cancel_reason: c.cancel_reason ?? c.cancel_request_reason,
        signer: c.signer_name,
        created_by: c.created_by_email,
        hash: c.content_hash,
      })),
    },
    {
      name: "รายการเงินได้",
      columns: [
        { header: "เลขที่", key: "number", width: 12 },
        { header: "แบบ", key: "form", width: 12 },
        { header: "ผู้ถูกหักภาษี", key: "payee", width: 32 },
        { header: "เลขประจำตัวผู้เสียภาษี", key: "tax_id", width: 16 },
        { header: "ประเภทเงินได้", key: "type", width: 40 },
        { header: "ระบุ", key: "description", width: 20 },
        { header: "วันที่จ่าย", key: "pay_date", width: 12 },
        { header: "จำนวนเงินที่จ่าย", key: "amount", money: true },
        { header: "อัตรา %", key: "rate", width: 8 },
        { header: "ภาษีที่หัก", key: "tax", money: true },
        { header: "สถานะ", key: "status", width: 12 },
      ],
      rows: lines.map((l) => {
        const c = byId.get(l.certificate_id)!;
        return {
          number: c.certificate_number,
          form: FORM[c.form_type],
          payee: c.payee_name,
          tax_id: c.payee_tax_id,
          type: INCOME[l.income_type] ?? l.income_type,
          description: l.description,
          pay_date: l.pay_date,
          amount: l.amount,
          rate: l.amount ? Math.round((l.tax / l.amount) * 10000) / 100 : null,
          tax: l.tax,
          status: statusLabel(c),
        };
      }),
    },
  ]);
}
