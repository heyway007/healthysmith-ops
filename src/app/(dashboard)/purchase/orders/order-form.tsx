import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { LineItemsEditor } from "@/components/ui/line-items-editor";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { Database } from "@/types/database.types";

type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];

export async function OrderForm({
  action,
  defaultValues,
  defaultItems,
  purchaseRequestId,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: PurchaseOrder;
  defaultItems?: { description: string | null; quantity: number; unit_price: number; discount_amount: number }[];
  /** set only when creating a PO converted from an approved PR */
  purchaseRequestId?: string;
  submitLabel: string;
  error?: string;
}) {
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, supplier_code")
    .order("name");
  const currentSupplierName =
    suppliers?.find((s) => s.id === defaultValues?.supplier_id)?.name ?? "";

  return (
    <div className={formCardClassName}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-6">
        {purchaseRequestId && (
          <input type="hidden" name="purchase_request_id" value={purchaseRequestId} />
        )}

        <FormSection title="ข้อมูลใบสั่งซื้อ">
          <Field
            label="ซัพพลายเออร์"
            name="supplier_name"
            required
            defaultValue={currentSupplierName}
            list="supplier-options"
            listOptions={(suppliers ?? []).map((s) => s.name)}
          />
          <Field
            label="วันที่สั่งซื้อ"
            name="order_date"
            type="date"
            defaultValue={defaultValues?.order_date ?? new Date().toISOString().slice(0, 10)}
          />
          <Field
            label="วันที่คาดว่าจะได้รับ"
            name="expected_date"
            type="date"
            defaultValue={defaultValues?.expected_date}
          />
          <Field label="ภาษีมูลค่าเพิ่ม (บาท)" name="vat_amount" type="number" defaultValue={defaultValues?.vat_amount} />
          <Field
            label="หมายเหตุ"
            name="note"
            defaultValue={defaultValues?.note}
            className="sm:col-span-2 lg:col-span-3"
          />
        </FormSection>

        <FormSection title="รายการสินค้า">
          <div className="sm:col-span-2 lg:col-span-3">
            <LineItemsEditor
              columns={[
                { key: "description", label: "รายละเอียด" },
                { key: "quantity", label: "จำนวน", type: "number", step: "0.001", className: "w-24" },
                { key: "unit_price", label: "ราคา/หน่วย", type: "number", step: "0.01", className: "w-32" },
                { key: "discount_amount", label: "ส่วนลด", type: "number", step: "0.01", className: "w-28" },
              ]}
              initialRows={defaultItems?.map((i) => ({
                description: i.description ?? "",
                quantity: String(i.quantity),
                unit_price: String(i.unit_price),
                discount_amount: String(i.discount_amount),
              }))}
            />
            <p className="mt-2 text-xs text-teal-500">
              ยอดรวมสินค้า + ภาษีมูลค่าเพิ่ม จะคำนวณเป็นยอดรวมสุทธิให้อัตโนมัติหลังบันทึก
            </p>
          </div>
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <button type="submit" className={submitButtonClassName}>
            {submitLabel}
          </button>
          <Link href="/purchase/orders" className="text-sm text-teal-700 hover:text-teal-900">
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
