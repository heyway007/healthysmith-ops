"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPeopleGroup } from "@fortawesome/free-solid-svg-icons";

const tabs = [
  { href: "/admin/hr", label: "พนักงาน", icon: faUsers },
  { href: "/admin/hr/teams", label: "ทีม", icon: faPeopleGroup },
];

export function HrNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-teal-100 pb-3">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin/hr"
            ? pathname === "/admin/hr" || (pathname?.startsWith("/admin/hr/") && !pathname?.startsWith("/admin/hr/teams"))
            : pathname === tab.href || pathname?.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-linear-to-r from-teal-600 to-teal-700 text-white shadow-sm"
                : "text-teal-700 hover:bg-teal-50"
            }`}
          >
            <FontAwesomeIcon icon={tab.icon} className="text-xs" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
