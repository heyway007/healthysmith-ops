"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReceipt, faStore, faScaleBalanced } from "@fortawesome/free-solid-svg-icons";

const tabs = [
  { href: "/admin/purchase/bills", label: "รายการซื้อ", icon: faReceipt },
  { href: "/admin/purchase/payables", label: "ค้างจ่าย", icon: faScaleBalanced },
  { href: "/admin/purchase/suppliers", label: "ร้านค้า / ผู้ขาย", icon: faStore },
];

export function PurchaseNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-teal-100 pb-3">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
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
