"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, errorMessage, numberOrDefault } from "@/lib/forms";
import { resolveByName } from "@/lib/resolve-by-name";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function friendlyError(err: unknown) {
  const message = errorMessage(err);
  if (message.includes("employees_scan_code_key")) return "รหัสสแกนนิ้วนี้ถูกใช้กับพนักงานคนอื่นแล้ว";
  if (message.includes("employees_employee_code_key")) return "รหัสพนักงานนี้มีอยู่แล้ว";
  return message;
}

async function employeeFields(supabase: SupabaseClient, formData: FormData) {
  const departmentName = emptyToNull(formData.get("department_name"));
  const positionName = emptyToNull(formData.get("position_name"));

  const department_id = await resolveByName(supabase, "departments", departmentName);
  const position_id = await resolveByName(supabase, "positions", positionName, { department_id });
  const scanRaw = emptyToNull(formData.get("scan_code"));
  const scan_code = scanRaw === null ? null : Number(scanRaw);
  if (scan_code !== null && (!Number.isInteger(scan_code) || scan_code < 1)) {
    throw new Error("รหัสสแกนนิ้วต้องเป็นเลขจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
  }

  return {
    employee_code: String(formData.get("employee_code") ?? "").trim(),
    prefix_name: emptyToNull(formData.get("prefix_name")),
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    nickname: emptyToNull(formData.get("nickname")),
    scan_code,
    department_id,
    position_id,
    team_id: emptyToNull(formData.get("team_id")),
    employment_type: String(formData.get("employment_type") ?? "full_time"),
    start_date: String(formData.get("start_date") ?? ""),
    base_salary: numberOrDefault(formData.get("base_salary"), 0),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    social_security_number: emptyToNull(formData.get("social_security_number")),
    tax_id: emptyToNull(formData.get("tax_id")),
  };
}

export async function createEmployee(formData: FormData) {
  const supabase = await createClient();
  try {
    const fields = await employeeFields(supabase, formData);
    const { error } = await supabase.from("employees").insert(fields);
    if (error) throw error;
  } catch (err) {
    const message = friendlyError(err);
    redirect(`/admin/hr/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/hr");
  redirect("/admin/hr");
}

export async function updateEmployee(id: string, formData: FormData) {
  const supabase = await createClient();
  try {
    const fields = await employeeFields(supabase, formData);
    const { error } = await supabase.from("employees").update(fields).eq("id", id);
    if (error) throw error;
  } catch (err) {
    const message = friendlyError(err);
    redirect(`/admin/hr/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/hr");
  redirect("/admin/hr");
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) redirect(`/admin/hr?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/hr");
}
