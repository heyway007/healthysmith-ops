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
    .from("employee_directory")
    .select("id")
    .eq("employee_code", code)
    .maybeSingle();
  return data?.id ?? null;
}

/** Resolves the employee to link for a login: prefers an existing employee
 * matched by the typed "ชื่อ นามสกุล (รหัส)" label; if none was typed/found
 * and the account is meant to have front-office access, creates a minimal
 * employee record automatically (placeholder name, auto-numbered code) so
 * the login can exist before HR fills in the full HR form -- the employee
 * fills in the rest themselves via the portal profile page. */
export async function resolveOrCreateEmployeeId(
  supabase: SupabaseClient,
  label: string | null,
  createIfMissing: boolean
): Promise<string | null> {
  const existing = await resolveEmployeeIdByLabel(supabase, label);
  if (existing || !createIfMissing) return existing;

  const { data: code, error: codeError } = await supabase.rpc("next_document_number", {
    p_doc_type: "employee",
  });
  if (codeError) throw codeError;

  const { data: created, error } = await supabase
    .from("employees")
    .insert({
      employee_code: code,
      first_name: "พนักงานใหม่",
      last_name: "(ยังไม่กรอกข้อมูล)",
      start_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

/** The employees row linked (via employees.user_id) to the signed-in auth
 * user, if any -- used to stamp created_by/approved_by on documents. Reads
 * through employee_directory since non-HR roles can't select employees
 * directly. */
export async function currentEmployeeId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("employee_directory")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}
