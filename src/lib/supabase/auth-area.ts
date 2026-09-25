// The back office (/admin/*) and the front office (everything else) keep
// separate Supabase sessions: each area stores its session under its own
// cookie name, so signing in or out of one never affects the other.
//
// The proxy (middleware.ts) works out the area from the URL and forwards it
// to the rest of the request in the AUTH_AREA_HEADER header, which the server
// client (server.ts) reads to pick the matching cookie.

export type AuthArea = "admin" | "portal";

export const AUTH_AREA_HEADER = "x-auth-area";

export const AUTH_COOKIE_NAME: Record<AuthArea, string> = {
  admin: "sb-admin-auth",
  portal: "sb-portal-auth",
};

export function authAreaForPath(pathname: string): AuthArea {
  return pathname === "/admin" || pathname.startsWith("/admin/") ? "admin" : "portal";
}
