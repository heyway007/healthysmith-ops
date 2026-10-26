import { bahtText, formatMoney } from "@/lib/thai-money";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Invoice = Database["public"]["Views"]["tax_invoice_list"]["Row"];
type Item = Database["public"]["Tables"]["tax_invoice_items"]["Row"];

export const COPY_LABELS = { original: "ต้นฉบับ", copy: "สำเนา" } as const;
const COPY_LABELS_EN = { original: "ORIGINAL", copy: "COPY" } as const;

function sellerBranch(code: string | null | undefined) {
  if (!code || /^0+$/.test(code)) return "สำนักงานใหญ่";
  return `สาขาที่ ${code}`;
}

/** 2026-10-21 -> 21-10-2569 */
function shortDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}-${m}-${y + 543}`;
}

// Item table columns: ลำดับ | รายการ | จำนวน | ราคา/หน่วย | จำนวนเงิน.
// The totals block underneath reuses the same grid so it lines up.
const COLS = "grid grid-cols-[13mm_1fr_18mm_24mm_27mm]";

/**
 * ใบเสร็จรับเงิน/ใบกำกับภาษี (full tax invoice) on one A4 sheet, laid out
 * like the company's paper form. Carries the particulars the Revenue Code
 * (ม.86/4) requires: the words "ใบกำกับภาษี", seller + buyer name/address/
 * tax id/branch, number, date, goods, value and VAT shown separately.
 * Prices are VAT-inclusive, so VAT is backed out of the total.
 */
type Seller = Pick<Company, "name" | "tax_id" | "branch_code" | "address" | "phone" | "email" | "logo_url">;

export function TaxInvoiceDocument({
  company: liveCompany,
  invoice,
  items,
  copy,
}: {
  company: Company | null;
  invoice: Invoice;
  items: Item[];
  copy: keyof typeof COPY_LABELS;
}) {
  // Seller details as they were when the invoice was issued (snapshot); the
  // live company record is only a fallback for invoices issued before 0018.
  const company: Seller | null = (invoice.seller_snapshot as Seller | null) ?? liveCompany;
  // Use the VAT stored when the invoice was issued; the document must match it.
  const vat = invoice.vat_amount;
  const net = Math.round((invoice.total_amount - vat) * 100) / 100;

  return (
    <article className="relative mx-auto flex min-h-[273mm] w-full max-w-[186mm] flex-col bg-white text-[12px] leading-snug text-black">
      {invoice.is_cancelled && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="-rotate-30 rounded-2xl border-8 border-rose-500/40 px-10 py-2 text-7xl font-bold text-rose-500/40">
            ยกเลิก
          </span>
        </div>
      )}

      {/* Seller + document title */}
      <header className="grid grid-cols-[1fr_58mm] gap-6">
        <div>
          <div className="flex items-center gap-4">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt="" className="h-20 w-20 shrink-0 object-contain" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-dashed border-gray-400 text-[11px] text-gray-400 print:hidden">
                LOGO
              </div>
            )}
            <p className="text-[17px] font-semibold">
              {company ? (
                <>
                  {company.name} ({sellerBranch(company.branch_code)})
                </>
              ) : (
                <span className="text-rose-600 print:text-black">⚠️ ยังไม่ได้ตั้งค่าข้อมูลผู้ขาย (เอกสารภาษี → ข้อมูลบริษัท)</span>
              )}
            </p>
          </div>
          {company?.address && <p className="mt-1 whitespace-pre-line">{company.address}</p>}
          {company && <p>เลขประจำตัวผู้เสียภาษีอากร&nbsp;&nbsp;{company.tax_id ?? "-"}</p>}
          {(company?.phone || company?.email) && (
            <p>{[company.phone && `โทร ${company.phone}`, company.email].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div className="text-center">
          <div className="border-2 border-black px-2 py-2 font-bold">
            <p className="text-[13px]">ใบเสร็จรับเงิน / ใบกำกับภาษี</p>
            <p className="text-[13px]">RECEIPT / TAX INVOICE</p>
          </div>
          <p className="mt-4 text-[15px] font-bold">{COPY_LABELS[copy]}</p>
          <p className="text-[10px]">{COPY_LABELS_EN[copy]}</p>
        </div>
      </header>

      {/* Buyer + number/date */}
      <section className="mt-4 grid grid-cols-[1fr_58mm] gap-1.5">
        <div className="border-2 border-black px-2 py-1.5">
          <Line label="ชื่อลูกค้า / Customers:">
            <span className="font-semibold">{invoice.buyer_name}</span>
          </Line>
          <Line label="ที่อยู่ / Address:">
            <span className="whitespace-pre-line">{invoice.buyer_address}</span>
          </Line>
          <Line label="เลขประจำตัวผู้เสียภาษี">
            {invoice.buyer_tax_id}
            {invoice.buyer_tax_id && invoice.buyer_branch && ` (${invoice.buyer_branch})`}
            {invoice.buyer_phone && <span className="ml-4">โทร {invoice.buyer_phone}</span>}
          </Line>
        </div>
        <dl className="grid grid-cols-[auto_1fr] content-center items-baseline gap-x-3 gap-y-3 border-2 border-black px-3 py-2">
          <dt className="text-[11px]">เลขที่ / No.</dt>
          <dd className="text-[14px] font-bold">{invoice.tax_invoice_number}</dd>
          <dt className="text-[11px]">วันที่ / Date</dt>
          <dd className="text-[14px]">{shortDate(invoice.issue_date)}</dd>
        </dl>
      </section>

      {/* Items: column rules run the full height of the box */}
      <section className="relative mt-1.5 flex flex-1 flex-col border-2 border-black">
        <div className={`pointer-events-none absolute inset-0 ${COLS}`} aria-hidden>
          <div className="border-r border-black" />
          <div className="border-r border-black" />
          <div className="border-r border-black" />
          <div className="border-r border-black" />
          <div />
        </div>
        <div className={`relative ${COLS} border-b border-black text-center leading-tight`}>
          <Head th="ลำดับที่" en="Item" />
          <Head th="รายการ" en="Description" />
          <Head th="จำนวน" en="Quantity" />
          <Head th="ราคา/หน่วย" en="Unit Price" />
          <Head th="จำนวนเงิน" en="Amount" />
        </div>
        {items.map((i, idx) => (
          <div key={i.id} className={`relative ${COLS} items-start`}>
            <div className="px-1 pt-1 text-center">{idx + 1}</div>
            <div className="px-2 pt-1">
              {i.description}
              {i.discount_amount > 0 && <span className="block text-[11px]">ส่วนลด {formatMoney(i.discount_amount)}</span>}
            </div>
            <div className="px-2 pt-1 text-right">{i.quantity.toLocaleString()}</div>
            <div className="px-2 pt-1 text-right">{formatMoney(i.unit_price)}</div>
            <div className="px-2 pt-1 text-right">{formatMoney(i.amount)}</div>
          </div>
        ))}
        {invoice.discount_amount > 0 && (
          <div className={`relative ${COLS} items-start`}>
            <div />
            <div className="px-2 pt-1">หักส่วนลด</div>
            <div />
            <div />
            <div className="px-2 pt-1 text-right">-{formatMoney(invoice.discount_amount)}</div>
          </div>
        )}
        <div className="min-h-12 flex-1" />
        {(invoice.order_refs || invoice.note) && (
          <div className={`relative ${COLS} pb-2`}>
            <div />
            <div className="space-y-1 px-2">
              {invoice.order_refs && (
                <>
                  <p># อ้างอิง{invoice.channel_names ? ` ${invoice.channel_names}` : ""}</p>
                  <p className="break-all">{invoice.order_refs}</p>
                </>
              )}
              {invoice.note && <p>หมายเหตุ: {invoice.note}</p>}
            </div>
          </div>
        )}
      </section>

      {/* Payment + totals */}
      <section className={COLS}>
        <div className="col-span-2 space-y-2.5 pr-4 pt-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>รายการรับชำระเงิน</span>
            <Check on={invoice.payment_method === "cash"} label="เงินสด" />
            <Check on={invoice.payment_method === "transfer"} label="เงินโอน" />
            <Check on={invoice.payment_method === "cheque"} label="เช็ค" />
          </div>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] items-end gap-x-2 gap-y-2.5">
            <span>ธนาคาร/Bank</span>
            <Fill>{invoice.payment_bank}</Fill>
            <span>เลขที่/Chq #</span>
            <Fill>{invoice.payment_ref}</Fill>
            <span>สาขา/Branch</span>
            <Fill>{invoice.payment_branch}</Fill>
            <span>ลว./Date</span>
            <Fill>{shortDate(invoice.payment_date)}</Fill>
          </div>
        </div>
        <div className="col-span-2 grid border-x-2 border-b-2 border-black text-center">
          <div className="flex min-h-11 items-center justify-center border-b border-black px-1">รวมเงิน</div>
          <div className="flex min-h-11 flex-col items-center justify-center border-b border-black px-1 leading-tight">
            <span>ภาษีมูลค่าเพิ่ม</span>
            <span>( VAT 7% )</span>
          </div>
          <div className="flex min-h-11 flex-col items-center justify-center px-1 leading-tight">
            <span className="font-semibold">ยอดเงินสุทธิ</span>
            <span>NET AMOUNT</span>
          </div>
        </div>
        <div className="grid border-b-2 border-r-2 border-black text-right">
          <div className="flex min-h-11 items-center justify-end border-b border-black px-2">{formatMoney(net)}</div>
          <div className="flex min-h-11 items-center justify-end border-b border-black px-2">{formatMoney(vat)}</div>
          <div className="flex min-h-11 items-center justify-end px-2 font-bold">{formatMoney(invoice.total_amount)}</div>
        </div>
      </section>
      <p className="mt-1 text-right text-[10px] text-gray-600">ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว</p>

      {/* Amount in figures + words */}
      <section className="mt-2 space-y-3">
        <div className="flex items-end gap-3">
          <span className="w-28">จำนวนเงิน/Amount</span>
          <span className="w-[100mm] border-b border-r border-black pb-0.5 text-center font-semibold">
            {formatMoney(invoice.total_amount)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-28 pl-4 font-semibold">ตัวอักษร</span>
          <span className="w-[100mm] border-2 border-black py-1.5 text-center font-semibold">
            ( {bahtText(invoice.total_amount)} )
          </span>
        </div>
      </section>

      {/* Signatures */}
      <footer className="mt-3 grid grid-cols-[1fr_1fr_1.25fr] border-2 border-black text-center">
        <Sign title="ผู้รับสินค้า" bottom="วันที่ ........................................" />
        <Sign title="ผู้ส่งสินค้า" bottom="วันที่ ........................................" />
        <Sign title={`ในนาม ${company?.name ?? ""}`} bottom="ผู้มีอำนาจลงนาม" last />
      </footer>
      <p className="mt-1.5 text-center text-[11px] font-semibold">
        * ใบเสร็จรับเงินฉบับนี้จะมีผลสมบูรณ์เมื่อเช็คของท่านเรียกเก็บเงินจากธนาคารได้เรียบร้อยแล้ว
      </p>
    </article>
  );
}

/** Label + value on a dashed fill-in line, like the paper form. */
function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[30mm_1fr] items-end gap-2 py-0.5">
      <span className="text-[11px]">{label}</span>
      <span className="min-h-5 border-b border-dashed border-sky-600 px-1 print:border-sky-700">{children}</span>
    </div>
  );
}

function Fill({ children }: { children: React.ReactNode }) {
  return <span className="min-h-4 border-b border-black px-1 text-center">{children}</span>;
}

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex h-3.5 w-3.5 items-center justify-center border border-black text-[11px] font-bold leading-none">
        {on ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}

function Head({ th, en }: { th: string; en: string }) {
  return (
    <div className="px-1 py-1">
      <p className="text-[12.5px] font-semibold">{th}</p>
      <p className="text-[10px]">{en}</p>
    </div>
  );
}

function Sign({ title, bottom, last }: { title: string; bottom: string; last?: boolean }) {
  return (
    <div className={`flex flex-col ${last ? "" : "border-r border-black"}`}>
      <p className="pt-1 text-[13px] font-semibold">{title}</p>
      <div className="h-14 border-b border-dashed border-sky-600" />
      <p className="py-1 text-[10px]">{bottom}</p>
    </div>
  );
}
