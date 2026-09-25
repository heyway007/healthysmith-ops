"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_FIELDS, profileSchema, type ProfileFormState, type ProfileValues } from "./schema";

const emptyToNull = (s: string) => (s === "" ? null : s);

// Translate DB/PostgREST errors into something an employee can act on.
function describeDbError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "PGRST202":
      return "ระบบฐานข้อมูลยังไม่อัปเดต กรุณาแจ้งผู้ดูแลระบบ (update_own_employee_profile)";
    case "22001":
      return "มีข้อมูลบางช่องยาวเกินกำหนด กรุณาตรวจสอบอีกครั้ง";
    case "23505":
      return "ข้อมูลนี้ถูกใช้โดยพนักงานคนอื่นแล้ว";
    default:
      return `บันทึกไม่สำเร็จ: ${error.message}`;
  }
}

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const values = Object.fromEntries(
    PROFILE_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  ) as ProfileValues;

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      status: "error",
      message: "กรุณาแก้ไขช่องที่มีเครื่องหมายสีแดง",
      fieldErrors: Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])),
      values,
    };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_employee_profile", {
    p_prefix_name: emptyToNull(d.prefix_name),
    p_first_name: d.first_name,
    p_last_name: d.last_name,
    p_nickname: emptyToNull(d.nickname),
    p_phone: emptyToNull(d.phone),
    p_email: emptyToNull(d.email),
    p_address: emptyToNull(d.address),
    p_id_card_number: emptyToNull(d.id_card_number),
    p_bank_name: emptyToNull(d.bank_name),
    p_bank_account_number: emptyToNull(d.bank_account_number),
    p_bank_account_name: emptyToNull(d.bank_account_name),
  });
  if (error) {
    console.error("updateProfile failed", error);
    return { status: "error", message: describeDbError(error), values };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  // Echo the normalised values (dashes stripped etc.) back into the form.
  return { status: "success", message: "บันทึกข้อมูลเรียบร้อยแล้ว", values: { ...values, ...d } };
}
