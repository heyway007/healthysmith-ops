import { createClient } from "@/lib/supabase/server";
import { getCurrentEmployee } from "@/lib/current-employee";
import { cardClassName } from "../ui";
import { ProfileForm } from "./profile-form";
import { PROFILE_FIELDS, type ProfileValues } from "./schema";

export default async function ProfilePage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();
  const [{ data: profile }, { data: department }, { data: position }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", employee.id).single(),
    employee.department_id
      ? supabase.from("departments").select("name").eq("id", employee.department_id).maybeSingle()
      : Promise.resolve({ data: null }),
    employee.position_id
      ? supabase.from("positions").select("name").eq("id", employee.position_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const initialValues = Object.fromEntries(
    PROFILE_FIELDS.map((f) => [f, profile?.[f] ?? ""]),
  ) as ProfileValues;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-mist-900">โปรไฟล์ของฉัน</h1>
      <p className="mt-1 text-mist-600">
        แก้ไขข้อมูลส่วนตัวของคุณเองได้ที่นี่ — ข้อมูลการจ้างงาน (แผนก ตำแหน่ง เงินเดือน) ติดต่อฝ่ายบุคคลให้แก้ไขแทน
      </p>

      <div className={`mt-6 ${cardClassName}`}>
        <ProfileForm initialValues={initialValues}>
          <section className="border-t border-mist-200 pt-6">
            <h2 className="text-sm font-semibold text-mist-900">ข้อมูลการจ้างงาน (แก้ไขไม่ได้)</h2>
            <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3 xl:grid-cols-4">
              <ReadOnly label="รหัสพนักงาน" value={employee.employee_code} />
              <ReadOnly label="แผนก" value={department?.name ?? "-"} />
              <ReadOnly label="ตำแหน่ง" value={position?.name ?? "-"} />
            </dl>
            <p className="mt-2 text-xs text-mist-400">
              หากข้อมูลด้านบนไม่ถูกต้อง กรุณาติดต่อฝ่ายบุคคล
            </p>
          </section>
        </ProfileForm>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-mist-500">{label}</dt>
      <dd className="mt-1 text-mist-900">{value}</dd>
    </div>
  );
}
