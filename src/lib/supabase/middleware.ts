import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { AUTH_AREA_HEADER, AUTH_COOKIE_NAME, authAreaForPath } from "./auth-area";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from protected routes -- to /admin/login for
 * the back office, /login for the front (employee) office. Wired up in
 * src/proxy.ts.
 *
 * The two areas have separate sessions (see auth-area.ts): the session cookie
 * is chosen from the URL, and the area is forwarded to server components /
 * actions in a request header so they read the same cookie.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = authAreaForPath(pathname);

  // Forward the (possibly refreshed) cookies plus the area to the rest of the request.
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set(AUTH_AREA_HEADER, area);
    return NextResponse.next({ request: { headers } });
  };
  let supabaseResponse = next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: AUTH_COOKIE_NAME[area] },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = next();
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

  const isAdminSection = area === "admin";
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
    const loginPath = isAdminSection ? "/admin/login" : "/login";
    // A server action (form/button) posted with an expired session: a plain 307
    // makes the client fail with "An unexpected response was received from the
    // server", so answer with the redirect header Next's action client follows.
    if (request.headers.has("next-action")) {
      return new NextResponse(null, { headers: { "x-action-redirect": `${loginPath};push` } });
    }
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
