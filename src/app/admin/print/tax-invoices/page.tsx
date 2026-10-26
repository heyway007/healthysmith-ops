import { createClient } from "@/lib/supabase/server";
import { TaxInvoiceDocument, COPY_LABELS } from "@/components/sales/tax-invoice-document";
import { parseDocFilters } from "@/lib/doc-list-filters";
import { logDocumentEvents } from "@/lib/audit";
import type { Database } from "@/types/database.types";
import { TaxInvoicePrintControls, type Copies } from "./print-controls";

// Printable tax invoices (A4, one sheet per copy). Opened from the tax
// invoice list (ticked ones, or everything matching the list's filter) and
// from a single invoice's page.

type Item = Database["public"]["Tables"]["tax_invoice_items"]["Row"];

const MAX = 500;

export default async function PrintTaxInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string | string[];
    month?: string;
    from?: string;
    to?: string;
    status?: string;
    q?: string;
    copies?: string;
  }>;
}) {
  const params = await searchParams;
  const ids = [params.id ?? []].flat().filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, MAX);
  const copies: Copies = params.copies === "original" || params.copies === "copy" ? params.copies : "both";

  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle();

  let invoices: Database["public"]["Views"]["tax_invoice_list"]["Row"][] = [];
  if (ids.length > 0) {
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabase.from("tax_invoice_list").select("*").in("id", ids.slice(i, i + 100));
      invoices.push(...(data ?? []));
    }
  } else if (params.month || params.from || params.to) {
    // "Print everything shown": the same filters as the list.
    const f = parseDocFilters(params);
    let query = supabase.from("tax_invoice_list").select("*").gte("issue_date", f.from).lte("issue_date", f.to).limit(MAX);
    if (f.status === "active") query = query.eq("is_cancelled", false);
    if (f.status === "cancelled") query = query.eq("is_cancelled", true);
    if (f.status === "pending") query = query.eq("is_cancelled", false).not("cancel_requested_at", "is", null);
    const q = f.q;
    if (q) {
      query = query.or(
        ["tax_invoice_number", "buyer_name", "buyer_tax_id", "order_refs"].map((c) => `${c}.ilike.*${q}*`).join(","),
      );
    }
    invoices = (await query).data ?? [];
  }
  invoices.sort((a, b) => a.tax_invoice_number.localeCompare(b.tax_invoice_number));

  const itemsByInvoice = new Map<string, Item[]>();
  const invoiceIds = invoices.map((t) => t.id);
  for (let i = 0; i < invoiceIds.length; i += 100) {
    const { data } = await supabase
      .from("tax_invoice_items")
      .select("*")
      .in("tax_invoice_id", invoiceIds.slice(i, i + 100))
      .order("sort_order");
    for (const item of data ?? []) {
      const list = itemsByInvoice.get(item.tax_invoice_id);
      if (list) list.push(item);
      else itemsByInvoice.set(item.tax_invoice_id, [item]);
    }
  }

  await logDocumentEvents(
    "document.print",
    "tax_invoices",
    invoices.map((t) => ({ id: t.id, label: t.tax_invoice_number })),
    { copies: copies === "both" ? "ต้นฉบับ + สำเนา" : copies === "original" ? "ต้นฉบับ" : "สำเนา" },
  );

  const sheets = invoices.flatMap((t) =>
    (copies === "both" ? (["original", "copy"] as const) : [copies]).map((copy) => ({ t, copy })),
  );

  return (
    <>
      <TaxInvoicePrintControls copies={copies} invoiceCount={invoices.length} sheetCount={sheets.length} />
      <main className="py-6 print:py-0">
        {sheets.length === 0 && <p className="text-center text-gray-500">ไม่มีใบกำกับภาษีที่จะพิมพ์</p>}
        {sheets.map(({ t, copy }) => (
          <div
            key={`${t.id}-${copy}`}
            className="mx-auto mb-6 w-[210mm] max-w-full break-after-page bg-white p-[12mm] shadow-md last:break-after-auto print:mb-0 print:w-auto print:p-0 print:shadow-none"
            aria-label={`${t.tax_invoice_number} ${COPY_LABELS[copy]}`}
          >
            <TaxInvoiceDocument company={company} invoice={t} items={itemsByInvoice.get(t.id) ?? []} copy={copy} />
          </div>
        ))}
      </main>
    </>
  );
}
