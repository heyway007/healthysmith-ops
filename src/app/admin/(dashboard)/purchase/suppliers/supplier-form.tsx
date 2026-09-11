import Link from "next/link";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { Database } from "@/types/database.types";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];

export function SupplierForm({
  action,
  defaultValues,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Supplier;
  submitLabel: string;
  error?: string;
}) {
  return (
    <div className={formCardClassName}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-6">
        <FormSection title="ข้อมูลซัพพลายเออร์">
          <Field
            label="รหัสซัพพลายเออร์"
            name="supplier_code"
            required
            defaultValue={defaultValues?.supplier_code}
          />
          <Field label="ชื่อบริษัท" name="name" required defaultValue={defaultValues?.name} />
          <Field label="ผู้ติดต่อ" name="contact_person" defaultValue={defaultValues?.contact_person} />
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

        <FormSection title="การเงิน">
          <Field
            label="เครดิตเทอม (วัน)"
            name="payment_term_days"
            type="number"
            defaultValue={defaultValues?.payment_term_days}
          />
          <Field label="ธนาคาร" name="bank_name" defaultValue={defaultValues?.bank_name} />
          <Field
            label="เลขบัญชี"
            name="bank_account_number"
            defaultValue={defaultValues?.bank_account_number}
          />
          <Field
            label="ชื่อบัญชี"
            name="bank_account_name"
            defaultValue={defaultValues?.bank_account_name}
          />
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <button type="submit" className={submitButtonClassName}>
            {submitLabel}
          </button>
          <Link href="/admin/purchase/suppliers" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
