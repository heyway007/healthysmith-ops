"use client";

import { useActionState, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { formatMoney, splitVat } from "@/lib/thai-money";
import { createManualTaxInvoice } from "../actions";
import { BuyerForm, type BuyerDefaults } from "../new/buyer-form";
import { DateInput } from "@/components/ui/date-input";

type Customer = { id: string; name: string; tax_id: string | null; address: string | null; phone: string | null };
type Product = { id: string; sku: string; name: string; unit: string; sale_price: number };

export type Payment = {
  method: "" | "cash" | "transfer" | "cheque";
  bank: string;
  branch: string;
  ref: string;
  date: string;
};

const PAYMENT_METHODS = [
  { value: "", label: "ไม่ระบุ" },
  { value: "cash", label: "เงินสด" },
  { value: "transfer", label: "เงินโอน" },
  { value: "cheque", label: "เช็ค" },
] as const;

export type ManualRow = {
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

const cellClassName =
  "w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none";

const emptyRow = (): ManualRow => ({ productId: "", description: "", quantity: "1", unitPrice: "", discount: "" });

const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
const isBlank = (r: ManualRow) => !r.description.trim() && !r.unitPrice.trim() && !r.discount.trim();
const lineAmount = (r: ManualRow) => round2(num(r.quantity) * num(r.unitPrice) - num(r.discount));

export function ManualTaxInvoiceForm({
  defaults,
  defaultDate,
  lastIssueDate,
  customers,
  products,
  initialRows,
  initialDiscount,
  initialPayment,
  replace,
}: {
  defaults: BuyerDefaults;
  defaultDate: string;
  lastIssueDate: string | null;
  customers: Customer[];
  products: Product[];
  initialRows: ManualRow[];
  initialDiscount: string;
  initialPayment: Payment;
  replace?: { id: string; number: string };
}) {
  const [state, formAction] = useActionState(createManualTaxInvoice, null);
  const [rows, setRows] = useState<ManualRow[]>(initialRows.length ? initialRows : [emptyRow()]);
  const [billDiscount, setBillDiscount] = useState(initialDiscount);
  const [payment, setPayment] = useState(initialPayment);
  const setPay = (k: keyof Payment) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPayment((p) => ({ ...p, [k]: e.target.value }));

  const update = (i: number, patch: Partial<ManualRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Typing/picking a product name from the list links the product and fills
  // in its price (only when the price is still empty, so edits aren't lost).
  const setDescription = (i: number, value: string) => {
    const p = products.find((x) => x.name === value || `${x.sku} ${x.name}` === value);
    setRows((rs) =>
      rs.map((r, idx) =>
        idx !== i
          ? r
          : p
            ? { ...r, productId: p.id, description: p.name, unitPrice: r.unitPrice || String(p.sale_price) }
            : { ...r, productId: "", description: value },
      ),
    );
  };

  const lines = rows.filter((r) => !isBlank(r));
  const subtotal = round2(lines.reduce((s, r) => s + lineAmount(r), 0));
  const discount = round2(num(billDiscount));
  const total = round2(subtotal - discount);
  const { net, vat } = splitVat(total);

  const payload = lines.map((r) => ({
    product_id: r.productId || null,
    description: r.description.trim(),
    quantity: num(r.quantity),
    unit_price: num(r.unitPrice),
    discount_amount: num(r.discount),
  }));

  return (
    <>
      {state?.error && <p className="mb-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{state.error}</p>}
      <BuyerForm
        action={formAction}
        defaults={defaults}
        defaultDate={defaultDate}
        lastIssueDate={lastIssueDate}
        customers={customers}
        backHref={replace ? `/admin/tax-documents/tax-invoices/${replace.id}` : "/admin/tax-documents/tax-invoices"}
        replace={replace}
      >
        <input type="hidden" name="items" value={JSON.stringify(payload)} />
        <input type="hidden" name="discount_amount" value={discount || ""} />

        <h3 className="mt-8 text-sm font-semibold text-teal-900">รายการสินค้า</h3>
        <p className="mt-1 text-xs text-teal-600">
          พิมพ์ชื่อหรือรหัสสินค้าเพื่อเลือกจากรายการ หรือพิมพ์รายการเองได้ · ราคาต่อหน่วยเป็นราคารวม VAT แล้ว
        </p>

        <datalist id="manual-products">
          {products.map((p) => (
            <option key={p.id} value={p.name}>
              {p.sku} · ฿{formatMoney(p.sale_price)}
            </option>
          ))}
        </datalist>

        <div className="mt-3 overflow-x-auto rounded-lg border border-teal-100 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="w-10 px-3 py-2 text-center">#</th>
                <th className="px-3 py-2">รายการ</th>
                <th className="w-24 px-3 py-2 text-right">จำนวน</th>
                <th className="w-32 px-3 py-2 text-right">ราคา/หน่วย</th>
                <th className="w-28 px-3 py-2 text-right">ส่วนลด</th>
                <th className="w-32 px-3 py-2 text-right">จำนวนเงิน</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const amount = lineAmount(r);
                const unit = products.find((p) => p.id === r.productId)?.unit;
                return (
                  <tr key={i} className="border-t border-teal-100 align-top">
                    <td className="px-3 py-2.5 text-center text-teal-500">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      <input
                        list="manual-products"
                        value={r.description}
                        onChange={(e) => setDescription(i, e.target.value)}
                        required={!isBlank(r)}
                        placeholder="ชื่อสินค้า / บริการ"
                        aria-label={`รายการที่ ${i + 1}`}
                        className={cellClassName}
                      />
                      {r.productId && <p className="mt-0.5 text-xs text-teal-500">✓ สินค้าในระบบ{unit ? ` · หน่วย: ${unit}` : ""}</p>}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.001"
                        step="any"
                        value={r.quantity}
                        onChange={(e) => update(i, { quantity: e.target.value })}
                        required={!isBlank(r)}
                        aria-label="จำนวน"
                        className={`${cellClassName} text-right`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={r.unitPrice}
                        onChange={(e) => update(i, { unitPrice: e.target.value })}
                        required={!isBlank(r)}
                        placeholder="0.00"
                        aria-label="ราคาต่อหน่วย"
                        className={`${cellClassName} text-right`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={r.discount}
                        onChange={(e) => update(i, { discount: e.target.value })}
                        placeholder="0.00"
                        aria-label="ส่วนลด"
                        className={`${cellClassName} text-right`}
                      />
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${amount < 0 ? "text-orange-600" : "text-teal-950"}`}>
                      {isBlank(r) ? "-" : formatMoney(amount)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : [emptyRow()]))}
                        className="rounded border border-orange-200 p-1.5 text-orange-500 hover:border-orange-400 hover:bg-orange-50"
                        title="ลบรายการ"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
            className="flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            เพิ่มรายการ
          </button>

          <dl className="grid w-full max-w-sm grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-teal-700">รวมเป็นเงิน</dt>
            <dd className="text-right text-teal-900">{formatMoney(subtotal)}</dd>
            <dt>
              <label htmlFor="bill_discount" className="text-teal-700">
                หักส่วนลดท้ายบิล
              </label>
            </dt>
            <dd>
              <input
                id="bill_discount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
                placeholder="0.00"
                className={`${cellClassName} w-32 text-right`}
              />
            </dd>
            <dt className="border-t border-teal-200 pt-1.5 font-semibold text-teal-950">จำนวนเงินรวมทั้งสิ้น (รวม VAT)</dt>
            <dd className={`border-t border-teal-200 pt-1.5 text-right font-semibold ${total < 0 ? "text-orange-600" : "text-teal-950"}`}>
              {formatMoney(total)}
            </dd>
            <dt className="text-teal-600">มูลค่าสินค้าก่อน VAT</dt>
            <dd className="text-right text-teal-800">{formatMoney(net)}</dd>
            <dt className="text-teal-600">ภาษีมูลค่าเพิ่ม 7%</dt>
            <dd className="text-right text-teal-800">{formatMoney(vat)}</dd>
          </dl>
        </div>

        {total < 0 && (
          <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">ส่วนลดมากกว่ายอดรวม — กรุณาตรวจสอบ</p>
        )}

        <h3 className="mt-8 text-sm font-semibold text-teal-900">รายการรับชำระเงิน</h3>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="วิธีชำระเงิน">
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                payment.method === m.value ? "border-teal-600 bg-teal-50 font-medium text-teal-900" : "border-teal-200 bg-white text-teal-700"
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={m.value}
                checked={payment.method === m.value}
                onChange={() => setPayment((p) => ({ ...p, method: m.value }))}
                className="accent-teal-600"
              />
              {m.label}
            </label>
          ))}
        </div>
        {(payment.method === "transfer" || payment.method === "cheque") && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PayField label="ธนาคาร" name="payment_bank" value={payment.bank} onChange={setPay("bank")} />
            <PayField label="สาขา" name="payment_branch" value={payment.branch} onChange={setPay("branch")} />
            <PayField
              label={payment.method === "cheque" ? "เลขที่เช็ค" : "เลขอ้างอิงการโอน"}
              name="payment_ref"
              value={payment.ref}
              onChange={setPay("ref")}
            />
            <PayField
              label={payment.method === "cheque" ? "เช็คลงวันที่" : "วันที่โอน"}
              name="payment_date"
              type="date"
              value={payment.date}
              onChange={setPay("date")}
            />
          </div>
        )}
      </BuyerForm>
    </>
  );
}

function PayField({
  label,
  name,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-teal-700">
        {label}
      </label>
      {type === "date" ? (
        <DateInput id={name} name={name} value={value} onChange={onChange} className={`${cellClassName} mt-1`} />
      ) : (
        <input id={name} name={name} type={type} value={value} onChange={onChange} className={`${cellClassName} mt-1`} />
      )}
    </div>
  );
}
