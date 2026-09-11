import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/role";

/** The signed-in user's roles (can be more than one), or [] if they have
 * none/an inactive account -- mirrors the `current_roles()` SQL function
 * that RLS policies use, so the UI shows/hides exactly what the database
 * would actually allow. Server-only (reads cookies via lib/supabase/server). */
export async function getCurrentRoles(): Promise<Role[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_roles");
  return (data as Role[] | null) ?? [];
}
