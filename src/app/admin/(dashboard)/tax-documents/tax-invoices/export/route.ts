import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRoles, getDocPermissions } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { canDoc } from "@/lib/doc-permissions";
import { parseDocFilters } from "@/lib/doc-list-filters";
import { logAuditEvent } from "@/lib/audit";
import { statusLabel, xlsxResponse } from "@/lib/xlsx-export";

// Excel export of the tax invoice list, with the same filters as the page.
export async function GET(request: NextRequest) {
  const [roles, perms] = await Promise.all([getCurrentRoles(), getDocPermissions()]);
  if (!canAccess(roles, ["sales"]) || !canDoc(perms, "view")) return new Response("ไม่มีสิทธิ์", { status: 403 });

  const f = parseDocFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  let query = supabase
    .from("tax_invoice_list")
    .select("*")
    .gte("issue_date", f.from)
    .lte("issue_date", f.to)
    .order("tax_invoice_number")
    .limit(10000);
  if (f.status === "active") query = query.eq("is_cancelled", false);
  if (f.status === "cancelled") query = query.eq("is_cancelled", true);
  if (f.status === "pending") query = query.eq("is_cancelled", false).not("cancel_requested_at", "is", null);
  if (f.q) query = query.or(["tax_invoice_number", "buyer_name", "buyer_tax_id", "order_refs"].map((c) => `${c}.ilike.*${f.q}*`).join(","));
  const { data: invoices } = await query;
  const list = invoices ?? [];
  const numberById = new Map(list.map((t) => [t.id, t.tax_invoice_number]));

  const items = [];
  for (let i = 0; i < list.length; i += 200) {
    const { data } = await supabase
      .from("tax_invoice_items")
      .select("*")
      .in("tax_invoice_id", list.slice(i, i + 200).map((t) => t.id))
      .order("sort_order");
    items.push(...(data ?? []));
  }

  await logAuditEvent("data.export", {
    details: { document: "tax_invoices", period: f.label, status: f.status, q: f.q, rows: list.length },
  });

  return xlsxResponse(`ใบกำกับภาษี-${f.label}.xlsx`, [
    {
      name: "ใบกำกับภาษี",
      columns: [
        { header: "เลขที่", key: "number", width: 14 },
        { header: "วันที่", key: "date", width: 12 },
        { header: "ผู้ซื้อ", key: "buyer", width: 32 },
        { header: "เลขประจำตัวผู้เสียภาษี", key: "tax_id", width: 16 },
        { header: "สาขา", key: "branch", width: 14 },
        { header: "ที่อยู่", key: "address", width: 40 },
        { header: "มูลค่าก่อน VAT", key: "net", money: true },
        { header: "VAT 7%", key: "vat", money: true },
        { header: "ยอดรวม", key: "total", money: true },
        { header: "สถานะ", key: "status", width: 14 },
        { header: "เหตุผลยกเลิก", key: "cancel_reason", width: 28 },
        { header: "ยกเลิกโดย", key: "cancelled_by", width: 24 },
        { header: "ฉบับแก้ไขของเลขที่", key: "replaces", width: 14 },
        { header: "แก้ไขเป็นเลขที่", key: "replaced_by", width: 14 },
        { header: "อ้างอิงออเดอร์", key: "orders", width: 28 },
        { header: "ออกโดย", key: "created_by", width: 24 },
        { header: "ออกเมื่อ", key: "created_at", width: 20 },
        { header: "SHA-256", key: "hash", width: 20 },
      ],
      rows: list.map((t) => ({
        number: t.tax_invoice_number,
        date: t.issue_date,
        buyer: t.buyer_name,
        tax_id: t.buyer_tax_id,
        branch: t.buyer_branch,
        address: t.buyer_address,
        net: Math.round((t.total_amount - t.vat_amount) * 100) / 100,
        vat: t.vat_amount,
        total: t.total_amount,
        status: statusLabel(t),
        cancel_reason: t.cancel_reason ?? t.cancel_request_reason,
        cancelled_by: t.cancelled_by,
        replaces: t.replaces_id ? (numberById.get(t.replaces_id) ?? t.replaces_id) : null,
        replaced_by: t.replaced_by_id ? (numberById.get(t.replaced_by_id) ?? t.replaced_by_id) : null,
        orders: t.order_refs,
        created_by: t.created_by_email,
        created_at: new Date(t.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
        hash: t.content_hash,
      })),
    },
    {
      name: "รายการสินค้า",
      columns: [
        { header: "เลขที่ใบกำกับ", key: "number", width: 14 },
        { header: "ลำดับ", key: "seq", width: 8 },
        { header: "รายการ", key: "description", width: 40 },
        { header: "จำนวน", key: "quantity", width: 10 },
        { header: "ราคา/หน่วย", key: "unit_price", money: true },
        { header: "ส่วนลด", key: "discount", money: true },
        { header: "จำนวนเงิน", key: "amount", money: true },
      ],
      rows: items.map((i) => ({
        number: numberById.get(i.tax_invoice_id),
        seq: i.sort_order,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount_amount,
        amount: i.amount,
      })),
    },
  ]);
}
