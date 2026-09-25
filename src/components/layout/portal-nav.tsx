"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "หน้าหลัก", public: false },
  { href: "/leave", label: "ใบลาของฉัน", public: false },
  { href: "/holidays", label: "วันหยุดบริษัท", public: true },
  { href: "/profile", label: "โปรไฟล์ของฉัน", public: false },
];

/** Front-office menu; visitors who aren't signed in only see the public pages. */
export function PortalNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => signedIn || item.public);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
              active ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-700 hover:bg-indigo-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
