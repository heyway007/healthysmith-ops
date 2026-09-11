"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault, zipLineItems } from "@/lib/forms";
import { currentEmployeeId } from "@/lib/employee-picker";
import { resolveSupplierIdByName } from "../supplier-picker";

function billHeaderBase(formData: FormData) {
  return {
    purchase_order_id: emptyToNull(formData.get("purchase_order_id")),
    supplier_invoice_number: emptyToNull(formData.get("supplier_invoice_number")),
    bill_date:
      String(formData.get("bill_date") || "").trim() || new Date().toISOString().slice(0, 10),
    due_date: emptyToNull(formData.get("due_date")),
    note: emptyToNull(formData.get("note")),
  };
}

function billItemsFromForm(formData: FormData) {
  return zipLineItems(formData, ["description", "quantity", "unit_price", "discount_amount"]).map(
    (row) => ({
      description: row.description || null,
      quantity: numberOrDefault(row.quantity, 1),
      unit_price: numberOrDefault(row.unit_price, 0),
      discount_amount: numberOrDefault(row.discount_amount, 0),
    })
  );
}

function computeTotals(
  items: { quantity: number; unit_price: number; discount_amount: number }[],
  vatAmount: number,
  whtAmount: number
) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price - i.discount_amount, 0);
  return { subtotal, total_amount: subtotal + vatAmount - whtAmount };
}

export async function createBill(formData: FormData) {
  const supabase = await createClient();
  let newId: string | null = null;
  try {
    const items = billItemsFromForm(formData);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
    const wht_amount = numberOrDefault(formData.get("wht_amount"), 0);
    const { subtotal, total_amount } = computeTotals(items, vat_amount, wht_amount);
    const created_by = await currentEmployeeId(supabase);
    const supplier_id = await resolveSupplierIdByName(
      supabase,
      emptyToNull(formData.get("supplier_name"))
    );
    if (!supplier_id) throw new Error("กรุณากรอกชื่อซัพพลายเออร์");
    const base = billHeaderBase(formData);

    const header = {
      ...base,
      supplier_id,
      subtotal,
      discount_amount: 0,
      vat_amount,
      wht_amount,
      total_amount,
      paid_amount: 0,
      created_by,
    };
    const { data: created, error } = await supabase
      .from("purchase_bills")
      .insert(header)
      .select("id")
      .single();
    if (error) throw error;
    newId = created.id;

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("purchase_bill_items").insert(
        items.map((item, index) => ({
          purchase_bill_id: created.id,
          sort_order: index,
          ...item,
        }))
      );
      if (itemsError) throw itemsError;
    }
  } catch (err) {
    if (newId) await supabase.from("purchase_bills").delete().eq("id", newId);
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/bills/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/purchase/bills");
  revalidatePath("/admin/purchase/payables");
  redirect("/admin/purchase/bills");
}

export async function updateBill(id: string, formData: FormData) {
  const supabase = await createClient();
  try {
    const { data: current } = await supabase
      .from("purchase_bills")
      .select("status")
      .eq("id", id)
      .single();
    if (current?.status !== "draft") throw new Error("แก้ไขได้เฉพาะบิลสถานะร่างเท่านั้น");

    const items = billItemsFromForm(formData);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
    const wht_amount = numberOrDefault(formData.get("wht_amount"), 0);
    const { subtotal, total_amount } = computeTotals(items, vat_amount, wht_amount);
    const supplier_id = await resolveSupplierIdByName(
      supabase,
      emptyToNull(formData.get("supplier_name"))
    );
    if (!supplier_id) throw new Error("กรุณากรอกชื่อซัพพลายเออร์");
    const base = billHeaderBase(formData);

    const header = { ...base, supplier_id, subtotal, discount_amount: 0, vat_amount, wht_amount, total_amount };
    const { error } = await supabase.from("purchase_bills").update(header).eq("id", id);
    if (error) throw error;

    await supabase.from("purchase_bill_items").delete().eq("purchase_bill_id", id);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("purchase_bill_items").insert(
        items.map((item, index) => ({ purchase_bill_id: id, sort_order: index, ...item }))
      );
      if (itemsError) throw itemsError;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/bills/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/purchase/bills");
  revalidatePath("/admin/purchase/payables");
  redirect(`/admin/purchase/bills/${id}`);
}

export async function deleteBill(id: string) {
  const supabase = await createClient();
  const { data: current } = await supabase.from("purchase_bills").select("status").eq("id", id).single();
  if (current?.status !== "draft") {
    redirect(`/admin/purchase/bills?error=${encodeURIComponent("ลบได้เฉพาะบิลสถานะร่างเท่านั้น")}`);
  }
  const { error } = await supabase.from("purchase_bills").delete().eq("id", id);
  if (error) redirect(`/admin/purchase/bills?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/bills");
}

export async function submitBill(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_bills")
    .update({ status: "pending_approval" })
    .eq("id", id)
    .eq("status", "draft");
  if (error) redirect(`/admin/purchase/bills/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/bills");
  redirect(`/admin/purchase/bills/${id}`);
}

export async function approveBill(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_bills")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) redirect(`/admin/purchase/bills/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/bills");
  revalidatePath("/admin/purchase/payables");
  redirect(`/admin/purchase/bills/${id}`);
}

export async function cancelBill(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_bills")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["draft", "pending_approval", "approved"]);
  if (error) redirect(`/admin/purchase/bills/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/bills");
  redirect(`/admin/purchase/bills/${id}`);
}
