// The back-office menu, shared by the sidebar (groups with sub-items) and
// the tab bar at the top of each section, so the two never drift apart.
// Client-safe.

import {
  faBoxesStacked,
  faBuilding,
  faCalendarDays,
  faCartShopping,
  faClipboardCheck,
  faClockRotateLeft,
  faDatabase,
  faFileImport,
  faFileInvoice,
  faFileInvoiceDollar,
  faFileSignature,
  faGaugeHigh,
  faIndustry,
  faPenToSquare,
  faPeopleGroup,
  faRightLeft,
  faReceipt,
  faScaleBalanced,
  faStore,
  faTag,
  faTruck,
  faWarehouse,
  faUsers,
  faUserShield,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { canAccess, type Role } from "@/lib/role";
import { canDoc, type DocPermission } from "@/lib/doc-permissions";

export type NavLink = {
  href: string;
  label: string;
  icon: IconDefinition;
  allowed: Role[];
  /** tax-document permission needed on top of the role */
  needs?: DocPermission;
};
export type NavGroup = {
  key: string;
  label: string;
  icon: IconDefinition;
  /** a group without children is a plain link */
  href?: string;
  children?: NavLink[];
  allowed: Role[];
};

export const NAV: NavGroup[] = [
  { key: "home", label: "หน้าหลัก", icon: faGaugeHigh, href: "/admin", allowed: ["admin", "sales", "purchase", "hr", "warehouse"] },
  {
    key: "sales",
    label: "ระบบขาย",
    icon: faCartShopping,
    allowed: ["sales"],
    children: [
      { href: "/admin/sales/orders", label: "ออเดอร์", icon: faReceipt, allowed: ["sales"] },
      { href: "/admin/sales/orders/import", label: "นำเข้าออเดอร์", icon: faFileImport, allowed: ["sales"] },
      { href: "/admin/sales/customers", label: "ลูกค้า", icon: faUsers, allowed: ["sales"] },
    ],
  },
  {
    key: "tax",
    label: "เอกสารภาษี",
    icon: faFileInvoiceDollar,
    allowed: ["sales", "purchase"],
    children: [
      { href: "/admin/tax-documents/tax-invoices", label: "ใบกำกับภาษี / ใบเสร็จ", icon: faFileInvoice, allowed: ["sales"], needs: "view" },
      { href: "/admin/tax-documents/tax-invoices/manual", label: "ออกใบกำกับภาษี (กรอกเอง)", icon: faPenToSquare, allowed: ["sales"], needs: "create" },
      { href: "/admin/tax-documents/wht", label: "หนังสือหัก ณ ที่จ่าย", icon: faFileSignature, allowed: ["purchase"], needs: "view" },
      { href: "/admin/tax-documents/wht/new", label: "ออกหนังสือ 50 ทวิ", icon: faPenToSquare, allowed: ["purchase"], needs: "create" },
      { href: "/admin/tax-documents/company", label: "ข้อมูลบริษัท", icon: faBuilding, allowed: ["sales", "purchase"] },
    ],
  },
  {
    key: "purchase",
    label: "ภาษีซื้อ",
    icon: faTruck,
    allowed: ["purchase"],
    children: [
      { href: "/admin/purchase/bills", label: "รายการซื้อ", icon: faReceipt, allowed: ["purchase"] },
      { href: "/admin/purchase/payables", label: "ค้างจ่าย", icon: faScaleBalanced, allowed: ["purchase"] },
      { href: "/admin/purchase/suppliers", label: "ร้านค้า / ผู้ขาย", icon: faStore, allowed: ["purchase"] },
    ],
  },
  {
    key: "inventory",
    label: "คลังสินค้า & ผลิต",
    icon: faWarehouse,
    allowed: ["warehouse"],
    children: [
      { href: "/admin/inventory/production", label: "ใบผลิตสินค้า", icon: faIndustry, allowed: ["warehouse"] },
      { href: "/admin/inventory/stock", label: "สต๊อกคงเหลือ", icon: faBoxesStacked, allowed: ["warehouse"] },
      { href: "/admin/inventory/movements", label: "รับเข้า / เบิกออก", icon: faRightLeft, allowed: ["warehouse"] },
      { href: "/admin/inventory/count", label: "นับสต๊อก", icon: faClipboardCheck, allowed: ["warehouse"] },
      { href: "/admin/inventory/products", label: "สินค้า", icon: faTag, allowed: ["warehouse"] },
    ],
  },
  { key: "hr", label: "พนักงาน & เงินเดือน", icon: faUsers, href: "/admin/hr", allowed: ["hr"] },
  { key: "teams", label: "ทีม", icon: faPeopleGroup, href: "/admin/teams", allowed: ["hr"] },
  { key: "holidays", label: "วันหยุด & WFH", icon: faCalendarDays, href: "/admin/holidays", allowed: ["hr"] },
  { key: "users", label: "ผู้ใช้งานและสิทธิ์", icon: faUserShield, href: "/admin/users", allowed: [] },
  { key: "audit", label: "ประวัติการใช้งาน", icon: faClockRotateLeft, href: "/admin/audit-logs", allowed: [] },
  { key: "backup", label: "สำรองข้อมูล", icon: faDatabase, href: "/admin/backup", allowed: [] },
];

/** The menu filtered to what these roles/permissions may open (groups keep only allowed children). */
export function visibleNav(roles: Role[], docPermissions: readonly string[] = []): NavGroup[] {
  const can = (c: NavLink) => canAccess(roles, c.allowed) && (!c.needs || canDoc(docPermissions, c.needs));
  return NAV.filter((g) => canAccess(roles, g.allowed))
    .map((g) => (g.children ? { ...g, children: g.children.filter(can) } : g))
    .filter((g) => !g.children || g.children.length > 0);
}

/**
 * The menu href that best matches the current path: the longest href that
 * equals the path or is a parent of it (so /orders/import beats /orders,
 * and /tax-invoices/123 falls back to /tax-invoices). "/admin" only matches itself.
 */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const hit = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    if (hit && (!best || href.length > best.length)) best = href;
  }
  return best;
}

export function navGroup(key: string) {
  return NAV.find((g) => g.key === key);
}
