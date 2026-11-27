import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { getPaging } from "@/lib/pagination";
import { deleteEmployee } from "./actions";
import { EmployeeList, type EmployeeRow } from "./employee-list";

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const paging = await getPaging(sp);
  const supabase = await createClient();

  const [{ data: employees }, { data: departments }, { data: positions }] = await Promise.all([
    supabase.from("employees").select("*").order("created_at", { ascending: false }),
    supabase.from("departments").select("*").order("name"),
    supabase.from("positions").select("*").order("name"),
  ]);

  const departmentNameById = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const positionNameById = new Map((positions ?? []).map((p) => [p.id, p.name]));

  // Only what the list shows -- salary and other personal data never go to the browser here.
  const rows: EmployeeRow[] = (employees ?? []).map((e) => ({
    id: e.id,
    employee_code: e.employee_code,
    prefix_name: e.prefix_name,
    first_name: e.first_name,
    last_name: e.last_name,
    nickname: e.nickname,
    scan_code: e.scan_code,
    phone: e.phone,
    department: (e.department_id && departmentNameById.get(e.department_id)) || null,
    position: (e.position_id && positionNameById.get(e.position_id)) || null,
    employment_type: e.employment_type,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">รายชื่อพนักงาน</h2>
          <p className="mt-1 text-sm text-teal-700">ข้อมูลพนักงานทั้งหมดในระบบ</p>
        </div>
        <Link
          href="/admin/hr/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มพนักงานใหม่
        </Link>
      </div>

      {sp.notice && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ {sp.notice}
        </p>
      )}

      {sp.error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{sp.error}</p>
      )}

      <EmployeeList
        employees={rows}
        departments={(departments ?? []).map((d) => d.name)}
        pageSize={paging.size}
        deleteEmployee={deleteEmployee}
      />
    </div>
  );
}
