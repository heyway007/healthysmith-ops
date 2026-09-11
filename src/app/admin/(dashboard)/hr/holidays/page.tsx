import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteHoliday } from "./actions";
import { HOLIDAY_TYPES } from "@/lib/holiday-types";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: holidays } = await supabase
    .from("company_holidays")
    .select("*")
    .order("holiday_date", { ascending: true });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">วันหยุดบริษัท</h2>
          <p className="mt-1 text-sm text-teal-700">
            ปฏิทินวันหยุดประจำปีและวัน Work From Home — พนักงานดูได้จากหน้าบ้าน
          </p>
        </div>
        <Link
          href="/admin/hr/holidays/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มวันหยุด
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">ชื่อวันหยุด</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">หมายเหตุ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {holidays?.map((h) => (
              <tr key={h.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/hr/holidays/${h.id}`} className="font-medium hover:text-orange-600">
                    {new Date(h.holiday_date).toLocaleDateString("th-TH", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-950">{h.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={h.type} config={HOLIDAY_TYPES} />
                </td>
                <td className="px-4 py-3 text-teal-700">{h.note ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deleteHoliday.bind(null, h.id)}
                    confirmMessage={`ลบวันหยุด "${h.name}"?`}
                  />
                </td>
              </tr>
            ))}
            {(!holidays || holidays.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีข้อมูลวันหยุด
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
