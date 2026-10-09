"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

function revalidateSales() {
  revalidatePath("/admin/sales/orders");
  revalidatePath("/admin/sales/tax-invoices");
}

/** "สำนักงานใหญ่" for a VAT-registered buyer that didn't say otherwise. */
function defaultBranch(taxId: string | null, branch: string | null) {
  if (branch) return /^\d{1,5}$/.test(branch) ? (Number(branch) === 0 ? "สำนักงานใหญ่" : `สาขา ${branch.padStart(5, "0")}`) : branch;
  return taxId ? "สำนักงานใหญ่" : null;
}

/**
 * One tax invoice per selected order, using what the buyer gave when they
 * requested it (billing_*) or else the shipping name/address. Issued oldest
 * order first so the running numbers follow the dates.
 */
export async function issueTaxInvoicesPerOrder(
  orderIds: string[],
): Promise<{ issued: number; errors: string[] }> {
  const supabase = await createClient();
  const orders = [];
  for (let i = 0; i < orderIds.length; i += 200) {
    const { data } = await supabase
      .from("sales_orders")
      .select("*")
      .in("id", orderIds.slice(i, i + 200));
    orders.push(...(data ?? []));
  }
  orders.sort((a, b) => a.order_date.localeCompare(b.order_date) || a.order_number.localeCompare(b.order_number));

  let issued = 0;
  const errors: string[] = [];
  for (const o of orders) {
    const taxId = o.billing_tax_id?.replace(/\D/g, "") || null;
    const { error } = await supabase.rpc("issue_tax_invoice", {
      p_order_ids: [o.id],
      p_issue_date: o.order_date,
      p_buyer_name: o.billing_name ?? o.buyer_name ?? o.buyer_username ?? "ลูกค้าทั่วไป",
      p_buyer_tax_id: taxId,
      p_buyer_branch: defaultBranch(taxId, o.billing_branch),
      p_buyer_address: o.billing_address ?? o.shipping_address,
      p_buyer_phone: o.buyer_phone,
    });
    if (error) errors.push(`${o.external_order_id ?? o.order_number}: ${error.message}`);
    else issued++;
  }

  revalidateSales();
  return { issued, errors };
}

/** Issue one tax invoice for the order(s) on the form (single or combined). */
export async function createTaxInvoice(formData: FormData) {
  const supabase = await createClient();
  const orderIds = String(formData.get("order_ids") ?? "").split(",").filter(Boolean);
  const taxId = emptyToNull(formData.get("buyer_tax_id"))?.replace(/[\s-]/g, "") ?? null;

  const { data: id, error } = await supabase.rpc("issue_tax_invoice", {
    p_order_ids: orderIds,
    p_issue_date: String(formData.get("issue_date") ?? ""),
    p_buyer_name: String(formData.get("buyer_name") ?? "").trim(),
    p_buyer_tax_id: taxId,
    p_buyer_branch: defaultBranch(taxId, emptyToNull(formData.get("buyer_branch"))),
    p_buyer_address: emptyToNull(formData.get("buyer_address")),
    p_buyer_phone: emptyToNull(formData.get("buyer_phone")),
    p_customer_id: emptyToNull(formData.get("customer_id")),
    p_note: emptyToNull(formData.get("note")),
  });

  if (error || !id) {
    const msg = encodeURIComponent(error?.message ?? "ออกใบกำกับภาษีไม่สำเร็จ");
    redirect(`/admin/sales/tax-invoices/new?orders=${orderIds.join(",")}&error=${msg}`);
  }
  revalidateSales();
  redirect(`/admin/sales/tax-invoices/${id}`);
}

/** Tax invoices are never deleted: cancelling keeps the number (it isn't
 * reused) and frees the orders so a corrected one can be issued. */
export async function cancelTaxInvoice(id: string, formData: FormData) {
  const supabase = await createClient();
  const reason = emptyToNull(formData.get("cancel_reason"));
  if (!reason) redirect(`/admin/sales/tax-invoices/${id}?error=${encodeURIComponent("กรุณาระบุเหตุผลที่ยกเลิก")}`);

  const { error } = await supabase
    .from("tax_invoices")
    .update({ is_cancelled: true, cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq("id", id)
    .eq("is_cancelled", false);

  if (error) redirect(`/admin/sales/tax-invoices/${id}?error=${encodeURIComponent(error.message)}`);
  revalidateSales();
  redirect(`/admin/sales/tax-invoices/${id}`);
}
