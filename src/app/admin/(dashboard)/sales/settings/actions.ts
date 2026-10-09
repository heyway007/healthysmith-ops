"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

/** Seller details printed on every tax invoice (single company row). */
export async function saveCompany(formData: FormData) {
  const supabase = await createClient();
  const taxId = emptyToNull(formData.get("tax_id"))?.replace(/[\s-]/g, "") ?? null;
  const branch = String(formData.get("branch_code") ?? "").replace(/\D/g, "").padStart(5, "0").slice(-5);
  const fields = {
    name: String(formData.get("name") ?? "").trim(),
    tax_id: taxId,
    branch_code: branch,
    address: emptyToNull(formData.get("address")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    logo_url: emptyToNull(formData.get("logo_url")),
  };

  let message: string | null = null;
  if (!fields.name) message = "กรุณากรอกชื่อบริษัท";
  else if (taxId && !/^\d{13}$/.test(taxId)) message = "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก";
  else {
    const id = emptyToNull(formData.get("id"));
    const { error } = id
      ? await supabase.from("companies").update(fields).eq("id", id)
      : await supabase.from("companies").insert(fields);
    if (error) message = error.message;
  }

  if (message) redirect(`/admin/sales/settings?error=${encodeURIComponent(message)}`);
  revalidatePath("/admin/sales", "layout");
  revalidatePath("/admin/print/tax-invoices");
  redirect("/admin/sales/settings?saved=1");
}
