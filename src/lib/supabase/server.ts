import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "@/types/database.types";
import { AUTH_AREA_HEADER, AUTH_COOKIE_NAME, type AuthArea } from "./auth-area";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Must be created fresh per request (reads the request's cookies).
 *
 * Uses the session of the area the request belongs to -- back office
 * (/admin) or front office -- as set by the proxy (see auth-area.ts), so the
 * two logins stay independent.
 */
export async function createClient() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const area: AuthArea = headerStore.get(AUTH_AREA_HEADER) === "admin" ? "admin" : "portal";

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: AUTH_COOKIE_NAME[area] },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component -- middleware refreshes the
            // session instead, so this can be safely ignored.
          }
        },
      },
    }
  );
}
