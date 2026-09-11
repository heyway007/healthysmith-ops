"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

export async function updateProfile(formData: FormData) {
  try {
    const first_name = String(formData.get("first_name") ?? "").trim();
    const last_name = String(formData.get("last_name") ?? "").trim();
    if (!first_name || !last_name) throw new Error("กรุณากรอกชื่อและนามสกุล");

    const supabase = await createClient();
    const { error } = await supabase.rpc("update_own_employee_profile", {
      p_prefix_name: emptyToNull(formData.get("prefix_name")),
      p_first_name: first_name,
      p_last_name: last_name,
      p_nickname: emptyToNull(formData.get("nickname")),
      p_phone: emptyToNull(formData.get("phone")),
      p_email: emptyToNull(formData.get("email")),
      p_address: emptyToNull(formData.get("address")),
      p_id_card_number: emptyToNull(formData.get("id_card_number")),
      p_bank_name: emptyToNull(formData.get("bank_name")),
      p_bank_account_number: emptyToNull(formData.get("bank_account_number")),
      p_bank_account_name: emptyToNull(formData.get("bank_account_name")),
      p_social_security_number: emptyToNull(formData.get("social_security_number")),
      p_tax_id: emptyToNull(formData.get("tax_id")),
    });
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/profile?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/profile?saved=1");
}
