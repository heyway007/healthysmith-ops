"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emptyToNull } from "@/lib/forms";
import { getCurrentRoles } from "@/lib/current-role";
import { resolveOrCreateEmployeeId } from "@/lib/employee-picker";
import { ROLE_LABELS, type Role } from "@/lib/role";

async function assertAdmin() {
  const roles = await getCurrentRoles();
  if (!roles.includes("admin")) throw new Error("เฉพาะผู้ดูแลระบบเท่านั้นที่ทำรายการนี้ได้");
}

/** No roles checked is valid on purpose -- it means "front-office employee
 * only" (needs an employee link, no back-office access at all). */
function rolesFromForm(formData: FormData): Role[] {
  const known = Object.keys(ROLE_LABELS) as Role[];
  return formData.getAll("roles").map(String).filter((r): r is Role => known.includes(r as Role));
}

export async function createUser(formData: FormData) {
  try {
    await assertAdmin();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
    const roles = rolesFromForm(formData);

    if (!email || !password) throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
    if (password.length < 8) throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    if (password !== passwordConfirmation) throw new Error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    const isEmployee = formData.get("is_employee") === "1";

    const supabase = await createClient();
    const employee_id = await resolveOrCreateEmployeeId(
      supabase,
      emptyToNull(formData.get("employee_label")),
      isEmployee
    );

    const admin = createAdminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;

    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: created.user.id, roles, employee_id });
    if (roleError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw roleError;
    }

    // Keep employees.user_id (used elsewhere to resolve "which employee is
    // the signed-in user") pointed at the same employee.
    if (employee_id) {
      await supabase.from("employees").update({ user_id: created.user.id }).eq("id", employee_id);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/users/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(userId: string, formData: FormData) {
  try {
    await assertAdmin();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
    const roles = rolesFromForm(formData);

    if (!email) throw new Error("กรุณากรอกอีเมล");
    if (password || passwordConfirmation) {
      if (password.length < 8) throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      if (password !== passwordConfirmation) throw new Error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    }
    const isEmployee = formData.get("is_employee") === "1";

    const supabase = await createClient();
    const employee_id = await resolveOrCreateEmployeeId(
      supabase,
      emptyToNull(formData.get("employee_label")),
      isEmployee
    );

    const { data: previous } = await supabase
      .from("user_roles")
      .select("employee_id")
      .eq("user_id", userId)
      .single();

    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email,
      ...(password ? { password } : {}),
    });
    if (authError) throw authError;

    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ roles, employee_id })
      .eq("user_id", userId);
    if (roleError) throw roleError;

    // Keep employees.user_id in sync with the (possibly changed) link.
    if (previous?.employee_id && previous.employee_id !== employee_id) {
      await supabase.from("employees").update({ user_id: null }).eq("id", previous.employee_id);
    }
    if (employee_id) {
      await supabase.from("employees").update({ user_id: userId }).eq("id", employee_id);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/users/${userId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setUserActive(userId: string, isActive: boolean) {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("user_roles").update({ is_active: isActive }).eq("user_id", userId);
    if (error) throw error;

    const admin = createAdminClient();
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    if (banError) throw banError;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/users?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/users");
}
