"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { Role } from "@/lib/role";
import { VersionBadge } from "@/components/ui/version-badge";
import { activeHref, visibleNav } from "./nav-config";

export function Sidebar({
  roles,
  docPermissions,
  version,
}: {
  roles: Role[];
  docPermissions: string[];
  version: string;
}) {
  const pathname = usePathname() ?? "";
  const groups = visibleNav(roles, docPermissions);
  const current = activeHref(
    pathname,
    groups.flatMap((g) => (g.children ? g.children.map((c) => c.href) : [g.href!])),
  );
  const currentGroup = groups.find((g) => g.children?.some((c) => c.href === current))?.key;

  // A group starts open when it holds the current page; clicking its header
  // overrides that either way.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (key: string) => toggled[key] ?? key === currentGroup;
  const toggle = (key: string) => setToggled((t) => ({ ...t, [key]: !isOpen(key) }));

  // The drawer's open/closed state lives entirely in the "mobile-nav"
  // checkbox (see app/admin/layout.tsx) via CSS peer-checked -- this just
  // resets that native, uncontrolled checkbox after navigating.
  useEffect(() => {
    const checkbox = document.getElementById("mobile-nav") as HTMLInputElement | null;
    if (checkbox) checkbox.checked = false;
  }, [pathname]);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full transform flex-col bg-linear-to-b from-teal-700 via-teal-800 to-teal-950 shadow-xl transition-transform duration-200 peer-checked:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
        <div>
          <p className="font-semibold text-white">ระบบบัญชีและหลังบ้าน</p>
          <p className="mt-0.5 text-xs text-teal-200">Sales · Purchase · HR</p>
          <VersionBadge version={version} tone="dark" className="mt-1.5" />
        </div>
        <label htmlFor="mobile-nav" className="cursor-pointer text-teal-200 hover:text-white lg:hidden" aria-label="ปิดเมนู">
          <FontAwesomeIcon icon={faXmark} />
        </label>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {groups.map((g) => {
          if (!g.children) {
            const active = current === g.href;
            return (
              <Link
                key={g.key}
                href={g.href!}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-linear-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-900/30"
                    : "text-teal-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={g.icon} className="text-base" fixedWidth />
                {g.label}
              </Link>
            );
          }

          const expanded = isOpen(g.key);
          const holdsCurrent = g.key === currentGroup;
          const panelId = `nav-group-${g.key}`;
          return (
            <div key={g.key}>
              <button
                type="button"
                onClick={() => toggle(g.key)}
                aria-expanded={expanded}
                aria-controls={panelId}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                  holdsCurrent ? "bg-white/10 text-white" : "text-teal-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={g.icon} className="text-base" fixedWidth />
                <span className="flex-1">{g.label}</span>
                {holdsCurrent && !expanded && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" aria-hidden />}
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-[10px] text-teal-300 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded && (
                <ul id={panelId} className="mb-1 ml-5 mt-1 space-y-0.5 border-l border-white/15 pl-2">
                  {g.children.map((c) => {
                    const active = current === c.href;
                    return (
                      <li key={c.href}>
                        <Link
                          href={c.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-all ${
                            active
                              ? "bg-linear-to-r from-orange-500 to-orange-600 font-medium text-white shadow-md shadow-orange-900/30"
                              : "text-teal-200 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <FontAwesomeIcon icon={c.icon} className="text-xs opacity-80" fixedWidth />
                          {c.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
