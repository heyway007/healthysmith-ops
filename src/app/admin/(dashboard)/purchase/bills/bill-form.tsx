import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { LineItemsEditor } from "@/components/ui/line-items-editor";
import { SubmitButton } from "@/components/ui/submit-button";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { Database } from "@/types/database.types";
import { PAYMENT_METHODS } from "./status";

type PurchaseBill = Database["public"]["Tables"]["purchase_bills"]["Row"];

export async function BillForm({
  action,
  defaultValues,
  defaultItems,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  /** set when editing -- payment is then handled from the ค้างจ่าย tab instead */
  defaultValues?: PurchaseBill;
  defaultItems?: { description: string | null; quantity: number; unit_price: number }[];
  submitLabel: string;
  error?: string;
}) {
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  const currentSupplierName = defaultValues
    ? ((
        await supabase.from("suppliers").select("name").eq("id", defaultValues.supplier_id).maybeSingle()
      ).data?.name ?? "")
    : "";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

  return (
    <div className={formCardClassName}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-6">
        <FormSection title="ซื้ออะไร จากที่ไหน">
          <Field
            label="วันที่ซื้อ"
            name="bill_date"
            type="date"
            defaultValue={defaultValues?.bill_date ?? today}
          />
          <Field
            label="ร้าน / ผู้ขาย"
            name="supplier_name"
            required
            defaultValue={currentSupplierName}
            list="supplier-options"
            listOptions={(suppliers ?? []).map((s) => s.name)}
          />
          <Field
            label="เลขที่ใบเสร็จ (ถ้ามี)"
            name="supplier_invoice_number"
            defaultValue={defaultValues?.supplier_invoice_number}
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <LineItemsEditor
              columns={[
                { key: "description", label: "รายการ" },
                { key: "quantity", label: "จำนวน", type: "number", step: "any", className: "w-24" },
                { key: "unit_price", label: "ราคา/หน่วย", type: "number", step: "0.01", className: "w-32" },
              ]}
              initialRows={defaultItems?.map((i) => ({
                description: i.description ?? "",
                quantity: String(i.quantity),
                unit_price: String(i.unit_price),
              }))}
              totalOf={["quantity", "unit_price"]}
            />
          </div>
          <Field
            label="VAT (บาท, ถ้ามี)"
            name="vat_amount"
            type="number"
            defaultValue={defaultValues?.vat_amount || null}
          />
          <Field
            label="หมายเหตุ"
            name="note"
            defaultValue={defaultValues?.note}
            className="sm:col-span-1 lg:col-span-2"
          />
        </FormSection>

        {defaultValues ? (
          <FormSection title="การจ่ายเงิน">
            <Field label="ครบกำหนดจ่าย (ถ้ายังไม่จ่าย)" name="due_date" type="date" defaultValue={defaultValues.due_date} />
          </FormSection>
        ) : (
          <FormSection title="การจ่ายเงิน">
            <fieldset className="sm:col-span-2 lg:col-span-3">
              <legend className="sr-only">สถานะการจ่าย</legend>
              <div className="flex flex-wrap gap-3">
                <PaymentChoice value="paid" label="จ่ายแล้ว" hint="จ่ายตอนซื้อเลย" defaultChecked />
                <PaymentChoice value="unpaid" label="ยังไม่จ่าย" hint="เครดิต / จ่ายทีหลัง" />
              </div>
            </fieldset>
            <div>
              <label className="block text-sm font-medium text-teal-800" htmlFor="payment_method">
                จ่ายด้วย (ถ้าจ่ายแล้ว)
              </label>
              <select id="payment_method" name="payment_method" defaultValue="cash" className={selectClassName}>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Field label="ครบกำหนดจ่าย (ถ้ายังไม่จ่าย)" name="due_date" type="date" />
          </FormSection>
        )}

        <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
          <SubmitButton className={submitButtonClassName}>{submitLabel}</SubmitButton>
          <Link href="/admin/purchase/bills" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}

function PaymentChoice({
  value,
  label,
  hint,
  defaultChecked,
}: {
  value: string;
  label: string;
  hint: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-teal-200 bg-white px-4 py-3 has-checked:border-orange-400 has-checked:bg-orange-50">
      <input
        type="radio"
        name="payment_status"
        value={value}
        defaultChecked={defaultChecked}
        className="accent-orange-500"
      />
      <span>
        <span className="block text-sm font-medium text-teal-900">{label}</span>
        <span className="block text-xs text-teal-600">{hint}</span>
      </span>
    </label>
  );
}
