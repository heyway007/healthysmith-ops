"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault, zipLineItems } from "@/lib/forms";
import { resolveByName } from "@/lib/resolve-by-name";
import { resolveEmployeeIdByLabel, currentEmployeeId } from "../employee-picker";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requestHeaderFields(supabase: SupabaseClient, formData: FormData) {
  const requested_by = await resolveEmployeeIdByLabel(
    supabase,
    emptyToNull(formData.get("requested_by_label"))
  );
  const department_id = await resolveByName(
    supabase,
    "departments",
    emptyToNull(formData.get("department_name"))
  );

  return {
    requested_by,
    department_id,
    request_date: String(formData.get("request_date") || "").trim() || new Date().toISOString().slice(0, 10),
    required_date: emptyToNull(formData.get("required_date")),
    note: emptyToNull(formData.get("note")),
  };
}

function requestItemsFromForm(formData: FormData) {
  return zipLineItems(formData, ["description", "quantity", "estimated_unit_price"]).map((row) => ({
    description: row.description || null,
    quantity: numberOrDefault(row.quantity, 1),
    estimated_unit_price: numberOrDefault(row.estimated_unit_price, 0),
  }));
}

export async function createRequest(formData: FormData) {
  const supabase = await createClient();
  let newId: string | null = null;
  try {
    const header = await requestHeaderFields(supabase, formData);
    const { data: created, error } = await supabase
      .from("purchase_requests")
      .insert(header)
      .select("id")
      .single();
    if (error) throw error;
    newId = created.id;

    const items = requestItemsFromForm(formData);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("purchase_request_items").insert(
        items.map((item, index) => ({
          purchase_request_id: created.id,
          sort_order: index,
          ...item,
        }))
      );
      if (itemsError) throw itemsError;
    }
  } catch (err) {
    if (newId) await supabase.from("purchase_requests").delete().eq("id", newId);
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/purchase/requests/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/purchase/requests");
  redirect("/purchase/requests");
}

export async function updateRequest(id: string, formData: FormData) {
  const supabase = await createClient();
  try {
    const { data: current } = await supabase
      .from("purchase_requests")
      .select("status")
      .eq("id", id)
      .single();
    if (current?.status !== "draft") throw new Error("แก้ไขได้เฉพาะใบขอซื้อสถานะร่างเท่านั้น");

    const header = await requestHeaderFields(supabase, formData);
    const { error } = await supabase.from("purchase_requests").update(header).eq("id", id);
    if (error) throw error;

    await supabase.from("purchase_request_items").delete().eq("purchase_request_id", id);
    const items = requestItemsFromForm(formData);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("purchase_request_items").insert(
        items.map((item, index) => ({
          purchase_request_id: id,
          sort_order: index,
          ...item,
        }))
      );
      if (itemsError) throw itemsError;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/purchase/requests/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/purchase/requests");
  redirect(`/purchase/requests/${id}`);
}

export async function deleteRequest(id: string) {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("purchase_requests")
    .select("status")
    .eq("id", id)
    .single();
  if (current?.status !== "draft") {
    redirect(`/purchase/requests?error=${encodeURIComponent("ลบได้เฉพาะใบขอซื้อสถานะร่างเท่านั้น")}`);
  }
  const { error } = await supabase.from("purchase_requests").delete().eq("id", id);
  if (error) redirect(`/purchase/requests?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/purchase/requests");
}

export async function submitRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_requests")
    .update({ status: "pending_approval" })
    .eq("id", id)
    .eq("status", "draft");
  if (error) redirect(`/purchase/requests/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/purchase/requests");
  redirect(`/purchase/requests/${id}`);
}

export async function approveRequest(id: string) {
  const supabase = await createClient();
  const approved_by = await currentEmployeeId(supabase);
  const { error } = await supabase
    .from("purchase_requests")
    .update({ status: "approved", approved_by, approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) redirect(`/purchase/requests/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/purchase/requests");
  redirect(`/purchase/requests/${id}`);
}

export async function rejectRequest(id: string) {
  const supabase = await createClient();
  const approved_by = await currentEmployeeId(supabase);
  const { error } = await supabase
    .from("purchase_requests")
    .update({ status: "rejected", approved_by, approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) redirect(`/purchase/requests/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/purchase/requests");
  redirect(`/purchase/requests/${id}`);
}

export async function cancelRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["draft", "pending_approval"]);
  if (error) redirect(`/purchase/requests/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/purchase/requests");
  redirect(`/purchase/requests/${id}`);
}
