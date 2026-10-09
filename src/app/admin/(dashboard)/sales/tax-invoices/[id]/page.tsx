import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { SubmitButton } from "@/components/ui/submit-button";
import { TaxInvoiceDocument } from "@/components/sales/tax-invoice-document";
import { dangerButtonClassName, formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { thaiDate } from "@/lib/thai-money";
import { cancelTaxInvoice } from "../actions";

export default async function TaxInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: invoice }, { data: items }, { data: company }, { data: links }] = await Promise.all([
    supabase.from("tax_invoice_list").select("*").eq("id", id).maybeSingle(),
    supabase.from("tax_invoice_items").select("*").eq("tax_invoice_id", id).order("sort_order"),
    supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("tax_invoice_orders").select("sales_order_id").eq("tax_invoice_id", id),
  ]);
  if (!invoice) notFound();

  const orderIds = (links ?? []).map((l) => l.sales_order_id);
  const { data: orders } = orderIds.length
    ? await supabase.from("sales_order_list").select("id, external_order_id, order_number, tax_invoice_id").in("id", orderIds)
    : { data: [] };
  // After cancelling, the orders can be re-issued if none got a new invoice yet.
  const canReissue = invoice.is_cancelled && (orders ?? []).every((o) => !o.tax_invoice_id);

  return (
    <div>
      <BackLink href={`/admin/sales/tax-invoices?month=${invoice.issue_date.slice(0, 7)}`} label="กลับไปหน้ารายการใบกำกับภาษี" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-teal-950">
          <span className="font-mono">{invoice.tax_invoice_number}</span>
          {invoice.is_cancelled && (
            <span className="ml-3 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">ยกเลิกแล้ว</span>
          )}
        </h2>
        <div className="flex flex-wrap gap-3">
          {canReissue && (
            <Link
              href={`/admin/sales/tax-invoices/new?orders=${orderIds.join(",")}`}
              className={`${secondaryButtonClassName} inline-flex items-center gap-2`}
            >
              <FontAwesomeIcon icon={faRotateRight} />
              ออกใบใหม่แทน
            </Link>
          )}
          <Link
            href={`/admin/print/tax-invoices?id=${invoice.id}`}
            target="_blank"
            className={`${submitButtonClassName} inline-flex items-center gap-2`}
          >
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}
      {invoice.is_cancelled && (
        <p className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          ยกเลิกเมื่อ{" "}
          {invoice.cancelled_at &&
            new Date(invoice.cancelled_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}{" "}
          — เหตุผล: {invoice.cancel_reason ?? "-"}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_18rem]">
        <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
          <div className="min-w-[180mm]">
            <TaxInvoiceDocument company={company} invoice={invoice} items={items ?? []} copy="original" />
          </div>
        </div>

        <aside className="space-y-4">
          <div className={formCardClassName}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ออเดอร์ที่อ้างอิง</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {orders?.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/sales/orders/${o.id}`} className="font-mono text-teal-800 hover:text-orange-600">
                    {o.external_order_id ?? o.order_number}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-teal-500">ออกเมื่อ {thaiDate(invoice.created_at.slice(0, 10))}</p>
          </div>

          {!invoice.is_cancelled && (
            <form action={cancelTaxInvoice.bind(null, invoice.id)} className={formCardClassName}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ยกเลิกใบกำกับภาษี</h3>
              <p className="mt-2 text-xs text-teal-600">
                ใช้เมื่อออกผิด (ชื่อ/ที่อยู่/ยอดผิด) — เลขที่นี้จะไม่ถูกนำกลับมาใช้ และต้องเก็บต้นฉบับที่ยกเลิกไว้
                จากนั้นออกใบใหม่แทนได้
              </p>
              <textarea
                name="cancel_reason"
                required
                rows={2}
                placeholder="เหตุผล เช่น ลูกค้าแจ้งแก้ชื่อบริษัท"
                className="mt-3 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <SubmitButton className={`${dangerButtonClassName} mt-3`} pendingLabel="กำลังยกเลิก...">
                ยกเลิกใบนี้
              </SubmitButton>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
