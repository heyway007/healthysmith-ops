import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { PREFIX_NAMES } from "@/lib/prefix-names";
import { EMPLOYMENT_TYPES } from "./employment-types";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { Database } from "@/types/database.types";

type Employee = Database["public"]["Tables"]["employees"]["Row"];

export async function EmployeeForm({
  action,
  defaultValues,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Employee;
  submitLabel: string;
  error?: string;
}) {
  const supabase = await createClient();
  const [{ data: departments }, { data: positions }] = await Promise.all([
    supabase.from("departments").select("*").order("name"),
    supabase.from("positions").select("*").order("name"),
  ]);

  const departmentNameById = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const positionNameById = new Map((positions ?? []).map((p) => [p.id, p.name]));
  const currentDepartmentName =
    (defaultValues?.department_id && departmentNameById.get(defaultValues.department_id)) || "";
  const currentPositionName =
    (defaultValues?.position_id && positionNameById.get(defaultValues.position_id)) || "";

  return (
    <div className={formCardClassName}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-6">
        <FormSection title="ข้อมูลพนักงาน">
          <Field
            label="รหัสพนักงาน"
            name="employee_code"
            required
            defaultValue={defaultValues?.employee_code}
          />
          <div>
            <label className="block text-sm font-medium text-teal-800">คำนำหน้า</label>
            <select
              name="prefix_name"
              defaultValue={defaultValues?.prefix_name ?? ""}
              className={selectClassName}
            >
              <option value="">- เลือกคำนำหน้า -</option>
              {PREFIX_NAMES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden lg:block" />
          <Field label="ชื่อ" name="first_name" required defaultValue={defaultValues?.first_name} />
          <Field label="นามสกุล" name="last_name" required defaultValue={defaultValues?.last_name} />
        </FormSection>

        <FormSection title="ตำแหน่งงาน">
          <Field
            label="แผนก"
            name="department_name"
            defaultValue={currentDepartmentName}
            list="department-options"
            listOptions={(departments ?? []).map((d) => d.name)}
          />
          <Field
            label="ตำแหน่ง"
            name="position_name"
            defaultValue={currentPositionName}
            list="position-options"
            listOptions={(positions ?? []).map((p) => p.name)}
          />
          <div>
            <label className="block text-sm font-medium text-teal-800">ประเภทการจ้าง</label>
            <select
              name="employment_type"
              defaultValue={defaultValues?.employment_type ?? "full_time"}
              className={selectClassName}
            >
              {Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="วันที่เริ่มงาน"
            name="start_date"
            type="date"
            required
            defaultValue={defaultValues?.start_date}
          />
          <Field
            label="เงินเดือนเริ่มต้น"
            name="base_salary"
            type="number"
            defaultValue={defaultValues?.base_salary}
          />
        </FormSection>

        <FormSection title="ช่องทางติดต่อ">
          <Field label="เบอร์โทร" name="phone" defaultValue={defaultValues?.phone} />
          <Field label="อีเมล" name="email" type="email" defaultValue={defaultValues?.email} />
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <button type="submit" className={submitButtonClassName}>
            {submitLabel}
          </button>
          <Link href="/admin/hr" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
