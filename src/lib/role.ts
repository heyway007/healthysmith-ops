// Client-safe role types/helpers -- no server-only imports here, so this
// can be pulled into Client Components (e.g. the sidebar) without dragging
// in next/headers via lib/supabase/server.

export type Role = "admin" | "sales" | "purchase" | "hr";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "ผู้ดูแลระบบ",
  sales: "ฝ่ายขาย",
  purchase: "ฝ่ายจัดซื้อ",
  hr: "ฝ่ายบุคคล",
};

/** A user can hold more than one role (e.g. sales + purchase). `admin`
 * always grants access regardless of what's in `allowed`. */
export function canAccess(roles: Role[] | null, allowed: Role[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.includes("admin") || roles.some((r) => allowed.includes(r));
}
