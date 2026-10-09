"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faFileImport,
  faFileInvoice,
  faReceipt,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

const tabs = [
  { href: "/admin/sales/orders", label: "ออเดอร์", icon: faReceipt, exact: true },
  { href: "/admin/sales/orders/import", label: "นำเข้าออเดอร์", icon: faFileImport },
  { href: "/admin/sales/tax-invoices", label: "ใบกำกับภาษี", icon: faFileInvoice },
  { href: "/admin/sales/customers", label: "ลูกค้า", icon: faUsers },
  { href: "/admin/sales/settings", label: "ข้อมูลผู้ขาย", icon: faBuilding },
];

export function SalesNav() {
  const pathname = usePathname() ?? "";
  // "ออเดอร์" also covers order detail pages, but not the import tab.
  const isActive = (tab: (typeof tabs)[number]) =>
    tab.exact
      ? pathname === tab.href || (pathname.startsWith(tab.href + "/") && !pathname.startsWith(tab.href + "/import"))
      : pathname === tab.href || pathname.startsWith(tab.href + "/");

  return (
    <nav className="flex flex-wrap gap-1 border-b border-teal-100 pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive(tab)
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
