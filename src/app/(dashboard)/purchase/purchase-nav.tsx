"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faCartFlatbed,
  faTruckRampBox,
  faFileInvoiceDollar,
  faTruck,
  faScaleBalanced,
} from "@fortawesome/free-solid-svg-icons";

const tabs = [
  { href: "/purchase/requests", label: "ขอซื้อ (PR)", icon: faFileLines },
  { href: "/purchase/orders", label: "ใบสั่งซื้อ (PO)", icon: faCartFlatbed },
  { href: "/purchase/receipts", label: "ใบรับสินค้า (GR)", icon: faTruckRampBox },
  { href: "/purchase/bills", label: "บิลซื้อ", icon: faFileInvoiceDollar },
  { href: "/purchase/suppliers", label: "ซัพพลายเออร์", icon: faTruck },
  { href: "/purchase/payables", label: "ยอดค้างจ่าย", icon: faScaleBalanced },
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
