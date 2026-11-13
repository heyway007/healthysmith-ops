"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, errorMessage, numberOrDefault, zipLineItems } from "@/lib/forms";
import { currentEmployeeId } from "@/lib/employee-picker";
import { resolveSupplierIdByName } from "../supplier-picker";
import { statusForPaid } from "./status";
import {
  attachmentFilesFromForm,
  attachmentPathsForBills,
  removeAttachmentFiles,
  saveAttachments,
} from "./attachments";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function billHeaderBase(formData: FormData) {
  return {
    supplier_invoice_number: emptyToNull(formData.get("supplier_invoice_number")),
    invoice_number: emptyToNull(formData.get("invoice_number")),
    delivery_note_number: emptyToNull(formData.get("delivery_note_number")),
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

/** The purchase's line items and amount before VAT, per the form's "บันทึกแบบไหน" choice:
 *  - "attachment" (แนบรูป): no line items, the amount is typed in, and the
 *    purchase must end up with at least one photo/PDF (`savedFiles` already on
 *    it + `newFiles` being uploaded now);
 *  - "items" (กรอกรายละเอียด): the line-item table, as before. */
function billContentFromForm(formData: FormData, savedFiles: number, newFiles: number) {
  if (formData.get("entry_mode") === "attachment") {
    const subtotal = numberOrDefault(formData.get("amount"), 0);
    if (subtotal <= 0) throw new Error("กรุณากรอกยอดเงิน");
    if (savedFiles + newFiles === 0) throw new Error("กรุณาแนบรูปหรือ PDF ใบเสร็จอย่างน้อย 1 ไฟล์");
    return { items: [], subtotal };
  }
  const items = billItemsFromForm(formData);
  return { items, subtotal: subtotalOf(items) };
}

async function insertBillItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  billId: string,
  items: ReturnType<typeof billItemsFromForm>
) {
  if (items.length === 0) return;
  const { error } = await supabase
    .from("purchase_bill_items")
    .insert(items.map((item, index) => ({ purchase_bill_id: billId, sort_order: index, ...item })));
  if (error) throw error;
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
    const attachments = attachmentFilesFromForm(formData);
    const { items, subtotal } = billContentFromForm(formData, 0, attachments.length);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
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

    await insertBillItems(supabase, created.id, items);

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

    await saveAttachments(supabase, created.id, attachments, created_by);
  } catch (err) {
    if (newId) {
      await supabase.from("ap_payments").delete().eq("purchase_bill_id", newId);
      await supabase.from("purchase_bills").delete().eq("id", newId);
    }
    const message = errorMessage(err);
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

    const attachments = attachmentFilesFromForm(formData);
    const { count: savedFiles } = await supabase
      .from("purchase_bill_attachments")
      .select("id", { count: "exact", head: true })
      .eq("purchase_bill_id", id);
    const { items, subtotal } = billContentFromForm(formData, savedFiles ?? 0, attachments.length);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
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
    await insertBillItems(supabase, id, items);

    await saveAttachments(supabase, id, attachments, await currentEmployeeId(supabase));
  } catch (err) {
    const message = errorMessage(err);
    redirect(`/admin/purchase/bills/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePurchase();
  redirect("/admin/purchase/bills");
}

/** Deletes the purchase together with its payment records and photos. */
export async function deleteBill(id: string) {
  const supabase = await createClient();
  const photoPaths = await attachmentPathsForBills(supabase, [id]);
  const { error: paymentsError } = await supabase.from("ap_payments").delete().eq("purchase_bill_id", id);
  const { error } = paymentsError
    ? { error: paymentsError }
    : await supabase.from("purchase_bills").delete().eq("id", id);
  if (error) redirect(`/admin/purchase/bills?error=${encodeURIComponent(error.message)}`);
  await removeAttachmentFiles(photoPaths);
  revalidatePurchase();
  redirect("/admin/purchase/bills");
}

/** Removes one photo from a purchase (the record first, under RLS, then the files). */
export async function deleteBillAttachment(billId: string, attachmentId: string) {
  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("purchase_bill_attachments")
    .select("storage_path, thumb_path")
    .eq("id", attachmentId)
    .eq("purchase_bill_id", billId)
    .maybeSingle();
  if (attachment) {
    const { error } = await supabase.from("purchase_bill_attachments").delete().eq("id", attachmentId);
    if (error) redirect(`/admin/purchase/bills/${billId}?error=${encodeURIComponent(error.message)}`);
    await removeAttachmentFiles([attachment.storage_path, attachment.thumb_path].filter((p): p is string => !!p));
  }
  revalidatePath(`/admin/purchase/bills/${billId}`);
  revalidatePath("/admin/purchase/bills");
}
