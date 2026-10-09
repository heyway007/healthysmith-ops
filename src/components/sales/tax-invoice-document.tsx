import { bahtText, formatMoney, thaiDate } from "@/lib/thai-money";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Invoice = Database["public"]["Views"]["tax_invoice_list"]["Row"];
type Item = Database["public"]["Tables"]["tax_invoice_items"]["Row"];

export const COPY_LABELS = { original: "ต้นฉบับ", copy: "สำเนา" } as const;

function sellerBranch(code: string | null | undefined) {
  if (!code || /^0+$/.test(code)) return "สำนักงานใหญ่";
  return `สาขาที่ ${code}`;
}

/**
 * ใบเสร็จรับเงิน/ใบกำกับภาษี (full tax invoice) on one A4 sheet, carrying the
 * particulars the Revenue Code (ม.86/4) requires: the words "ใบกำกับภาษี",
 * seller + buyer name/address/tax id/branch, number, date, goods, value and
 * VAT shown separately. Prices are VAT-inclusive, so VAT is backed out.
 */
export function TaxInvoiceDocument({
  company,
  invoice,
  items,
  copy,
}: {
  company: Company | null;
  invoice: Invoice;
  items: Item[];
  copy: keyof typeof COPY_LABELS;
}) {
  // Use the VAT stored when the invoice was issued; the document must match it.
  const vat = invoice.vat_amount;
  const net = Math.round((invoice.total_amount - vat) * 100) / 100;

  return (
    <article className="relative mx-auto flex min-h-[273mm] w-full max-w-[186mm] flex-col bg-white text-[12px] leading-snug text-gray-900">
      {invoice.is_cancelled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-30 rounded-2xl border-8 border-rose-500/40 px-10 py-2 text-7xl font-bold text-rose-500/40">
            ยกเลิก
          </span>
        </div>
      )}

      <header className="flex items-start justify-between gap-6 border-b-2 border-gray-800 pb-3">
        <div className="flex items-start gap-3">
          {company?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="" className="h-16 w-16 object-contain" />
          )}
          <div>
            {company ? (
              <>
                <p className="text-base font-bold">{company.name}</p>
                {company.address && <p className="whitespace-pre-line">{company.address}</p>}
                <p>
                  เลขประจำตัวผู้เสียภาษี {company.tax_id ?? "-"} ({sellerBranch(company.branch_code)})
                </p>
                {(company.phone || company.email) && (
                  <p>{[company.phone && `โทร ${company.phone}`, company.email].filter(Boolean).join(" · ")}</p>
                )}
              </>
            ) : (
              <p className="font-bold text-rose-600 print:text-gray-900">
                ⚠️ ยังไม่ได้ตั้งค่าข้อมูลผู้ขาย (ระบบขาย → ข้อมูลผู้ขาย)
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold">ใบเสร็จรับเงิน / ใบกำกับภาษี</p>
          <p className="text-xs tracking-wide text-gray-600">RECEIPT / TAX INVOICE</p>
          <p className="mt-2 inline-block rounded border border-gray-800 px-3 py-0.5 font-semibold">{COPY_LABELS[copy]}</p>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-[1fr_auto] gap-3">
        <div className="rounded border border-gray-400 p-2.5">
          <p className="text-[11px] text-gray-500">ลูกค้า / Customer</p>
          <p className="font-semibold">{invoice.buyer_name}</p>
          {invoice.buyer_address && <p className="whitespace-pre-line">{invoice.buyer_address}</p>}
          {invoice.buyer_tax_id && (
            <p>
              เลขประจำตัวผู้เสียภาษี {invoice.buyer_tax_id}
              {invoice.buyer_branch && ` (${invoice.buyer_branch})`}
            </p>
          )}
          {invoice.buyer_phone && <p>โทร {invoice.buyer_phone}</p>}
        </div>
        <dl className="grid min-w-56 grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 rounded border border-gray-400 p-2.5">
          <dt className="text-gray-500">เลขที่</dt>
          <dd className="font-semibold">{invoice.tax_invoice_number}</dd>
          <dt className="text-gray-500">วันที่</dt>
          <dd>{thaiDate(invoice.issue_date)}</dd>
          {invoice.order_refs && (
            <>
              <dt className="text-gray-500">อ้างอิง</dt>
              <dd className="max-w-48 break-all">{invoice.order_refs}</dd>
            </>
          )}
          {invoice.channel_names && (
            <>
              <dt className="text-gray-500">ช่องทาง</dt>
              <dd>{invoice.channel_names}</dd>
            </>
          )}
        </dl>
      </section>

      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-y border-gray-800 bg-gray-100 text-[11px]">
            <th className="w-10 px-2 py-1.5 text-center font-semibold">ลำดับ</th>
            <th className="px-2 py-1.5 text-left font-semibold">รายการ</th>
            <th className="w-16 px-2 py-1.5 text-right font-semibold">จำนวน</th>
            <th className="w-24 px-2 py-1.5 text-right font-semibold">ราคา/หน่วย</th>
            <th className="w-20 px-2 py-1.5 text-right font-semibold">ส่วนลด</th>
            <th className="w-24 px-2 py-1.5 text-right font-semibold">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={i.id} className="border-b border-gray-200 align-top">
              <td className="px-2 py-1 text-center">{idx + 1}</td>
              <td className="px-2 py-1">{i.description}</td>
              <td className="px-2 py-1 text-right">{i.quantity.toLocaleString()}</td>
              <td className="px-2 py-1 text-right">{formatMoney(i.unit_price)}</td>
              <td className="px-2 py-1 text-right">{i.discount_amount ? formatMoney(i.discount_amount) : "-"}</td>
              <td className="px-2 py-1 text-right">{formatMoney(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-3 grid grid-cols-[1fr_auto] gap-4 border-t border-gray-800 pt-2">
        <div>
          <p className="rounded bg-gray-100 px-2 py-1.5 text-center font-semibold">({bahtText(invoice.total_amount)})</p>
          <p className="mt-2 text-[11px] text-gray-600">ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว</p>
          {invoice.note && <p className="mt-1">หมายเหตุ: {invoice.note}</p>}
        </div>
        <dl className="grid min-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-0.5">
          <dt>รวมเป็นเงิน</dt>
          <dd className="text-right">{formatMoney(invoice.subtotal)}</dd>
          {invoice.discount_amount > 0 && (
            <>
              <dt>หักส่วนลด</dt>
              <dd className="text-right">{formatMoney(invoice.discount_amount)}</dd>
            </>
          )}
          <dt>มูลค่าสินค้าก่อนภาษี</dt>
          <dd className="text-right">{formatMoney(net)}</dd>
          <dt>ภาษีมูลค่าเพิ่ม 7%</dt>
          <dd className="text-right">{formatMoney(vat)}</dd>
          <dt className="border-y border-gray-800 py-1 font-bold">จำนวนเงินรวมทั้งสิ้น</dt>
          <dd className="border-y border-gray-800 py-1 text-right font-bold">{formatMoney(invoice.total_amount)}</dd>
        </dl>
      </section>

      <footer className="mt-auto grid grid-cols-2 gap-10 pt-16 text-center">
        <div>
          <div className="mx-auto w-48 border-b border-dotted border-gray-600 pb-6" />
          <p className="mt-1">ผู้รับเงิน</p>
          <p className="text-[11px] text-gray-500">วันที่ ........./........./.........</p>
        </div>
        <div>
          <div className="mx-auto w-48 border-b border-dotted border-gray-600 pb-6" />
          <p className="mt-1">ผู้มีอำนาจลงนาม</p>
          <p className="text-[11px] text-gray-500">{company?.name ?? ""}</p>
        </div>
      </footer>
    </article>
  );
}
