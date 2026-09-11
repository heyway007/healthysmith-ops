import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { Field } from "@/components/ui/field";
import { PasswordFields } from "@/components/ui/password-fields";
import { RoleCheckboxes } from "@/components/ui/role-checkboxes";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import { employeeLabel } from "@/lib/employee-picker";
import { createUser } from "../actions";

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("first_name, last_name, employee_code")
    .order("first_name");

  return (
    <div>
      <BackLink href="/admin/users" label="กลับไปหน้าผู้ใช้งาน" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">เพิ่มผู้ใช้งานใหม่</h2>
      <p className="mt-1 text-sm text-teal-600">
        ใช้หน้านี้สร้างบัญชี login ได้ทั้งสองแบบ — เจ้าหน้าที่หลังบ้าน (เลือกบทบาท) หรือพนักงานทั่วไปที่ใช้แค่ระบบพนักงาน (ไม่ต้องเลือกบทบาทเลย)
      </p>

      <div className={`mt-6 max-w-lg ${formCardClassName}`}>
        {error && (
          <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
        )}

        <form action={createUser} className="space-y-4">
          <Field label="อีเมล" name="email" type="email" required />
          <PasswordFields />

          <div>
            <label className="flex w-fit items-center gap-2 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900">
              <input type="checkbox" name="is_employee" value="1" className="accent-indigo-600" />
              พนักงาน (เข้าระบบพนักงานหน้าบ้านได้)
            </label>
            <p className="mt-1 text-xs text-teal-500">
              ติ๊กเพื่อให้บัญชีนี้เข้าระบบพนักงาน (ยื่นใบลา ดูข้อมูลตัวเอง ฯลฯ) ได้เลย — ระบบจะสร้างข้อมูลพนักงานให้อัตโนมัติ
              ไม่ต้องสร้างเอง แล้วให้พนักงานกรอกชื่อ-ข้อมูลส่วนตัวเองภายหลังตอนล็อกอินครั้งแรก
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
              className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <datalist id="employee-options">
              {(employees ?? []).map((e) => (
                <option key={e.employee_code} value={employeeLabel(e)} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-teal-500">
              ใส่เฉพาะกรณีมีข้อมูลพนักงานคนนี้อยู่ในระบบแล้ว (เช่น ฝ่ายบุคคลกรอกไว้ก่อนหน้า) เพื่อผูกกับคนเดิมแทนการสร้างใหม่
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-teal-800">
              บทบาทหลังบ้าน (เลือกได้มากกว่า 1 หรือไม่เลือกเลยก็ได้)
            </label>
            <div className="mt-1">
              <RoleCheckboxes defaultRoles={[]} />
            </div>
            <p className="mt-1 text-xs text-teal-500">
              ไม่เลือกเลย = พนักงานทั่วไป เข้าได้แค่ระบบพนักงาน (หน้าบ้าน) เท่านั้น ไม่เห็นเมนูหลังบ้านใดๆ
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" className={submitButtonClassName}>
              สร้างผู้ใช้งาน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
