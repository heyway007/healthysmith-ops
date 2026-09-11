import { createClient } from "@/lib/supabase/server";

export type CurrentEmployee = {
  id: string;
  employee_code: string;
  prefix_name: string | null;
  first_name: string;
  last_name: string;
  department_id: string | null;
  position_id: string | null;
};

/** The employee record linked to the signed-in front-office user, or null
 * if this login isn't tied to an employee (e.g. a back-office-only staff
 * account that was never linked via /admin/users). */
export async function getCurrentEmployee(): Promise<CurrentEmployee | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("employee_directory")
    .select("id, employee_code, prefix_name, first_name, last_name, department_id, position_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}
