import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client -- bypasses RLS entirely and can manage auth
 * users. Server-only: never import this from a Client Component, and never
 * let SUPABASE_SERVICE_ROLE_KEY reach the browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
