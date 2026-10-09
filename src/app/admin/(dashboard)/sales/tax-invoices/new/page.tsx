import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, splitVat, thaiDate } from "@/lib/thai-money";
import { createTaxInvoice } from "../actions";
import { BuyerForm } from "./buyer-form";

export default async function NewTaxInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orders?: string; error?: string }>;
}) {
  const { orders: orderParam, error } = await searchParams;
  const ids = (orderParam ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 200);

  const supabase = await createClient();
  const [{ data: orders }, { data: items }, { data: customers }, { data: last }] = await Promise.all([
    ids.length
      ? supabase.from("sales_order_list").select("*").in("id", ids).order("order_date")
      : Promise.resolve({ data: [] as never[] }),
    ids.length
      ? supabase.from("sales_order_items").select("*").in("sales_order_id", ids).order("sort_order")
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("customers").select("id, name, tax_id, address, phone").eq("is_active", true).order("name"),
    supabase.from("tax_invoices").select("issue_date").order("issue_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const list = orders ?? [];
  const backHref = list[0] ? `/admin/sales/orders?month=${list[0].order_date.slice(0, 7)}` : "/admin/sales/orders";

  if (list.length === 0) {
    return (
      <div>
        <BackLink href={backHref} label="กลับไปหน้ารายการออเดอร์" />
        <p className="mt-6 text-teal-600">ไม่พบออเดอร์ที่เลือก — กลับไปเลือกออเดอร์ที่หน้ารายการ</p>
      </div>
    );
  }

  const problems = [
    ...list.filter((o) => o.tax_invoice_id).map((o) => `${o.external_order_id ?? o.order_number} ออกใบกำกับไปแล้ว (${o.tax_invoice_number})`),
    ...list.filter((o) => o.status === "cancelled").map((o) => `${o.external_order_id ?? o.order_number} ถูกยกเลิก`),
    ...(new Set(list.map((o) => o.order_date.slice(0, 7))).size > 1 ? ["ออเดอร์อยู่ต่างเดือนกัน — รวมเป็นใบเดียวไม่ได้"] : []),
  ];
  const buyerNames = new Set(list.map((o) => (o.billing_name ?? o.buyer_name ?? o.buyer_username ?? "").trim()));

  // Pre-fill from the first order that has a tax-invoice request, else the first order.
  const src = list.find((o) => o.billing_name || o.billing_tax_id) ?? list[0];
  const defaults = {
    name: src.billing_name ?? src.buyer_name ?? src.buyer_username ?? "",
    taxId: src.billing_tax_id ?? "",
    branch: src.billing_branch ? (/^0+$/.test(src.billing_branch) ? "สำนักงานใหญ่" : src.billing_branch) : "",
    address: src.billing_address ?? src.shipping_address ?? "",
    phone: src.buyer_phone ?? "",
  };

  const directShipping = list.filter((o) => !o.is_marketplace).reduce((s, o) => s + o.shipping_fee, 0);
  const subtotal = (items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0) + directShipping;
  const discount = list.reduce((s, o) => s + o.discount_amount, 0);
  const total = subtotal - discount;
  const { net, vat } = splitVat(total);

  return (
    <div>
      <BackLink href={backHref} label="กลับไปหน้ารายการออเดอร์" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">
        ออกใบเสร็จรับเงิน/ใบกำกับภาษี {list.length > 1 && `— รวม ${list.length} ออเดอร์`}
      </h2>

      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}
      {problems.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {problems.map((p) => (
            <li key={p}>⚠️ {p}</li>
          ))}
        </ul>
      )}
      {list.length > 1 && buyerNames.size > 1 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ ออเดอร์ที่เลือกมีชื่อผู้ซื้อต่างกัน ({[...buyerNames].filter(Boolean).join(", ")}) — ใบกำกับรวมควรเป็นของผู้ซื้อรายเดียวกันเท่านั้น
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">ออเดอร์</th>
              <th className="px-4 py-3">รายการ</th>
              <th className="px-4 py-3 text-right">จำนวน</th>
              <th className="px-4 py-3 text-right">ราคา/หน่วย</th>
              <th className="px-4 py-3 text-right">ส่วนลด</th>
              <th className="px-4 py-3 text-right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {list.flatMap((o) =>
              (items ?? [])
                .filter((i) => i.sales_order_id === o.id)
                .map((i, idx) => (
                  <tr key={i.id} className="border-t border-teal-100">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-teal-600">
                      {idx === 0 ? `${o.external_order_id ?? o.order_number} · ${thaiDate(o.order_date, true)}` : ""}
                    </td>
                    <td className="px-4 py-2 text-teal-900">{i.description}</td>
                    <td className="px-4 py-2 text-right">{i.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(i.unit_price)}</td>
                    <td className="px-4 py-2 text-right">{i.discount_amount ? formatMoney(i.discount_amount) : "-"}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatMoney(i.amount)}</td>
                  </tr>
                )),
            )}
            {directShipping > 0 && (
              <tr className="border-t border-teal-100">
                <td />
                <td className="px-4 py-2 text-teal-900">ค่าจัดส่ง</td>
                <td className="px-4 py-2 text-right">1</td>
                <td className="px-4 py-2 text-right">{formatMoney(directShipping)}</td>
                <td className="px-4 py-2 text-right">-</td>
                <td className="px-4 py-2 text-right font-medium">{formatMoney(directShipping)}</td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-teal-200">
            {discount > 0 && (
              <SumRow label="ส่วนลด (โค้ดร้าน)" value={-discount} />
            )}
            <SumRow label="จำนวนเงินรวมทั้งสิ้น (รวม VAT)" value={total} strong />
            <SumRow label="มูลค่าสินค้าก่อน VAT" value={net} />
            <SumRow label="ภาษีมูลค่าเพิ่ม 7%" value={vat} />
          </tfoot>
        </table>
      </div>

      <div className="mt-6">
        <BuyerForm
          action={createTaxInvoice}
          orderIds={list.map((o) => o.id)}
          defaults={defaults}
          defaultDate={list[list.length - 1].order_date}
          lastIssueDate={last?.issue_date ?? null}
          customers={customers ?? []}
          backHref={backHref}
        />
      </div>
    </div>
  );
}

function SumRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <tr>
      <td colSpan={5} className="px-4 py-1.5 text-right text-teal-600">
        {label}
      </td>
      <td className={`px-4 py-1.5 text-right ${strong ? "font-semibold text-teal-950" : "text-teal-800"}`}>{formatMoney(value)}</td>
    </tr>
  );
}
