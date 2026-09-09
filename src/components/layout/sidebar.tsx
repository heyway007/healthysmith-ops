"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faCartShopping,
  faTruck,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { href: "/", label: "หน้าหลัก", icon: faGaugeHigh },
  { href: "/sales", label: "ระบบขาย", icon: faCartShopping },
  { href: "/purchase", label: "ระบบจัดซื้อ", icon: faTruck },
  { href: "/hr", label: "พนักงาน & เงินเดือน", icon: faUsers },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-linear-to-b from-teal-700 via-teal-800 to-teal-950 shadow-xl">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-semibold text-white">ระบบบัญชีและหลังบ้าน</p>
        <p className="text-xs text-teal-200 mt-0.5">Sales · Purchase · HR</p>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
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
