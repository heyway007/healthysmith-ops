"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault } from "@/lib/forms";

function customerFields(formData: FormData) {
  return {
    customer_code: String(formData.get("customer_code") ?? "").trim(),
    customer_type: String(formData.get("customer_type") ?? "individual"),
    name: String(formData.get("name") ?? "").trim(),
    tax_id: emptyToNull(formData.get("tax_id")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    address: emptyToNull(formData.get("address")),
    credit_limit: numberOrDefault(formData.get("credit_limit"), 0),
    credit_term_days: numberOrDefault(formData.get("credit_term_days"), 0),
  };
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert(customerFields(formData));

  if (error) redirect(`/admin/sales/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/sales");
  redirect("/admin/sales");
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(customerFields(formData)).eq("id", id);

  if (error) redirect(`/admin/sales/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/sales");
  redirect("/admin/sales");
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) redirect(`/admin/sales?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/sales");
}
