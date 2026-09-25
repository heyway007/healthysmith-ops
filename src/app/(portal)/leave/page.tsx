import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentEmployee } from "@/lib/current-employee";
import { primaryButtonClassName } from "../ui";
import { LEAVE_STATUS } from "./status";

export default async function LeaveListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();
  const [{ data: requests }, { data: leaveTypes }] = await Promise.all([
    supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employee.id)
      .order("start_date", { ascending: false }),
    supabase.from("leave_types").select("id, name"),
  ]);
  const leaveTypeNameById = new Map((leaveTypes ?? []).map((lt) => [lt.id, lt.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-mist-900">ใบลาของฉัน</h1>
        <Link href="/leave/new" className={`flex shrink-0 items-center gap-2 ${primaryButtonClassName}`}>
          <FontAwesomeIcon icon={faPlus} />
          ยื่นใบลาใหม่
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-mist-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 bg-mist-150 text-left text-xs font-medium uppercase text-mist-700">
              <th className="px-4 py-3">ประเภทการลา</th>
              <th className="px-4 py-3">วันที่ลา</th>
              <th className="px-4 py-3">จำนวนวัน</th>
              <th className="px-4 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {requests?.map((r) => (
              <tr key={r.id} className="border-t border-mist-200 hover:bg-mist-100">
                <td className="px-4 py-3">
                  <Link href={`/leave/${r.id}`} className="font-medium text-mist-800 hover:text-mist-500">
                    {leaveTypeNameById.get(r.leave_type_id) ?? "-"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-mist-700">
                  {r.start_date === r.end_date ? r.start_date : `${r.start_date} — ${r.end_date}`}
                </td>
                <td className="px-4 py-3 text-mist-700">{r.days_count}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} config={LEAVE_STATUS} />
                </td>
              </tr>
            ))}
            {(!requests || requests.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-mist-400">
                  ยังไม่มีใบลา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
