"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

export type ProductionFormState = { error: string } | null;

function revalidateInventory() {
  revalidatePath("/admin/inventory", "layout");
}

/** Create (id = null) or edit a production order. */
export async function saveProductionOrder(
  id: string | null,
  _prev: ProductionFormState,
  formData: FormData,
): Promise<ProductionFormState> {
  let items: { product_id: string; quantity: number }[];
  try {
    items = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "ข้อมูลรายการสินค้าไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const { data: savedId, error } = await supabase.rpc("save_production_order", {
    p_id: id,
    p_header: {
      order_date: emptyToNull(formData.get("order_date")),
      due_date: emptyToNull(formData.get("due_date")),
      producer_name: emptyToNull(formData.get("producer_name")),
      note: emptyToNull(formData.get("note")),
    },
    p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
  });
  if (error || !savedId) return { error: error?.message ?? "บันทึกใบผลิตไม่สำเร็จ" };

  revalidateInventory();
  redirect(`/admin/inventory/production/${savedId}`);
}

/** Receive part (or all) of an order into stock. Rows left blank are skipped. */
export async function receiveProduction(orderId: string, formData: FormData) {
  const ids = formData.getAll("item_id").map(String);
  const qty = formData.getAll("quantity").map(String);
  const lots = formData.getAll("lot_number").map(String);
  const expiries = formData.getAll("expiry_date").map(String);
  const lines = ids
    .map((item_id, i) => ({
      item_id,
      quantity: Number(qty[i] || 0),
      lot_number: lots[i]?.trim() || null,
      expiry_date: expiries[i] || null,
    }))
    .filter((l) => l.quantity !== 0);

  const supabase = await createClient();
  const { data: receiptId, error } = await supabase.rpc("receive_production", {
    p_order_id: orderId,
    p_date: emptyToNull(formData.get("receipt_date")),
    p_note: emptyToNull(formData.get("note")),
    p_lines: lines,
  });
  if (error) redirect(`/admin/inventory/production/${orderId}?error=${encodeURIComponent(error.message)}#receive`);

  revalidateInventory();
  redirect(`/admin/inventory/production/${orderId}?received=${receiptId}`);
}

export async function cancelProductionReceipt(orderId: string, receiptId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_production_receipt", {
    p_receipt_id: receiptId,
    p_reason: String(formData.get("reason") ?? ""),
  });
  if (error) redirect(`/admin/inventory/production/${orderId}?error=${encodeURIComponent(error.message)}`);

  revalidateInventory();
  redirect(`/admin/inventory/production/${orderId}`);
}

/** ปิดใบ / เปิดใบอีกครั้ง / ยกเลิกใบ */
export async function setProductionOrderStatus(orderId: string, action: "close" | "reopen" | "cancel", formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_production_order_status", {
    p_id: orderId,
    p_action: action,
    p_reason: emptyToNull(formData.get("reason")),
  });
  if (error) redirect(`/admin/inventory/production/${orderId}?error=${encodeURIComponent(error.message)}`);

  revalidateInventory();
  redirect(`/admin/inventory/production/${orderId}`);
}
