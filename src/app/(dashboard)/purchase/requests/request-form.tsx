import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { LineItemsEditor } from "@/components/ui/line-items-editor";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import { employeeLabel } from "../employee-picker";
import type { Database } from "@/types/database.types";

type PurchaseRequest = Database["public"]["Tables"]["purchase_requests"]["Row"];

export async function RequestForm({
  action,
  defaultValues,
  defaultItems,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: PurchaseRequest;
  defaultItems?: { description: string | null; quantity: number; estimated_unit_price: number }[];
  submitLabel: string;
  error?: string;
}) {
  const supabase = await createClient();
  const [{ data: employees }, { data: departments }] = await Promise.all([
    supabase.from("employees").select("id, first_name, last_name, employee_code").order("first_name"),
    supabase.from("departments").select("*").order("name"),
  ]);

  const employeeOptions = (employees ?? []).map(employeeLabel);
  const currentRequestedByLabel = (() => {
    const match = employees?.find((e) => e.id === defaultValues?.requested_by);
    return match ? employeeLabel(match) : "";
  })();
  const departmentNameById = new Map((departments ?? []).map((d) => [d.id, d.name]));
  const currentDepartmentName =
    (defaultValues?.department_id && departmentNameById.get(defaultValues.department_id)) || "";

  return (
    <div className={formCardClassName}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-6">
        <FormSection title="ข้อมูลใบขอซื้อ">
          <Field
            label="ผู้ขอซื้อ"
            name="requested_by_label"
            defaultValue={currentRequestedByLabel}
            list="requested-by-options"
            listOptions={employeeOptions}
          />
          <Field
            label="แผนก"
            name="department_name"
            defaultValue={currentDepartmentName}
            list="department-options"
            listOptions={(departments ?? []).map((d) => d.name)}
          />
          <Field
            label="วันที่ขอซื้อ"
            name="request_date"
            type="date"
            defaultValue={defaultValues?.request_date ?? new Date().toISOString().slice(0, 10)}
          />
          <Field
            label="วันที่ต้องการใช้"
            name="required_date"
            type="date"
            defaultValue={defaultValues?.required_date}
          />
          <Field
            label="หมายเหตุ"
            name="note"
            defaultValue={defaultValues?.note}
            className="sm:col-span-2 lg:col-span-3"
          />
        </FormSection>

        <FormSection title="รายการที่ขอซื้อ">
          <div className="sm:col-span-2 lg:col-span-3">
            <LineItemsEditor
              columns={[
                { key: "description", label: "รายละเอียด" },
                { key: "quantity", label: "จำนวน", type: "number", step: "0.001", className: "w-28" },
                {
                  key: "estimated_unit_price",
                  label: "ราคาประเมิน/หน่วย",
                  type: "number",
                  step: "0.01",
                  className: "w-36",
                },
              ]}
              initialRows={defaultItems?.map((i) => ({
                description: i.description ?? "",
                quantity: String(i.quantity),
                estimated_unit_price: String(i.estimated_unit_price),
              }))}
            />
          </div>
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <button type="submit" className={submitButtonClassName}>
            {submitLabel}
          </button>
          <Link href="/purchase/requests" className="text-sm text-teal-700 hover:text-teal-900">
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
