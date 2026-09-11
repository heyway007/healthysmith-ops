import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { HOLIDAY_TYPES } from "@/lib/holiday-types";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) || new Date().getFullYear();

  const supabase = await createClient();
  const { data: holidays } = await supabase
    .from("company_holidays")
    .select("*")
    .gte("holiday_date", `${year}-01-01`)
    .lte("holiday_date", `${year}-12-31`)
    .order("holiday_date", { ascending: true });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-indigo-950">วันหยุดบริษัท</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/holidays?year=${year - 1}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </Link>
          <span className="min-w-16 text-center font-medium text-indigo-900">พ.ศ. {year + 543}</span>
          <Link
            href={`/holidays?year=${year + 1}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </Link>
        </div>
      </div>
      <p className="mt-1 text-indigo-600">ปฏิทินวันหยุดประจำปีและวัน Work From Home ของบริษัท</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-indigo-100 bg-linear-to-r from-indigo-50 to-amber-50 text-left text-xs font-medium uppercase text-indigo-700">
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">ชื่อวันหยุด</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {holidays?.map((h) => (
              <tr key={h.id} className="border-t border-indigo-100">
                <td className="px-4 py-3 font-medium text-indigo-950">
                  {new Date(h.holiday_date).toLocaleDateString("th-TH", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-indigo-900">{h.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={h.type} config={HOLIDAY_TYPES} />
                </td>
                <td className="px-4 py-3 text-indigo-600">{h.note ?? "-"}</td>
              </tr>
            ))}
            {(!holidays || holidays.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-indigo-400">
                  ยังไม่มีข้อมูลวันหยุดในปีนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
