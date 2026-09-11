import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BackLink } from "@/components/ui/back-link";
import { Field } from "@/components/ui/field";
import { PasswordFields } from "@/components/ui/password-fields";
import { RoleCheckboxes } from "@/components/ui/role-checkboxes";
import {
  dangerButtonClassName,
  formCardClassName,
  secondaryButtonClassName,
  submitButtonClassName,
} from "@/lib/ui-classes";
import { employeeLabel } from "@/lib/employee-picker";
import { updateUser, setUserActive } from "../actions";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: userRole }, { data: employees }, { data: authUserData }] = await Promise.all([
    supabase.from("user_roles").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("employees").select("id, first_name, last_name, employee_code").order("first_name"),
    createAdminClient().auth.admin.getUserById(id),
  ]);
  const authUser = authUserData.user;

  if (!userRole || !authUser) notFound();

  const currentEmployeeLabel = (() => {
    const match = employees?.find((e) => e.id === userRole.employee_id);
    return match ? employeeLabel(match) : "";
  })();

  return (
    <div>
      <BackLink href="/admin/users" label="กลับไปหน้าผู้ใช้งาน" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-teal-950">แก้ไขผู้ใช้งาน — {authUser.email}</h2>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            userRole.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
          }`}
        >
          {userRole.is_active ? "ใช้งานอยู่" : "ปิดการใช้งาน"}
        </span>
      </div>

      <div className={`mt-6 max-w-lg ${formCardClassName}`}>
        {error && (
          <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
        )}

        <form action={updateUser.bind(null, id)} className="space-y-4">
          <Field label="อีเมล" name="email" type="email" required defaultValue={authUser.email} />
          <div>
            <label className="flex w-fit items-center gap-2 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900">
              <input
                type="checkbox"
                name="is_employee"
                value="1"
                defaultChecked={!!currentEmployeeLabel}
                className="accent-indigo-600"
              />
              พนักงาน (เข้าระบบพนักงานหน้าบ้านได้)
            </label>
            <p className="mt-1 text-xs text-teal-500">
              ติ๊กเพื่อให้บัญชีนี้เข้าระบบพนักงาน (ยื่นใบลา ดูข้อมูลตัวเอง ฯลฯ) ได้เลย — ถ้ายังไม่มีข้อมูลพนักงานผูกอยู่
              ระบบจะสร้างให้อัตโนมัติ แล้วให้พนักงานกรอกชื่อ-ข้อมูลส่วนตัวเองภายหลัง
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-800">
              ผูกกับพนักงานที่มีอยู่แล้ว (ไม่บังคับ)
            </label>
            <input
              name="employee_label"
              list="employee-options"
              autoComplete="off"
              defaultValue={currentEmployeeLabel}
              className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <datalist id="employee-options">
              {(employees ?? []).map((e) => (
                <option key={e.employee_code} value={employeeLabel(e)} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-teal-500">
              ใส่เฉพาะกรณีมีข้อมูลพนักงานคนนี้อยู่ในระบบแล้ว เพื่อผูกกับคนเดิมแทนการสร้างใหม่
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-800">
              บทบาทหลังบ้าน (เลือกได้มากกว่า 1 หรือไม่เลือกเลยก็ได้)
            </label>
            <div className="mt-1">
              <RoleCheckboxes defaultRoles={userRole.roles} />
            </div>
            <p className="mt-1 text-xs text-teal-500">
              ไม่เลือกเลย = พนักงานทั่วไป เข้าได้แค่ระบบพนักงาน (หน้าบ้าน) เท่านั้น ไม่เห็นเมนูหลังบ้านใดๆ
            </p>
          </div>

          <div className="border-t border-teal-100 pt-4">
            <PasswordFields required={false} label="ตั้งรหัสผ่านใหม่" />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" className={submitButtonClassName}>
              บันทึก
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-teal-100 pt-5">
          <form action={setUserActive.bind(null, id, !userRole.is_active)}>
            <button
              type="submit"
              className={userRole.is_active ? dangerButtonClassName : secondaryButtonClassName}
            >
              {userRole.is_active ? "ปิดการใช้งานบัญชีนี้" : "เปิดการใช้งานบัญชีนี้"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
