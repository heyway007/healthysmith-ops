import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowUpRightFromSquare,
  faCalendarDays,
  faCartShopping,
  faPeopleGroup,
  faTruck,
  faUserShield,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRoles } from "@/lib/current-role";
import { canAccess, type Role } from "@/lib/role";
import { bangkokToday, formatThaiDate } from "@/components/holidays/holiday-views";

type Module = {
  href: string;
  icon: typeof faUsers;
  title: string;
  desc: string;
  allowed: Role[]; // [] = admin only (canAccess always lets admin in)
  stat?: string;
};

export default async function DashboardHome() {
  const roles = await getCurrentRoles();
  const isHr = canAccess(roles, ["hr"]);

  // Live figures for the HR-side modules (only fetched for people who can see them).
  let teamStat: string | undefined;
  let holidayStat: string | undefined;
  if (isHr) {
    const today = bangkokToday();
    const [y, m] = today.split("-").map(Number);
    const monthStart = `${today.slice(0, 7)}-01`;
    // Real last day of the month -- e.g. "2026-09-31" would be rejected by Postgres.
    const monthEnd = `${today.slice(0, 7)}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
    const supabase = await createClient();
    const [{ count: teamCount }, { count: memberCount }, { data: nextHoliday }, { count: wfhThisMonth }] =
      await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("employees").select("id", { count: "exact", head: true }).not("team_id", "is", null),
        supabase
          .from("company_holidays")
          .select("holiday_date, name")
          .eq("type", "holiday")
          .gte("holiday_date", today)
          .order("holiday_date")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("company_holidays")
          .select("id", { count: "exact", head: true })
          .eq("type", "wfh")
          .gte("holiday_date", monthStart)
          .lte("holiday_date", monthEnd),
      ]);
    teamStat = `${teamCount ?? 0} ทีม · สมาชิก ${memberCount ?? 0} คน`;
    holidayStat = [
      nextHoliday
        ? `วันหยุดถัดไป ${formatThaiDate(nextHoliday.holiday_date, { day: "numeric", month: "short" })} ${nextHoliday.name}`
        : "ยังไม่มีวันหยุดข้างหน้า",
      `WFH เดือนนี้ ${wfhThisMonth ?? 0} วัน`,
    ].join(" · ");
  }

  const modules: Module[] = [
    {
      href: "/admin/sales",
      icon: faCartShopping,
      title: "🛒 ระบบขาย (Sales)",
      desc: "ออเดอร์ / ลูกค้า / ใบเสนอราคา / ใบแจ้งหนี้ / ใบเสร็จ / การจัดส่ง",
      allowed: ["sales"],
    },
    {
      href: "/admin/purchase",
      icon: faTruck,
      title: "🛍️ ระบบจัดซื้อ (Purchase)",
      desc: "Supplier / PR / PO / รับสินค้า / บิลซื้อ / เจ้าหนี้",
      allowed: ["purchase"],
    },
    {
      href: "/admin/hr",
      icon: faUsers,
      title: "👩‍💼 พนักงาน & เงินเดือน (HR)",
      desc: "ข้อมูลพนักงาน / ทีมที่สังกัด / ข้อมูลภาษี / OT / Bonus / รอบเงินเดือน / Payslip",
      allowed: ["hr"],
    },
    {
      href: "/admin/teams",
      icon: faPeopleGroup,
      title: "👥 ทีม",
      desc: "จัดกลุ่มพนักงานเป็นทีม ใช้กำหนดวัน WFH แยกตามทีม",
      allowed: ["hr"],
      stat: teamStat,
    },
    {
      href: "/admin/holidays",
      icon: faCalendarDays,
      title: "📅 วันหยุด & WFH",
      desc: "ปฏิทินวันหยุดบริษัท / WFH ประจำสัปดาห์แยกทีม / พิมพ์ปฏิทิน",
      allowed: ["hr"],
      stat: holidayStat,
    },
    {
      href: "/admin/users",
      icon: faUserShield,
      title: "🔐 ผู้ใช้งานและสิทธิ์",
      desc: "บัญชีผู้ใช้หลังบ้าน / สิทธิ์ตามฝ่าย / ผูกบัญชีพนักงานกับหน้าบ้าน",
      allowed: [],
    },
  ];
  const visible = modules.filter((m) => canAccess(roles, m.allowed));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">ภาพรวมระบบ</h1>
      <p className="mt-1 text-teal-700">เลือกโมดูลเพื่อเริ่มใช้งาน — แสดงเฉพาะโมดูลที่บัญชีของคุณมีสิทธิ์</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col rounded-2xl border border-teal-100 bg-linear-to-b from-white to-teal-50/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-900/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-teal-400 to-cyan-600 text-white shadow-md shadow-teal-900/20">
              <FontAwesomeIcon icon={m.icon} className="text-lg" />
            </div>
            <p className="mt-3 font-medium text-teal-950">{m.title}</p>
            <p className="mt-1 text-sm text-teal-700">{m.desc}</p>
            {m.stat && (
              <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-teal-800 ring-1 ring-teal-100">{m.stat}</p>
            )}
            <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-orange-500 transition-all group-hover:gap-2">
              เปิดดู <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-teal-950">หน้าบ้าน (สำหรับพนักงาน)</h2>
        <p className="mt-1 text-sm text-teal-700">
          พนักงานใช้หน้าบ้านยื่นใบลา ดูวันหยุด และแก้ข้อมูลส่วนตัว — ล็อกอินแยกจากหลังบ้าน
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="/holidays"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50"
          >
            <FontAwesomeIcon icon={faCalendarDays} />
            ปฏิทินวันหยุด (เปิดดูได้โดยไม่ต้องล็อกอิน)
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
          </a>
          <a
            href="/login"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50"
          >
            <FontAwesomeIcon icon={faUsers} />
            หน้าเข้าสู่ระบบพนักงาน
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
          </a>
        </div>
      </section>
    </div>
  );
}
