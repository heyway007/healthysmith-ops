import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "@/lib/thai-money";
import { ManualTaxInvoiceForm, type ManualRow } from "./manual-form";

/**
 * Tax invoice keyed in by hand (walk-in / direct sale, no imported order).
 * `?from=<id>` pre-fills the form from an earlier invoice, e.g. to re-issue
 * a cancelled one with the mistake fixed.
 */
export default async function ManualTaxInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; replace?: string }>;
}) {
  const { from, replace } = await searchParams;
  const fromId = /^[0-9a-f-]{36}$/i.test(from ?? "") ? from! : null;

  const supabase = await createClient();
  const [{ data: customers }, { data: products }, { data: last }, { data: source }, { data: sourceItems }] = await Promise.all([
    supabase.from("customers").select("id, name, tax_id, address, phone").eq("is_active", true).order("name"),
    supabase
      .from("products")
      .select("id, sku, name, unit, sale_price")
      .eq("is_active", true)
      .neq("product_type", "raw_material")
      .order("name"),
    supabase.from("tax_invoices").select("issue_date").order("issue_date", { ascending: false }).limit(1).maybeSingle(),
    fromId
      ? supabase.from("tax_invoices").select("*").eq("id", fromId).maybeSingle()
      : Promise.resolve({ data: null }),
    fromId
      ? supabase.from("tax_invoice_items").select("*").eq("tax_invoice_id", fromId).order("sort_order")
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // ?replace=1: correcting `from` (it gets cancelled and linked). Only while
  // it hasn't been corrected already.
  const replacing = replace === "1" && source && !source.replaced_by_id ? source : null;

  const defaults = {
    name: source?.buyer_name ?? "",
    taxId: source?.buyer_tax_id ?? "",
    branch: source?.buyer_branch ?? "",
    address: source?.buyer_address ?? "",
    phone: source?.buyer_phone ?? "",
    note: source?.note ?? "",
  };
  const initialRows: ManualRow[] = (sourceItems ?? []).map((i) => ({
    productId: i.product_id ?? "",
    description: i.description,
    quantity: String(i.quantity),
    unitPrice: String(i.unit_price),
    discount: i.discount_amount ? String(i.discount_amount) : "",
  }));

  return (
    <div>
      <BackLink href="/admin/tax-documents/tax-invoices" label="กลับไปหน้ารายการใบกำกับภาษี" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">
        {replacing ? `แก้ไขใบกำกับภาษี ${replacing.tax_invoice_number}` : "ออกใบเสร็จรับเงิน/ใบกำกับภาษี (กรอกเอง)"}
      </h2>
      <p className="mt-1 text-sm text-teal-700">
        สำหรับขายหน้าร้าน / ขายตรงที่ไม่มีออเดอร์ในระบบ — กรอกข้อมูลผู้ซื้อและรายการสินค้า แล้วกดออกใบกำกับเพื่อพิมพ์
      </p>
      {source && !replacing && (
        <p className="mt-4 rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800">
          คัดลอกข้อมูลจากใบ <span className="font-mono">{source.tax_invoice_number}</span> — ใบใหม่จะได้เลขที่ใหม่
        </p>
      )}

      <div className="mt-6">
        <ManualTaxInvoiceForm
          defaults={defaults}
          defaultDate={bangkokToday()}
          lastIssueDate={last?.issue_date ?? null}
          customers={customers ?? []}
          products={products ?? []}
          initialRows={initialRows}
          initialDiscount={source?.discount_amount ? String(source.discount_amount) : ""}
          replace={replacing ? { id: replacing.id, number: replacing.tax_invoice_number } : undefined}
          initialPayment={{
            method: source?.payment_method ?? "",
            bank: source?.payment_bank ?? "",
            branch: source?.payment_branch ?? "",
            ref: source?.payment_ref ?? "",
            date: source?.payment_date ?? "",
          }}
        />
      </div>
    </div>
  );
}
