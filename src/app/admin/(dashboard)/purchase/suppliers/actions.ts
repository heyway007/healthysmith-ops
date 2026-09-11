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

export async function deleteSupplier(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) redirect(`/admin/purchase/suppliers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/purchase/suppliers");
}
