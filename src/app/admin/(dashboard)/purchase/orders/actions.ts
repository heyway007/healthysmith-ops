"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault, zipLineItems } from "@/lib/forms";
import { currentEmployeeId } from "@/lib/employee-picker";
import { resolveSupplierIdByName } from "../supplier-picker";

function orderHeaderBase(formData: FormData) {
  return {
    purchase_request_id: emptyToNull(formData.get("purchase_request_id")),
    order_date:
      String(formData.get("order_date") || "").trim() || new Date().toISOString().slice(0, 10),
    expected_date: emptyToNull(formData.get("expected_date")),
    note: emptyToNull(formData.get("note")),
  };
}

function orderItemsFromForm(formData: FormData) {
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
  vatAmount: number
) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price - i.discount_amount, 0);
  return { subtotal, total_amount: subtotal + vatAmount };
}

export async function createOrder(formData: FormData) {
  const supabase = await createClient();
  let newId: string | null = null;
  try {
    const items = orderItemsFromForm(formData);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
    const { subtotal, total_amount } = computeTotals(items, vat_amount);
    const created_by = await currentEmployeeId(supabase);
    const supplier_id = await resolveSupplierIdByName(
      supabase,
      emptyToNull(formData.get("supplier_name"))
    );
    if (!supplier_id) throw new Error("กรุณากรอกชื่อซัพพลายเออร์");
    const base = orderHeaderBase(formData);

    const header = {
      ...base,
      supplier_id,
      subtotal,
      discount_amount: 0,
      vat_amount,
      total_amount,
      created_by,
    };
    const { data: created, error } = await supabase
      .from("purchase_orders")
      .insert(header)
      .select("id")
      .single();
    if (error) throw error;
    newId = created.id;

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("purchase_order_items").insert(
        items.map((item, index) => ({
          purchase_order_id: created.id,
          sort_order: index,
          ...item,
        }))
      );
      if (itemsError) throw itemsError;
    }

    if (header.purchase_request_id) {
      await supabase
        .from("purchase_requests")
        .update({ status: "converted" })
        .eq("id", header.purchase_request_id)
        .eq("status", "approved");
    }
  } catch (err) {
    if (newId) await supabase.from("purchase_orders").delete().eq("id", newId);
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/orders/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/purchase/orders");
  revalidatePath("/admin/purchase/requests");
  redirect("/admin/purchase/orders");
}

export async function updateOrder(id: string, formData: FormData) {
  const supabase = await createClient();
  try {
    const { data: current } = await supabase
      .from("purchase_orders")
      .select("status")
      .eq("id", id)
      .single();
    if (current?.status !== "draft") throw new Error("แก้ไขได้เฉพาะใบสั่งซื้อสถานะร่างเท่านั้น");

    const items = orderItemsFromForm(formData);
    const vat_amount = numberOrDefault(formData.get("vat_amount"), 0);
    const { subtotal, total_amount } = computeTotals(items, vat_amount);
    const supplier_id = await resolveSupplierIdByName(
      supabase,
      emptyToNull(formData.get("supplier_name"))
    );
    if (!supplier_id) throw new Error("กรุณากรอกชื่อซัพพลายเออร์");
    const base = orderHeaderBase(formData);

    const header = { ...base, supplier_id, subtotal, discount_amount: 0, vat_amount, total_amount };
    const { error } = await supabase.from("purchase_orders").update(header).eq("id", id);
    if (error) throw error;

    await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("purchase_order_items").insert(
        items.map((item, index) => ({ purchase_order_id: id, sort_order: index, ...item }))
      );
      if (itemsError) throw itemsError;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/orders/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/purchase/orders");
  redirect(`/admin/purchase/orders/${id}`);
}

export async function deleteOrder(id: string) {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", id)
    .single();
  if (current?.status !== "draft") {
    redirect(`/admin/purchase/orders?error=${encodeURIComponent("ลบได้เฉพาะใบสั่งซื้อสถานะร่างเท่านั้น")}`);
  }
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) redirect(`/admin/purchase/orders?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/orders");
}

export async function submitOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "pending_approval" })
    .eq("id", id)
    .eq("status", "draft");
  if (error) redirect(`/admin/purchase/orders/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/orders");
  redirect(`/admin/purchase/orders/${id}`);
}

export async function approveOrder(id: string) {
  const supabase = await createClient();
  const approved_by = await currentEmployeeId(supabase);
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "approved", approved_by, approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) redirect(`/admin/purchase/orders/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/orders");
  redirect(`/admin/purchase/orders/${id}`);
}

export async function markOrderSent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "sent" })
    .eq("id", id)
    .eq("status", "approved");
  if (error) redirect(`/admin/purchase/orders/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/orders");
  redirect(`/admin/purchase/orders/${id}`);
}

export async function closeOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "closed" })
    .eq("id", id)
    .in("status", ["received", "partially_received", "sent"]);
  if (error) redirect(`/admin/purchase/orders/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/orders");
  redirect(`/admin/purchase/orders/${id}`);
}

export async function cancelOrder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["draft", "pending_approval", "approved"]);
  if (error) redirect(`/admin/purchase/orders/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/orders");
  redirect(`/admin/purchase/orders/${id}`);
}
