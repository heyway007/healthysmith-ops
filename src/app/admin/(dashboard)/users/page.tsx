import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitButtonClassName } from "@/lib/ui-classes";
import { ROLE_LABELS, type Role } from "@/lib/role";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: userRoles }, { data: employees }, { data: authUsersData }] = await Promise.all([
    supabase.from("user_roles").select("*").order("created_at", { ascending: false }),
    supabase.from("employees").select("id, first_name, last_name"),
    createAdminClient().auth.admin.listUsers({ perPage: 200 }),
  ]);
  const authUsers = authUsersData.users;

  const employeeNameById = new Map((employees ?? []).map((e) => [e.id, `${e.first_name} ${e.last_name}`]));
  const emailByUserId = new Map((authUsers ?? []).map((u) => [u.id, u.email ?? "-"]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">ผู้ใช้งานและสิทธิ์</h1>
          <p className="mt-1 text-teal-700">จัดการบัญชีเข้าสู่ระบบและบทบาทการเข้าถึงแต่ละโมดูล</p>
        </div>
        <Link href="/admin/users/new" className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}>
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มผู้ใช้งาน
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">อีเมล</th>
              <th className="px-4 py-3">ผูกกับพนักงาน</th>
              <th className="px-4 py-3">บทบาท</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {userRoles?.map((u) => (
              <tr key={u.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${u.user_id}`}
                    className="font-medium text-teal-950 hover:text-orange-600"
                  >
                    {emailByUserId.get(u.user_id) ?? "-"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">
                  {(u.employee_id && employeeNameById.get(u.employee_id)) ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.roles as Role[]).length === 0 ? (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        พนักงานทั่วไป
                      </span>
                    ) : (
                      (u.roles as Role[]).map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700"
                        >
                          {ROLE_LABELS[r]}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {u.is_active ? "ใช้งานอยู่" : "ปิดการใช้งาน"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.user_id}`}
                    className="rounded-full border border-teal-200 p-1.5 text-teal-600 hover:border-orange-300 hover:text-orange-600"
                    title="แก้ไข"
                  >
                    <FontAwesomeIcon icon={faPen} className="text-xs" />
                  </Link>
                </td>
              </tr>
            ))}
            {(!userRoles || userRoles.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีผู้ใช้งาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
