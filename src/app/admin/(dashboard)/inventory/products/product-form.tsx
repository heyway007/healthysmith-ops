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
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="shelf_life_months">
              อายุสินค้า (เดือน)
            </label>
            <input
              id="shelf_life_months"
              name="shelf_life_months"
              type="number"
              inputMode="numeric"
              min="1"
              max="600"
              step="1"
              defaultValue={defaultValues?.shelf_life_months ?? ""}
              placeholder="เช่น 24"
              className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <p className="mt-1 text-xs text-teal-600">
              ใช้เติมวันหมดอายุให้อัตโนมัติตอนรับเข้า (วันที่รับ + อายุสินค้า) แก้ได้ทุกครั้ง — วันหมดอายุจริงเก็บเป็นรายล็อต
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm text-teal-800 sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              name="track_lot"
              value="1"
              defaultChecked={defaultValues?.track_lot ?? false}
              className="mt-0.5 accent-teal-600"
            />
            <span>
              <span className="font-medium">ติดตามเป็นล็อต (Lot)</span>
              <span className="block text-xs text-teal-600">
                ต้องระบุเลข Lot ทุกครั้งที่รับเข้า · เบิกออกต้องเลือกล็อต (แนะนำล็อตที่หมดอายุก่อน) และเบิกเกินยอดของล็อตนั้นไม่ได้ ·
                นับสต๊อกแยกตามล็อต — สต๊อกที่มีอยู่ก่อนเปิดใช้จะอยู่ในกลุ่ม &quot;ไม่ระบุล็อต&quot;
              </span>
            </span>
          </label>
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

        <div className="flex flex-wrap items-center gap-4 border-t border-teal-100 pt-5">
          <SubmitButton className={submitButtonClassName}>{submitLabel}</SubmitButton>
          <Link href="/admin/inventory/products" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
