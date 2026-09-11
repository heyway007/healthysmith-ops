import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping, faTruck, faUsers, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const modules = [
  {
    href: "/admin/sales",
    icon: faCartShopping,
    title: "🛒 ระบบขาย (Sales)",
    desc: "ออเดอร์ / ลูกค้า / ใบเสนอราคา / ใบแจ้งหนี้ / ใบเสร็จ / การจัดส่ง",
  },
  {
    href: "/admin/purchase",
    icon: faTruck,
    title: "🛍️ ระบบจัดซื้อ (Purchase)",
    desc: "Supplier / PR / PO / รับสินค้า / บิลซื้อ / เจ้าหนี้",
  },
  {
    href: "/admin/hr",
    icon: faUsers,
    title: "👩‍💼 พนักงาน & เงินเดือน (HR)",
    desc: "ข้อมูลพนักงาน / OT / Bonus / รอบเงินเดือน / Payslip",
  },
];

export default function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">ภาพรวมระบบ</h1>
      <p className="mt-1 text-teal-700">
        Database schema สำหรับ 3 โมดูลแรกพร้อมใช้งานแล้ว เลือกโมดูลเพื่อดูรายละเอียด
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-2xl border border-teal-100 bg-linear-to-b from-white to-teal-50/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-900/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-teal-400 to-cyan-600 text-white shadow-md shadow-teal-900/20">
              <FontAwesomeIcon icon={m.icon} className="text-lg" />
            </div>
            <p className="mt-3 font-medium text-teal-950">{m.title}</p>
            <p className="mt-1 text-sm text-teal-700">{m.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-500 group-hover:gap-2 transition-all">
              เปิดดู <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
