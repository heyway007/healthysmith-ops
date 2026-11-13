import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/role";

/** The signed-in user's roles (can be more than one), or [] if they have
 * none/an inactive account -- mirrors the `current_roles()` SQL function
 * that RLS policies use, so the UI shows/hides exactly what the database
 * would actually allow. Server-only (reads cookies via lib/supabase/server).
 *
 * Called as GET so a dropped connection is retried (see fetch-retry.ts). If it
 * still fails, this throws instead of returning [] -- an empty list would show
 * "ไม่มีสิทธิ์" to someone who does have access. */
export async function getCurrentRoles(): Promise<Role[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_roles", undefined, { get: true });
  if (error) throw new Error(`โหลดสิทธิ์ผู้ใช้ไม่สำเร็จ กรุณาลองใหม่ (${error.message})`);
  return (data as Role[] | null) ?? [];
}

/** The signed-in user's tax-document permissions (admin: all). Server-only. */
export async function getDocPermissions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_doc_permissions", undefined, { get: true });
  if (error) throw new Error(`โหลดสิทธิ์เอกสารไม่สำเร็จ กรุณาลองใหม่ (${error.message})`);
  return (data as string[] | null) ?? [];
}
