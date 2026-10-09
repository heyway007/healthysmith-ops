import Link from "next/link";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { Database } from "@/types/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Customer;
  submitLabel: string;
  error?: string;
}) {
  return (
    <div className={formCardClassName}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-6">
        <FormSection title="ข้อมูลลูกค้า">
          <Field
            label="รหัสลูกค้า"
            name="customer_code"
            required
            defaultValue={defaultValues?.customer_code}
          />
          <Field label="ชื่อลูกค้า" name="name" required defaultValue={defaultValues?.name} />
          <div>
            <label className="block text-sm font-medium text-teal-800">ประเภท</label>
            <select
              name="customer_type"
              defaultValue={defaultValues?.customer_type ?? "individual"}
              className={selectClassName}
            >
              <option value="individual">บุคคลธรรมดา</option>
              <option value="company">นิติบุคคล</option>
            </select>
          </div>
          <Field label="เลขผู้เสียภาษี" name="tax_id" defaultValue={defaultValues?.tax_id} />
        </FormSection>

        <FormSection title="ข้อมูลติดต่อ">
          <Field label="เบอร์โทร" name="phone" defaultValue={defaultValues?.phone} />
          <Field label="อีเมล" name="email" type="email" defaultValue={defaultValues?.email} />
          <Field
            label="ที่อยู่"
            name="address"
            defaultValue={defaultValues?.address}
            className="sm:col-span-2 lg:col-span-3"
          />
        </FormSection>

        <FormSection title="เครดิต">
          <Field
            label="วงเงินเครดิต"
            name="credit_limit"
            type="number"
            defaultValue={defaultValues?.credit_limit}
          />
          <Field
            label="เครดิตเทอม (วัน)"
            name="credit_term_days"
            type="number"
            defaultValue={defaultValues?.credit_term_days}
          />
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <button type="submit" className={submitButtonClassName}>
            {submitLabel}
          </button>
          <Link href="/admin/sales" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
