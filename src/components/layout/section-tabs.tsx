"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Role } from "@/lib/role";
import { activeHref, visibleNav } from "./nav-config";

/** Tab bar at the top of a section -- the same sub-items as its sidebar group. */
export function SectionTabs({
  group,
  roles,
  docPermissions = [],
}: {
  group: string;
  roles: Role[];
  docPermissions?: string[];
}) {
  const pathname = usePathname() ?? "";
  const tabs = visibleNav(roles, docPermissions).find((g) => g.key === group)?.children ?? [];
  const current = activeHref(pathname, tabs.map((t) => t.href));

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-teal-100 px-4 pb-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={current === tab.href ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            current === tab.href
              ? "bg-linear-to-r from-teal-600 to-teal-700 text-white shadow-sm"
              : "text-teal-700 hover:bg-teal-50"
          }`}
        >
          <FontAwesomeIcon icon={tab.icon} className="text-xs" />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
