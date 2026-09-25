import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarPlus, faClipboardList, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { getCurrentEmployee } from "@/lib/current-employee";

export default async function PortalHomePage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null; // layout shows the "not linked" message instead

  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [{ data: leaveTypes }, { data: approved }, { data: pending }] = await Promise.all([
    supabase.from("leave_types").select("*").order("name"),
    supabase
      .from("leave_requests")
      .select("leave_type_id, days_count, start_date")
      .eq("employee_id", employee.id)
      .eq("status", "approved"),
    supabase
      .from("leave_requests")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("status", "pending"),
  ]);

  const usedByType = new Map<string, number>();
  for (const r of approved ?? []) {
    if (new Date(r.start_date).getFullYear() !== currentYear) continue;
    usedByType.set(r.leave_type_id, (usedByType.get(r.leave_type_id) ?? 0) + r.days_count);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-mist-900">
          สวัสดี {employee.prefix_name}
          {employee.first_name}
        </h1>
        <p className="mt-1 text-mist-600">สรุปวันลาและสิทธิ์การลาของคุณ ปี {currentYear + 543}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/leave/new"
          className="group flex items-center gap-4 rounded-2xl border border-mist-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <FontAwesomeIcon icon={faCalendarPlus} className="text-lg" />
          </div>
          <div>
            <p className="font-medium text-mist-900">ยื่นใบลาใหม่</p>
            <p className="text-sm text-mist-600">แจ้งลาป่วย ลากิจ หรือลาพักร้อน</p>
          </div>
        </Link>
        <Link
          href="/leave"
          className="group flex items-center gap-4 rounded-2xl border border-mist-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist-100 text-mist-700">
            <FontAwesomeIcon icon={faClipboardList} className="text-lg" />
          </div>
          <div>
            <p className="font-medium text-mist-900">ใบลาของฉัน</p>
            <p className="text-sm text-mist-600">ดูประวัติและสถานะคำขอลา</p>
          </div>
        </Link>
        <Link
          href="/holidays"
          className="group flex items-center gap-4 rounded-2xl border border-mist-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <FontAwesomeIcon icon={faCalendarDays} className="text-lg" />
          </div>
          <div>
            <p className="font-medium text-mist-900">วันหยุดบริษัท</p>
            <p className="text-sm text-mist-600">ดูวันหยุดและวัน WFH ทั้งปี</p>
          </div>
        </Link>
      </div>

      {pending && pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">มีคำขอลารออนุมัติ {pending.length} รายการ</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-mist-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 bg-mist-150 text-left text-xs font-medium uppercase text-mist-700">
              <th className="px-4 py-3">ประเภทการลา</th>
              <th className="px-4 py-3">สิทธิ์ต่อปี</th>
              <th className="px-4 py-3">ใช้ไปแล้ว</th>
              <th className="px-4 py-3">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes?.map((lt) => {
              const used = usedByType.get(lt.id) ?? 0;
              const remaining = lt.max_days_per_year != null ? lt.max_days_per_year - used : null;
              return (
                <tr key={lt.id} className="border-t border-mist-200">
                  <td className="px-4 py-3 text-mist-900">{lt.name}</td>
                  <td className="px-4 py-3 text-mist-700">{lt.max_days_per_year ?? "ไม่จำกัด"}</td>
                  <td className="px-4 py-3 text-mist-700">{used}</td>
                  <td className="px-4 py-3 font-medium text-mist-900">{remaining ?? "-"}</td>
                </tr>
              );
            })}
            {(!leaveTypes || leaveTypes.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-mist-400">
                  ยังไม่มีประเภทการลาในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
