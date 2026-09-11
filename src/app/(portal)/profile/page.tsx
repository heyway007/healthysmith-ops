import { createClient } from "@/lib/supabase/server";
import { getCurrentEmployee } from "@/lib/current-employee";
import { PREFIX_NAMES } from "@/lib/prefix-names";
import { cardClassName, inputClassName, primaryButtonClassName } from "../ui";
import { updateProfile } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-indigo-950">โปรไฟล์ของฉัน</h1>
      <p className="mt-1 text-indigo-600">
        แก้ไขข้อมูลส่วนตัวของคุณเองได้ที่นี่ — ข้อมูลการจ้างงาน (แผนก ตำแหน่ง เงินเดือน) ติดต่อฝ่ายบุคคลให้แก้ไขแทน
      </p>

      {saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">บันทึกข้อมูลเรียบร้อยแล้ว</p>
      )}
      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className={`mt-6 max-w-2xl ${cardClassName}`}>
        <form action={updateProfile} className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-indigo-900">ข้อมูลส่วนตัว</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-indigo-800" htmlFor="prefix_name">
                  คำนำหน้า
                </label>
                <select
                  id="prefix_name"
                  name="prefix_name"
                  defaultValue={profile?.prefix_name ?? ""}
                  className={inputClassName}
                >
                  <option value="">- เลือกคำนำหน้า -</option>
                  {PREFIX_NAMES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hidden sm:block" />
              <LabeledInput label="ชื่อจริง" name="first_name" defaultValue={profile?.first_name} required />
              <LabeledInput label="นามสกุล" name="last_name" defaultValue={profile?.last_name} required />
              <LabeledInput label="ชื่อเล่น" name="nickname" defaultValue={profile?.nickname} />
              <LabeledInput label="เลขบัตรประชาชน" name="id_card_number" defaultValue={profile?.id_card_number} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-indigo-900">ช่องทางติดต่อ</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <LabeledInput label="เบอร์โทร" name="phone" defaultValue={profile?.phone} />
              <LabeledInput label="อีเมล" name="email" type="email" defaultValue={profile?.email} />
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-indigo-800">ที่อยู่</label>
                <textarea name="address" defaultValue={profile?.address ?? ""} rows={2} className={inputClassName} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-indigo-900">ข้อมูลธนาคารและภาษี</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <LabeledInput label="ธนาคาร" name="bank_name" defaultValue={profile?.bank_name} />
              <LabeledInput label="เลขบัญชี" name="bank_account_number" defaultValue={profile?.bank_account_number} />
              <LabeledInput label="ชื่อบัญชี" name="bank_account_name" defaultValue={profile?.bank_account_name} />
              <LabeledInput
                label="เลขประกันสังคม"
                name="social_security_number"
                defaultValue={profile?.social_security_number}
              />
              <LabeledInput label="เลขผู้เสียภาษี" name="tax_id" defaultValue={profile?.tax_id} />
            </div>
          </section>

          <section className="border-t border-indigo-100 pt-5">
            <h2 className="text-sm font-semibold text-indigo-900">ข้อมูลการจ้างงาน (แก้ไขไม่ได้)</h2>
            <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
              <ReadOnly label="รหัสพนักงาน" value={employee.employee_code} />
              <ReadOnly label="แผนก" value={department?.name ?? "-"} />
              <ReadOnly label="ตำแหน่ง" value={position?.name ?? "-"} />
            </dl>
            <p className="mt-2 text-xs text-indigo-400">
              หากข้อมูลด้านบนไม่ถูกต้อง กรุณาติดต่อฝ่ายบุคคล
            </p>
          </section>

          <button type="submit" className={primaryButtonClassName}>
            บันทึกข้อมูล
          </button>
        </form>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-indigo-800" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={inputClassName}
      />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-indigo-500">{label}</dt>
      <dd className="mt-1 text-indigo-900">{value}</dd>
    </div>
  );
}
