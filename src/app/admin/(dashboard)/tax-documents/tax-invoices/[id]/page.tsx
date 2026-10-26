import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { getDocPermissions } from "@/lib/current-role";
import { BackLink } from "@/components/ui/back-link";
import { TaxInvoiceDocument } from "@/components/sales/tax-invoice-document";
import {
  DocumentActionsPanel,
  DocumentHistory,
  DocumentStatusBanner,
  IntegrityBadge,
  ReplacementDiff,
} from "@/components/documents/document-panels";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";

const BASE = "/admin/tax-documents/tax-invoices";

export default async function TaxInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { error, notice } = await searchParams;
  const supabase = await createClient();

  const [{ data: invoice }, { data: items }, { data: company }, { data: links }, perms] = await Promise.all([
    supabase.from("tax_invoice_list").select("*").eq("id", id).maybeSingle(),
    supabase.from("tax_invoice_items").select("*").eq("tax_invoice_id", id).order("sort_order"),
    supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("tax_invoice_orders").select("sales_order_id").eq("tax_invoice_id", id),
    getDocPermissions(),
  ]);
  if (!invoice) notFound();

  const orderIds = (links ?? []).map((l) => l.sales_order_id);
  const related = [invoice.replaces_id, invoice.replaced_by_id].filter((x): x is string => !!x);
  const [{ data: orders }, { data: relatedDocs }] = await Promise.all([
    orderIds.length
      ? supabase.from("sales_order_list").select("id, external_order_id, order_number").in("id", orderIds)
      : Promise.resolve({ data: [] as { id: string; external_order_id: string | null; order_number: string }[] }),
    related.length
      ? supabase.from("tax_invoices").select("id, tax_invoice_number").in("id", related)
      : Promise.resolve({ data: [] as { id: string; tax_invoice_number: string }[] }),
  ]);
  const numbers = Object.fromEntries((relatedDocs ?? []).map((d) => [d.id, d.tax_invoice_number]));

  // Corrections re-open the issuing form pre-filled from this invoice.
  const isManual = orderIds.length === 0;
  const editHref = isManual
    ? `${BASE}/manual?from=${invoice.id}&replace=1`
    : `${BASE}/new?orders=${orderIds.join(",")}&replace=${invoice.id}`;

  return (
    <div>
      <BackLink href={`${BASE}?month=${invoice.issue_date.slice(0, 7)}`} label="กลับไปหน้ารายการใบกำกับภาษี" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-teal-950">
          <span className="font-mono">{invoice.tax_invoice_number}</span>
          {invoice.is_cancelled ? (
            <span className="ml-3 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">ยกเลิกแล้ว</span>
          ) : invoice.cancel_requested_at ? (
            <span className="ml-3 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">รออนุมัติยกเลิก</span>
          ) : null}
        </h2>
        <Link
          href={`/admin/print/tax-invoices?id=${invoice.id}`}
          target="_blank"
          className={`${submitButtonClassName} inline-flex items-center gap-2`}
        >
          <FontAwesomeIcon icon={faPrint} />
          พิมพ์
        </Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      <div className="mt-4">
        <DocumentStatusBanner doc={invoice} basePath={BASE} numbers={numbers} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
            <div className="min-w-[180mm]">
              <TaxInvoiceDocument company={company} invoice={invoice} items={items ?? []} copy="original" />
            </div>
          </div>
          {invoice.replaces_id && <ReplacementDiff kind="tax_invoice" originalId={invoice.replaces_id} currentId={invoice.id} />}
        </div>

        <aside className="space-y-4">
          <div className={`${formCardClassName} space-y-3`}>
            {isManual ? (
              <p className="text-sm text-teal-700">ออกแบบกรอกรายการเอง (ไม่อ้างอิงออเดอร์)</p>
            ) : (
              <div>
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
              </div>
            )}
            <p className="text-xs text-teal-500">
              ออกเมื่อ{" "}
              {new Date(invoice.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}
              {invoice.created_by_email && ` โดย ${invoice.created_by_email}`}
            </p>
            <IntegrityBadge kind="tax_invoice" id={invoice.id} />
          </div>

          <DocumentActionsPanel kind="tax_invoice" doc={invoice} perms={perms} editHref={editHref} />
          <DocumentHistory table="tax_invoices" id={invoice.id} />
        </aside>
      </div>
    </div>
  );
}
