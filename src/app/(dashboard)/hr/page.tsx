import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { deleteEmployee } from "./actions";
import { DeleteButton } from "@/components/ui/delete-button";
import { EMPLOYMENT_TYPES } from "./employment-types";

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: employees }, { data: departments }, { data: positions }] = await Promise.all([
    supabase.from("employees").select("*").order("created_at", { ascending: false }),
    supabase.from("departments").select("*").order("name"),
    supabase.from("positions").select("*").order("name"),
  ]);

  const departmentNameById = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const positionNameById = new Map((positions ?? []).map((p) => [p.id, p.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">👥 พนักงาน & เงินเดือน</h1>
          <p className="mt-1 text-teal-700">
            รายชื่อพนักงาน — การลา / OT / เงินเดือน / Payroll ฯลฯ จะสร้างต่อไป
          </p>
        </div>
        <Link
          href="/hr/new"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 transition-colors hover:from-orange-600 hover:to-orange-700"
        >
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มพนักงานใหม่
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3">แผนก / ตำแหน่ง</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">เงินเดือน</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((e) => (
              <tr key={e.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link href={`/hr/${e.id}`} className="text-teal-800 hover:text-orange-600">
                    {e.employee_code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-950">
                  <Link href={`/hr/${e.id}`} className="hover:text-orange-600">
                    {e.prefix_name ?? ""}
                    {e.first_name} {e.last_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">
                  {(e.department_id && departmentNameById.get(e.department_id)) ?? "-"} /{" "}
                  {(e.position_id && positionNameById.get(e.position_id)) ?? "-"}
                </td>
                <td className="px-4 py-3 text-teal-700">
                  {EMPLOYMENT_TYPES[e.employment_type] ?? e.employment_type}
                </td>
                <td className="px-4 py-3 text-teal-700">{e.base_salary.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deleteEmployee.bind(null, e.id)}
                    confirmMessage={`ลบพนักงาน "${e.first_name} ${e.last_name}"?`}
                  />
                </td>
              </tr>
            ))}
            {(!employees || employees.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีข้อมูลพนักงาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
