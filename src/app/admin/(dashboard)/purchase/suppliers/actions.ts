"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault } from "@/lib/forms";

function supplierFields(formData: FormData) {
  return {
    supplier_code: String(formData.get("supplier_code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    tax_id: emptyToNull(formData.get("tax_id")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    address: emptyToNull(formData.get("address")),
    contact_person: emptyToNull(formData.get("contact_person")),
    payment_term_days: numberOrDefault(formData.get("payment_term_days"), 0),
    bank_name: emptyToNull(formData.get("bank_name")),
    bank_account_number: emptyToNull(formData.get("bank_account_number")),
    bank_account_name: emptyToNull(formData.get("bank_account_name")),
  };
}

export async function createSupplier(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert(supplierFields(formData));

  if (error) redirect(`/admin/purchase/suppliers/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/suppliers");
  redirect("/admin/purchase/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update(supplierFields(formData)).eq("id", id);

  if (error) redirect(`/admin/purchase/suppliers/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/suppliers");
  redirect("/admin/purchase/suppliers");
}

/** A shop that has purchases is hidden (is_active = false) so its history
 * stays intact. Otherwise it's deleted, together with any leftover PO / GR
 * from the old purchasing flow, which has no screens anymore and would
 * otherwise block the delete. */
export async function deleteSupplier(id: string) {
  const supabase = await createClient();
  try {
    const { count: billCount, error: countError } = await supabase
      .from("purchase_bills")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", id);
    if (countError) throw countError;

    if ((billCount ?? 0) > 0) {
      const { error } = await supabase.from("suppliers").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    } else {
      const { data: orders } = await supabase.from("purchase_orders").select("id").eq("supplier_id", id);
      const orderIds = (orders ?? []).map((o) => o.id);
      if (orderIds.length > 0) {
        const { error } = await supabase
          .from("purchase_bills")
          .update({ purchase_order_id: null })
          .in("purchase_order_id", orderIds);
        if (error) throw error;
      }

      for (const table of ["ap_payments", "goods_receipts", "purchase_orders"] as const) {
        const { error } = await supabase.from(table).delete().eq("supplier_id", id);
        if (error) throw error;
      }
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/suppliers?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/purchase/suppliers");
  redirect("/admin/purchase/suppliers");
}
