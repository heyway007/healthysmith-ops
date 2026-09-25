"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faCartShopping,
  faTruck,
  faUsers,
  faPeopleGroup,
  faCalendarDays,
  faUserShield,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { canAccess, type Role } from "@/lib/role";

const navItems: { href: string; label: string; icon: typeof faGaugeHigh; allowed: Role[] }[] = [
  { href: "/admin", label: "หน้าหลัก", icon: faGaugeHigh, allowed: ["admin", "sales", "purchase", "hr"] },
  { href: "/admin/sales", label: "ระบบขาย", icon: faCartShopping, allowed: ["sales"] },
  { href: "/admin/purchase", label: "ระบบจัดซื้อ", icon: faTruck, allowed: ["purchase"] },
  { href: "/admin/hr", label: "พนักงาน & เงินเดือน", icon: faUsers, allowed: ["hr"] },
  { href: "/admin/teams", label: "ทีม", icon: faPeopleGroup, allowed: ["hr"] },
  { href: "/admin/holidays", label: "วันหยุด & WFH", icon: faCalendarDays, allowed: ["hr"] },
  { href: "/admin/users", label: "ผู้ใช้งานและสิทธิ์", icon: faUserShield, allowed: [] },
];

export function Sidebar({ roles }: { roles: Role[] }) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => canAccess(roles, item.allowed));

  // The drawer's open/closed state lives entirely in the "mobile-nav"
  // checkbox (see app/admin/layout.tsx) via CSS peer-checked -- this just
  // resets that native, uncontrolled checkbox after navigating.
  useEffect(() => {
    const checkbox = document.getElementById("mobile-nav") as HTMLInputElement | null;
    if (checkbox) checkbox.checked = false;
  }, [pathname]);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 shrink-0 -translate-x-full transform bg-linear-to-b from-teal-700 via-teal-800 to-teal-950 shadow-xl transition-transform duration-200 peer-checked:translate-x-0 lg:static lg:translate-x-0">
      <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/10">
        <div>
          <p className="font-semibold text-white">ระบบบัญชีและหลังบ้าน</p>
          <p className="text-xs text-teal-200 mt-0.5">Sales · Purchase · HR</p>
        </div>
        <label
          htmlFor="mobile-nav"
          className="cursor-pointer text-teal-200 hover:text-white lg:hidden"
          aria-label="ปิดเมนู"
        >
          <FontAwesomeIcon icon={faXmark} />
        </label>
      </div>
      <nav className="p-3 space-y-1">
        {visibleItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-linear-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-900/30"
                  : "text-teal-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="text-base" fixedWidth />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
