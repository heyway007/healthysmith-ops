import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { LineItemsEditor } from "@/components/ui/line-items-editor";
import { formCardClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { Database } from "@/types/database.types";

type PurchaseBill = Database["public"]["Tables"]["purchase_bills"]["Row"];

export async function BillForm({
  action,
  defaultValues,
  defaultItems,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: PurchaseBill;
  defaultItems?: { description: string | null; quantity: number; unit_price: number; discount_amount: number }[];
  submitLabel: string;
  error?: string;
}) {
  const supabase = await createClient();
  const [{ data: suppliers }, { data: orders }] = await Promise.all([
    supabase.from("suppliers").select("id, name, supplier_code").order("name"),
    supabase
      .from("purchase_orders")
      .select("id, po_number, supplier_id")
      .not("status", "in", "(draft,pending_approval,cancelled)")
      .order("order_date", { ascending: false }),
  ]);
  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const currentSupplierName = supplierNameById.get(defaultValues?.supplier_id ?? "") ?? "";

  return (
    <div className={formCardClassName}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-6">
        <FormSection title="ข้อมูลบิลซื้อ">
          <Field
            label="ซัพพลายเออร์"
            name="supplier_name"
            required
            defaultValue={currentSupplierName}
            list="supplier-options"
            listOptions={(suppliers ?? []).map((s) => s.name)}
          />
          <div>
            <label className="block text-sm font-medium text-teal-800">อ้างอิงใบสั่งซื้อ (ถ้ามี)</label>
            <select
              name="purchase_order_id"
              defaultValue={defaultValues?.purchase_order_id ?? ""}
              className={selectClassName}
            >
              <option value="">- ไม่อ้างอิง PO -</option>
              {orders?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.po_number} — {supplierNameById.get(o.supplier_id) ?? "-"}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="เลขที่บิลของผู้ขาย"
            name="supplier_invoice_number"
            defaultValue={defaultValues?.supplier_invoice_number}
          />
          <Field
            label="วันที่บิล"
            name="bill_date"
            type="date"
            defaultValue={defaultValues?.bill_date ?? new Date().toISOString().slice(0, 10)}
          />
          <Field label="วันครบกำหนดชำระ" name="due_date" type="date" defaultValue={defaultValues?.due_date} />
          <Field
            label="หมายเหตุ"
            name="note"
            defaultValue={defaultValues?.note}
            className="sm:col-span-2 lg:col-span-3"
          />
        </FormSection>

        <FormSection title="รายการ">
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
          </div>
        </FormSection>

        <FormSection title="ภาษี">
          <Field
            label="ภาษีมูลค่าเพิ่ม (บาท)"
            name="vat_amount"
            type="number"
            defaultValue={defaultValues?.vat_amount}
          />
          <Field
            label="หัก ณ ที่จ่าย (บาท)"
            name="wht_amount"
            type="number"
            defaultValue={defaultValues?.wht_amount}
          />
        </FormSection>

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <button type="submit" className={submitButtonClassName}>
            {submitLabel}
          </button>
          <Link href="/purchase/bills" className="text-sm text-teal-700 hover:text-teal-900">
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
