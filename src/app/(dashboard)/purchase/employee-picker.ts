import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type EmployeeLike = { first_name: string; last_name: string; employee_code: string };

/** Display label used both as the <datalist> option and the input's typed value. */
export function employeeLabel(e: EmployeeLike): string {
  return `${e.first_name} ${e.last_name} (${e.employee_code})`;
}

/** Resolves a typed "ชื่อ นามสกุล (รหัส)" label back to the employee's id.
 * Looks up by employee_code only (the part in parentheses) -- never creates
 * a new employee from this, since employees have several required fields
 * this form doesn't collect. */
export async function resolveEmployeeIdByLabel(
  supabase: SupabaseClient,
  label: string | null
): Promise<string | null> {
  if (!label) return null;
  const match = label.match(/\(([^()]+)\)\s*$/);
  const code = (match ? match[1] : label).trim();
  if (!code) return null;

  const { data } = await supabase
    .from("employees")
    .select("id")
    .eq("employee_code", code)
    .maybeSingle();
  return data?.id ?? null;
}

/** The employees row linked (via employees.user_id) to the signed-in auth
 * user, if any -- used to stamp created_by/approved_by on documents. */
export async function currentEmployeeId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("employees").select("id").eq("user_id", user.id).maybeSingle();
  return data?.id ?? null;
}
