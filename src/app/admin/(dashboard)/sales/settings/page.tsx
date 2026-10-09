import { createClient } from "@/lib/supabase/server";
import { getCurrentRoles } from "@/lib/current-role";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { SubmitButton } from "@/components/ui/submit-button";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import { saveCompany } from "./actions";

export default async function SalesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const [{ data: company }, roles] = await Promise.all([
    supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
    getCurrentRoles(),
  ]);
  const isAdmin = roles.includes("admin");

  return (
    <div>
      <h2 className="text-lg font-semibold text-teal-950">ข้อมูลผู้ขาย</h2>
      <p className="mt-1 text-sm text-teal-700">
        ชื่อ ที่อยู่ และเลขประจำตัวผู้เสียภาษีของบริษัท ที่จะพิมพ์บนหัวใบกำกับภาษีทุกใบ — ต้องตรงกับที่จดทะเบียน ภ.พ.20
      </p>

      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}
      {saved && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">บันทึกแล้ว</p>}
      {!company && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠️ ยังไม่ได้ตั้งค่า — ใบกำกับภาษีจะยังไม่มีข้อมูลผู้ขาย
        </p>
      )}
      {!isAdmin && (
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">
          เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่แก้ไขข้อมูลนี้ได้
        </p>
      )}

      <form action={saveCompany} className={`mt-6 ${formCardClassName}`}>
        <input type="hidden" name="id" value={company?.id ?? ""} />
        <fieldset disabled={!isAdmin} className="space-y-6">
          <FormSection title="บริษัท">
            <Field label="ชื่อบริษัท (ตามที่จดทะเบียน)" name="name" required defaultValue={company?.name} className="sm:col-span-2" />
            <Field label="เลขประจำตัวผู้เสียภาษี (13 หลัก)" name="tax_id" defaultValue={company?.tax_id} />
            <Field label="รหัสสาขา (00000 = สำนักงานใหญ่)" name="branch_code" defaultValue={company?.branch_code ?? "00000"} />
            <Field label="เบอร์โทร" name="phone" defaultValue={company?.phone} />
            <Field label="อีเมล" name="email" type="email" defaultValue={company?.email} />
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-teal-800" htmlFor="address">
                ที่อยู่ (ตาม ภ.พ.20)
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                defaultValue={company?.address ?? ""}
                className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <Field label="URL โลโก้ (ถ้ามี)" name="logo_url" defaultValue={company?.logo_url} className="sm:col-span-2 lg:col-span-3" />
          </FormSection>
          {isAdmin && (
            <div className="border-t border-teal-100 pt-5">
              <SubmitButton className={submitButtonClassName}>บันทึก</SubmitButton>
            </div>
          )}
        </fieldset>
      </form>
    </div>
  );
}
