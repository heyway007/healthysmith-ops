"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, errorMessage, numberOrDefault } from "@/lib/forms";
import { resolveByName } from "@/lib/resolve-by-name";

/** A failed save returns `error`; a save that stays on the page returns `message`. (Creating redirects instead.) */
export type SaveResult = { error?: string; message?: string } | undefined;

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

const displayName = (f: { nickname: string | null; first_name: string }) => f.nickname || f.first_name;

// After creating, open the new employee's edit page (with a success notice)
// so they can keep working on it instead of being sent back to the list.
export async function createEmployee(formData: FormData): Promise<SaveResult> {
  const supabase = await createClient();
  let id: string;
  let notice: string;
  try {
    const fields = await employeeFields(supabase, formData);
    const { data, error } = await supabase.from("employees").insert(fields).select("id").single();
    if (error) throw error;
    id = data.id;
    notice = `เพิ่มพนักงาน "${displayName(fields)}" เรียบร้อยแล้ว`;
  } catch (err) {
    return { error: friendlyError(err) };
  }
  revalidatePath("/admin/hr");
  redirect(`/admin/hr/${id}?${new URLSearchParams({ notice })}`);
}

// Editing stays on the same page: it returns a message for the form to show.
export async function updateEmployee(id: string, formData: FormData): Promise<SaveResult> {
  const supabase = await createClient();
  try {
    const fields = await employeeFields(supabase, formData);
    const { error } = await supabase.from("employees").update(fields).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/hr");
    revalidatePath(`/admin/hr/${id}`);
    return { message: `บันทึกข้อมูลพนักงาน "${displayName(fields)}" เรียบร้อยแล้ว` };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) redirect(`/admin/hr?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/hr");
}
