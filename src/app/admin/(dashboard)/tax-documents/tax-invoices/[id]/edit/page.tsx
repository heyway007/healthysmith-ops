import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE = "/admin/tax-documents/tax-invoices";

/**
 * Target of the "แก้ไข" icon in the invoice list. A correction re-opens the
 * issuing form pre-filled from this invoice: the manual form for a hand-made
 * one, the per-order form for one issued from sales orders.
 */
export default async function EditTaxInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: invoice }, { data: links }] = await Promise.all([
    supabase.from("tax_invoices").select("id").eq("id", id).maybeSingle(),
    supabase.from("tax_invoice_orders").select("sales_order_id").eq("tax_invoice_id", id),
  ]);
  if (!invoice) notFound();

  const orderIds = (links ?? []).map((l) => l.sales_order_id);
  redirect(
    orderIds.length === 0
      ? `${BASE}/manual?from=${id}&replace=1`
      : `${BASE}/new?orders=${orderIds.join(",")}&replace=${id}`,
  );
}
