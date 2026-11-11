import Link from "next/link";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { SubmitButton } from "@/components/ui/submit-button";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { Database } from "@/types/database.types";
import { PRODUCT_TYPES } from "../labels";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function ProductForm({
  action,
  defaultValues,
  units,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Product;
  /** units already in use, offered as suggestions */
  units: string[];
  submitLabel: string;
  error?: string;
}) {
  return (
    <div className={formCardClassName}>
      {error && <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}

      <form action={action} className="space-y-6">
        <FormSection title="ข้อมูลสินค้า">
          <Field label="รหัสสินค้า (SKU)" name="sku" required defaultValue={defaultValues?.sku} />
          <Field label="ชื่อสินค้า" name="name" required defaultValue={defaultValues?.name} className="lg:col-span-2" />
          <Field label="บาร์โค้ด (ถ้ามี)" name="barcode" defaultValue={defaultValues?.barcode} />
          <Field
            label="หน่วยนับ"
            name="unit"
            required
            defaultValue={defaultValues?.unit ?? "ชิ้น"}
            list="unit-options"
            listOptions={units}
          />
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="product_type">
              ประเภท
            </label>
            <select
              id="product_type"
              name="product_type"
              defaultValue={defaultValues?.product_type ?? "finished_good"}
              className={selectClassName}
            >
              {Object.entries(PRODUCT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </FormSection>

        <FormSection title="ราคา & สต๊อก">
          <Field label="ราคาทุน / หน่วย" name="cost_price" type="number" defaultValue={defaultValues?.cost_price} />
          <Field label="ราคาขาย / หน่วย" name="sale_price" type="number" defaultValue={defaultValues?.sale_price} />
          <Field
            label="สต๊อกขั้นต่ำ (เตือนเมื่อต่ำกว่า)"
            name="min_stock"
            type="number"
            defaultValue={defaultValues?.min_stock}
          />
          <Field label="หมายเหตุ" name="note" rows={3} defaultValue={defaultValues?.note} className="sm:col-span-2 lg:col-span-3" />
          {defaultValues && (
            <label className="flex items-center gap-2 text-sm text-teal-800">
              <input
                type="checkbox"
                name="is_active"
                value="1"
                defaultChecked={defaultValues.is_active}
                className="accent-teal-600"
              />
              ใช้งานอยู่ (ไม่ติ๊ก = ซ่อนจากรายการเลือกสินค้า)
            </label>
          )}
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <SubmitButton className={submitButtonClassName}>{submitLabel}</SubmitButton>
          <Link href="/admin/inventory/products" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
