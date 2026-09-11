"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

function holidayFields(formData: FormData) {
  return {
    holiday_date: String(formData.get("holiday_date") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "holiday"),
    note: emptyToNull(formData.get("note")),
  };
}

export async function createHoliday(formData: FormData) {
  const supabase = await createClient();
  try {
    const fields = holidayFields(formData);
    if (!fields.holiday_date || !fields.name) throw new Error("กรุณากรอกวันที่และชื่อวันหยุด");

    const { data: existing } = await supabase
      .from("company_holidays")
      .select("id")
      .eq("holiday_date", fields.holiday_date)
      .maybeSingle();
    if (existing) throw new Error("มีวันหยุดในวันที่นี้อยู่แล้ว");

    const { error } = await supabase.from("company_holidays").insert(fields);
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/hr/holidays/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/hr/holidays");
  redirect("/admin/hr/holidays");
}

export async function updateHoliday(id: string, formData: FormData) {
  const supabase = await createClient();
  try {
    const fields = holidayFields(formData);
    if (!fields.holiday_date || !fields.name) throw new Error("กรุณากรอกวันที่และชื่อวันหยุด");

    const { data: existing } = await supabase
      .from("company_holidays")
      .select("id")
      .eq("holiday_date", fields.holiday_date)
      .maybeSingle();
    if (existing && existing.id !== id) throw new Error("มีวันหยุดในวันที่นี้อยู่แล้ว");

    const { error } = await supabase.from("company_holidays").update(fields).eq("id", id);
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/hr/holidays/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/hr/holidays");
  redirect("/admin/hr/holidays");
}

export async function deleteHoliday(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("company_holidays").delete().eq("id", id);
  if (error) redirect(`/admin/hr/holidays?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/hr/holidays");
}
