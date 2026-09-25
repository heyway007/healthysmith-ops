import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from protected routes -- to /admin/login for
 * the back office, /login for the front (employee) office. Wired up in
 * src/proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminSection = pathname.startsWith("/admin");
  const isAuthRoute = isAdminSection ? pathname.startsWith("/admin/login") : pathname === "/login";
  // Public pages anyone can open without signing in.
  const isPublicRoute = pathname === "/holidays" || pathname.startsWith("/holidays/");

  // Visitors opening the site root land on the public holiday calendar rather
  // than the sign-in page; employees who sign in still get the portal home.
  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/holidays";
    return NextResponse.redirect(url);
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminSection ? "/admin/login" : "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
