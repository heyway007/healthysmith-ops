"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault, zipLineItems } from "@/lib/forms";
import { currentEmployeeId } from "@/lib/employee-picker";
import { resolveSupplierIdByName } from "../supplier-picker";
import { statusForPaid } from "./status";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function billHeaderBase(formData: FormData) {
  return {
    supplier_invoice_number: emptyToNull(formData.get("supplier_invoice_number")),
    bill_date: String(formData.get("bill_date") || "").trim() || today(),
    due_date: emptyToNull(formData.get("due_date")),
    note: emptyToNull(formData.get("note")),
  };
}

function billItemsFromForm(formData: FormData) {
  const items = zipLineItems(formData, ["description", "quantity", "unit_price"]).map((row) => ({
    description: row.description || null,
    quantity: numberOrDefault(row.quantity, 1),
    unit_price: numberOrDefault(row.unit_price, 0),
    discount_amount: 0,
  }));
  if (items.length === 0) throw new Error("กรุณาใส่รายการที่ซื้ออย่างน้อย 1 รายการ");
  return items;
}

function subtotalOf(items: { quantity: number; unit_price: number; discount_amount: number }[]) {
  return items.reduce((sum, i) => sum + i.quantity * i.unit_price - i.discount_amount, 0);
}

async function supplierIdFromForm(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData) {
  const supplier_id = await resolveSupplierIdByName(supabase, emptyToNull(formData.get("supplier_name")));
  if (!supplier_id) throw new Error("กรุณากรอกชื่อร้าน / ผู้ขาย");
  return supplier_id;
}

function revalidatePurchase() {
  revalidatePath("/admin/purchase/bills");
  revalidatePath("/admin/purchase/payables");
}

/** Records a purchase in one step. "จ่ายแล้ว" also logs the payment for the
 * full amount; "ยังไม่จ่าย" leaves it on the ค้างจ่าย list. */
export async function createBill(formData: FormData) {
  const supabase = await createClient();
  let newId: string | null = null;
  try {
    const items = billItemsFromForm(formData);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
    const subtotal = subtotalOf(items);
    const total_amount = subtotal + vat_amount;
    const paidNow = formData.get("payment_status") !== "unpaid";
    const paid_amount = paidNow ? total_amount : 0;
    const created_by = await currentEmployeeId(supabase);
    const supplier_id = await supplierIdFromForm(supabase, formData);
    const base = billHeaderBase(formData);

    const { data: created, error } = await supabase
      .from("purchase_bills")
      .insert({
        ...base,
        due_date: paidNow ? null : base.due_date,
        supplier_id,
        subtotal,
        discount_amount: 0,
        vat_amount,
        wht_amount: 0,
        total_amount,
        paid_amount,
        status: statusForPaid(paid_amount, total_amount),
        created_by,
      })
      .select("id")
      .single();
    if (error) throw error;
    newId = created.id;

    const { error: itemsError } = await supabase
      .from("purchase_bill_items")
      .insert(items.map((item, index) => ({ purchase_bill_id: created.id, sort_order: index, ...item })));
    if (itemsError) throw itemsError;

    if (paidNow && total_amount > 0) {
      const { error: paymentError } = await supabase.from("ap_payments").insert({
        supplier_id,
        purchase_bill_id: created.id,
        payment_date: base.bill_date,
        payment_method: String(formData.get("payment_method") || "cash"),
        amount: total_amount,
        created_by,
      });
      if (paymentError) throw paymentError;
    }
  } catch (err) {
    if (newId) {
      await supabase.from("ap_payments").delete().eq("purchase_bill_id", newId);
      await supabase.from("purchase_bills").delete().eq("id", newId);
    }
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/bills/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePurchase();
  redirect("/admin/purchase/bills");
}

export async function updateBill(id: string, formData: FormData) {
  const supabase = await createClient();
  try {
    const { data: current } = await supabase
      .from("purchase_bills")
      .select("paid_amount, wht_amount")
      .eq("id", id)
      .single();
    if (!current) throw new Error("ไม่พบรายการซื้อ");

    const items = billItemsFromForm(formData);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
    const subtotal = subtotalOf(items);
    // wht_amount is no longer entered, but keep it on older records that have it
    const total_amount = subtotal + vat_amount - current.wht_amount;
    if (current.paid_amount > total_amount + 1e-9) {
      throw new Error(
        `ยอดรวมใหม่ (${total_amount.toLocaleString()}) น้อยกว่ายอดที่จ่ายไปแล้ว (${current.paid_amount.toLocaleString()})`
      );
    }
    const supplier_id = await supplierIdFromForm(supabase, formData);

    const { error } = await supabase
      .from("purchase_bills")
      .update({
        ...billHeaderBase(formData),
        supplier_id,
        subtotal,
        discount_amount: 0,
        vat_amount,
        total_amount,
        status: statusForPaid(current.paid_amount, total_amount),
      })
      .eq("id", id);
    if (error) throw error;

    await supabase.from("purchase_bill_items").delete().eq("purchase_bill_id", id);
    const { error: itemsError } = await supabase
      .from("purchase_bill_items")
      .insert(items.map((item, index) => ({ purchase_bill_id: id, sort_order: index, ...item })));
    if (itemsError) throw itemsError;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/bills/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePurchase();
  redirect("/admin/purchase/bills");
}

/** Deletes the purchase together with its payment records. */
export async function deleteBill(id: string) {
  const supabase = await createClient();
  const { error: paymentsError } = await supabase.from("ap_payments").delete().eq("purchase_bill_id", id);
  const { error } = paymentsError
    ? { error: paymentsError }
    : await supabase.from("purchase_bills").delete().eq("id", id);
  if (error) redirect(`/admin/purchase/bills?error=${encodeURIComponent(error.message)}`);
  revalidatePurchase();
  redirect("/admin/purchase/bills");
}
