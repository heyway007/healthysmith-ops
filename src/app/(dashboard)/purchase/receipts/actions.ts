"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault } from "@/lib/forms";
import { resolveEmployeeIdByLabel } from "../employee-picker";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function recomputeOrderStatus(supabase: SupabaseClient, purchaseOrderId: string) {
  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("quantity, received_quantity")
    .eq("purchase_order_id", purchaseOrderId);
  if (!items || items.length === 0) return;

  const totalOrdered = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalReceived = items.reduce((sum, i) => sum + i.received_quantity, 0);

  const status =
    totalReceived <= 0 ? "sent" : totalReceived >= totalOrdered ? "received" : "partially_received";

  await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("id", purchaseOrderId)
    .in("status", ["approved", "sent", "partially_received", "received"]);
}

export async function createReceipt(formData: FormData) {
  const supabase = await createClient();
  let newId: string | null = null;
  const purchase_order_id = String(formData.get("purchase_order_id") ?? "").trim();

  try {
    if (!purchase_order_id) throw new Error("ไม่พบใบสั่งซื้ออ้างอิง");

    const { data: order } = await supabase
      .from("purchase_orders")
      .select("id, supplier_id")
      .eq("id", purchase_order_id)
      .single();
    if (!order) throw new Error("ไม่พบใบสั่งซื้อ");

    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", purchase_order_id);
    const poItemById = new Map((poItems ?? []).map((i) => [i.id, i]));

    const itemIds = formData.getAll("po_item_id").map(String);
    const quantities = formData.getAll("quantity_received").map(String);

    const receiptItems: {
      purchase_order_item_id: string;
      product_id: string | null;
      quantity_received: number;
      unit_price: number;
    }[] = [];

    for (let i = 0; i < itemIds.length; i++) {
      const qty = numberOrDefault(quantities[i], 0);
      if (qty <= 0) continue;
      const poItem = poItemById.get(itemIds[i]);
      if (!poItem) continue;

      const remaining = poItem.quantity - poItem.received_quantity;
      if (qty > remaining + 1e-9) {
        throw new Error(
          `จำนวนที่รับของ "${poItem.description ?? "รายการ"}" เกินยอดที่เหลือรับ (เหลือ ${remaining})`
        );
      }
      receiptItems.push({
        purchase_order_item_id: poItem.id,
        product_id: poItem.product_id,
        quantity_received: qty,
        unit_price: poItem.unit_price,
      });
    }
    if (receiptItems.length === 0) throw new Error("กรุณากรอกจำนวนที่รับอย่างน้อย 1 รายการ");

    const received_by = await resolveEmployeeIdByLabel(
      supabase,
      emptyToNull(formData.get("received_by_label"))
    );

    const { data: created, error } = await supabase
      .from("goods_receipts")
      .insert({
        purchase_order_id,
        supplier_id: order.supplier_id,
        receipt_date:
          String(formData.get("receipt_date") || "").trim() || new Date().toISOString().slice(0, 10),
        status: "confirmed",
        note: emptyToNull(formData.get("note")),
        received_by,
      })
      .select("id")
      .single();
    if (error) throw error;
    newId = created.id;

    const { error: itemsError } = await supabase
      .from("goods_receipt_items")
      .insert(receiptItems.map((item) => ({ goods_receipt_id: created.id, ...item })));
    if (itemsError) throw itemsError;

    for (const item of receiptItems) {
      const poItem = poItemById.get(item.purchase_order_item_id)!;
      const { error: updateError } = await supabase
        .from("purchase_order_items")
        .update({ received_quantity: poItem.received_quantity + item.quantity_received })
        .eq("id", poItem.id);
      if (updateError) throw updateError;
    }

    await recomputeOrderStatus(supabase, purchase_order_id);
  } catch (err) {
    if (newId) await supabase.from("goods_receipts").delete().eq("id", newId);
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/purchase/receipts/new?po=${purchase_order_id}&error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/purchase/receipts");
  revalidatePath("/purchase/orders");
  redirect("/purchase/receipts");
}

export async function cancelReceipt(id: string) {
  const supabase = await createClient();
  const { data: receipt } = await supabase.from("goods_receipts").select("*").eq("id", id).single();
  if (!receipt || receipt.status !== "confirmed") {
    redirect(
      `/purchase/receipts?error=${encodeURIComponent("ยกเลิกได้เฉพาะใบรับสินค้าที่ยืนยันแล้วเท่านั้น")}`
    );
    return;
  }

  const { data: items } = await supabase
    .from("goods_receipt_items")
    .select("*")
    .eq("goods_receipt_id", id);

  for (const item of items ?? []) {
    if (!item.purchase_order_item_id) continue;
    const { data: poItem } = await supabase
      .from("purchase_order_items")
      .select("received_quantity")
      .eq("id", item.purchase_order_item_id)
      .single();
    if (poItem) {
      await supabase
        .from("purchase_order_items")
        .update({ received_quantity: Math.max(0, poItem.received_quantity - item.quantity_received) })
        .eq("id", item.purchase_order_item_id);
    }
  }

  await supabase.from("goods_receipts").update({ status: "cancelled" }).eq("id", id);
  if (receipt.purchase_order_id) await recomputeOrderStatus(supabase, receipt.purchase_order_id);

  revalidatePath("/purchase/receipts");
  revalidatePath("/purchase/orders");
}
