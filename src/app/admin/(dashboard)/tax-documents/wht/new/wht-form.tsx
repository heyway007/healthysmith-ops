"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileSignature, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { bahtText, formatMoney } from "@/lib/thai-money";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { PAYER_CONDITIONS, WHT_FORM_TYPES, WHT_INCOME_TYPES, WHT_RATES, formatTaxId13 } from "@/lib/wht";
import { createWhtCertificate } from "../actions";
import { DateInput } from "@/components/ui/date-input";

type Supplier = { id: string; name: string; tax_id: string | null; address: string | null };
type Payer = { name: string; taxId: string | null; address: string | null } | null;

export type WhtDefaults = {
  supplierId: string;
  billId: string;
  payeeType: "person" | "juristic";
  payeeName: string;
  payeeTaxId: string;
  payeeAddress: string;
  issueDate: string;
  signerName: string;
  /** income lines to start with (from a bill, or every line of a copied certificate) */
  lines: { type: string; description: string; amount: string; payDate: string; tax?: string }[];
  formType?: string;
  payerCondition?: string;
  /** sequence_label, book_number, payer_condition_other, pf_* / sso_* fields */
  extra?: Record<string, string>;
  /** correcting an issued certificate: it is cancelled and linked to the new one */
  replace?: { id: string; number: string };
};

type Row = { type: string; description: string; payDate: string; amount: string; rate: string; tax: string; taxEdited: boolean };

const inputClassName =
  "mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";
const cellClassName = "w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none";

const num = (s: string) => (Number.isFinite(Number(s)) ? Number(s) : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
const calcTax = (amount: string, rate: string) => (amount && rate ? String(round2((num(amount) * num(rate)) / 100)) : "");

export function WhtForm({
  payer,
  suppliers,
  defaults,
}: {
  payer: Payer;
  suppliers: Supplier[];
  defaults: WhtDefaults;
}) {
  const [state, formAction] = useActionState(createWhtCertificate, null);
  const [supplierId, setSupplierId] = useState(defaults.supplierId);
  const [payeeType, setPayeeType] = useState(defaults.payeeType);
  const [formType, setFormType] = useState(defaults.formType ?? (defaults.payeeType === "person" ? "pnd3" : "pnd53"));
  const [payee, setPayee] = useState({ name: defaults.payeeName, taxId: defaults.payeeTaxId, address: defaults.payeeAddress });
  const [issueDate, setIssueDate] = useState(defaults.issueDate);
  const [condition, setCondition] = useState(defaults.payerCondition ?? "withhold");
  // Controlled so nothing typed is lost when the server sends back an error
  // (React resets uncontrolled fields after a form action).
  const [extra, setExtra] = useState<Record<string, string>>({ ...defaults.extra, signer_name: defaults.signerName });
  const bind = (name: string) => ({
    id: name,
    name,
    value: extra[name] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setExtra((x) => ({ ...x, [name]: e.target.value })),
  });
  const [rows, setRows] = useState<Row[]>(() =>
    defaults.lines.length
      ? defaults.lines.map((l) =>
          l.tax != null
            ? { ...l, rate: "", taxEdited: true, tax: l.tax }
            : { ...l, rate: "3", tax: calcTax(l.amount, "3"), taxEdited: false },
        )
      : [{ type: "5", description: "", payDate: defaults.issueDate, amount: "", rate: "3", tax: "", taxEdited: false }],
  );

  const pickSupplier = (id: string) => {
    setSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    if (s) setPayee({ name: s.name, taxId: s.tax_id ?? "", address: s.address ?? "" });
  };
  const pickType = (t: "person" | "juristic") => {
    setPayeeType(t);
    setFormType(t === "person" ? "pnd3" : "pnd53");
  };

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, ...patch };
        // Tax follows amount × rate until someone types a tax figure themselves.
        if (!next.taxEdited && ("amount" in patch || "rate" in patch)) next.tax = calcTax(next.amount, next.rate);
        return next;
      }),
    );

  const lines = rows.filter((r) => r.amount.trim() !== "");
  const totalPaid = round2(lines.reduce((s, r) => s + num(r.amount), 0));
  const totalTax = round2(lines.reduce((s, r) => s + num(r.tax), 0));
  const payload = lines.map((r) => ({
    income_type: r.type,
    description: r.description.trim(),
    pay_date: r.payDate,
    amount: num(r.amount),
    tax: num(r.tax),
  }));

  const taxIdDigits = payee.taxId.replace(/\D/g, "");
  const taxIdInvalid = taxIdDigits !== "" && taxIdDigits.length !== 13;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{state.error}</p>}
      <input type="hidden" name="lines" value={JSON.stringify(payload)} />
      <input type="hidden" name="supplier_id" value={supplierId} />
      <input type="hidden" name="purchase_bill_id" value={defaults.billId} />
      {defaults.replace && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
          <input type="hidden" name="replaces_id" value={defaults.replace.id} />
          <p className="text-sm text-sky-900">
            แก้ไขหนังสือรับรองเลขที่ <span className="font-mono font-semibold">{defaults.replace.number}</span> — เมื่อกดออก
            ระบบจะออกฉบับใหม่ (เลขที่ใหม่) และยกเลิกฉบับเดิมโดยเก็บไว้พร้อมเหตุผล
          </p>
          <label className="mt-3 block text-sm font-medium text-sky-900" htmlFor="edit_reason">
            เหตุผลที่แก้ไข <span className="text-orange-500">*</span>
          </label>
          <input {...bind("edit_reason")} required placeholder="เช่น ยอดเงินผิด / ชื่อผู้รับเงินผิด" className={inputClassName} />
        </div>
      )}

      <div className={formCardClassName}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (บริษัทเรา)</h3>
        {payer ? (
          <div className="mt-2 text-sm text-teal-900">
            <p className="font-medium">{payer.name}</p>
            <p className="text-teal-700">
              เลขผู้เสียภาษี {formatTaxId13(payer.taxId) || "-"} · {payer.address ?? "-"}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-orange-600">
            ⚠️ ยังไม่ได้ตั้งค่าข้อมูลบริษัท —{" "}
            <Link href="/admin/tax-documents/company" className="underline">
              ไปตั้งค่าที่ เอกสารภาษี → ข้อมูลบริษัท
            </Link>
          </p>
        )}
      </div>

      <div className={formCardClassName}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ผู้ถูกหักภาษี ณ ที่จ่าย</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-teal-800" htmlFor="pick_supplier">
                ดึงข้อมูลจากร้านค้า / ผู้ขาย (ถ้ามี)
              </label>
              <select id="pick_supplier" value={supplierId} onChange={(e) => pickSupplier(e.target.value)} className={selectClassName}>
                <option value="">— กรอกเอง —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.tax_id ? ` (${s.tax_id})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="text-sm font-medium text-teal-800">ประเภทผู้ถูกหักภาษี</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(
                [
                  ["juristic", "นิติบุคคล / บริษัท"],
                  ["person", "บุคคลธรรมดา"],
                ] as const
              ).map(([v, label]) => (
                <label
                  key={v}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                    payeeType === v ? "border-teal-600 bg-teal-50 font-medium text-teal-900" : "border-teal-200 bg-white text-teal-700"
                  }`}
                >
                  <input type="radio" name="payee_type" value={v} checked={payeeType === v} onChange={() => pickType(v)} className="accent-teal-600" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-teal-800" htmlFor="payee_name">
              ชื่อ <span className="text-orange-500">*</span>
            </label>
            <input
              id="payee_name"
              name="payee_name"
              required
              value={payee.name}
              onChange={(e) => setPayee((p) => ({ ...p, name: e.target.value }))}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="payee_tax_id">
              {payeeType === "person" ? "เลขประจำตัวประชาชน" : "เลขประจำตัวผู้เสียภาษี"} (13 หลัก)
            </label>
            <input
              id="payee_tax_id"
              name="payee_tax_id"
              inputMode="numeric"
              value={payee.taxId}
              onChange={(e) => setPayee((p) => ({ ...p, taxId: e.target.value }))}
              className={`${inputClassName} ${taxIdInvalid ? "border-orange-400" : ""}`}
            />
            {taxIdInvalid && <p className="mt-1 text-xs text-orange-600">ต้องเป็นตัวเลข 13 หลัก</p>}
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-teal-800" htmlFor="payee_address">
              ที่อยู่
            </label>
            <textarea
              id="payee_address"
              name="payee_address"
              rows={2}
              value={payee.address}
              onChange={(e) => setPayee((p) => ({ ...p, address: e.target.value }))}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div className={formCardClassName}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ข้อมูลเอกสาร</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="issue_date">
              วันที่ออกหนังสือ <span className="text-orange-500">*</span>
            </label>
            <DateInput
              id="issue_date"
              name="issue_date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-teal-500">เลขที่ออกอัตโนมัติ เช่น {issueDate ? `${issueDate.slice(8, 10)}${issueDate.slice(5, 7)}${issueDate.slice(2, 4)}-01` : "161026-01"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="form_type">
              ยื่นในแบบ <span className="text-orange-500">*</span>
            </label>
            <select id="form_type" name="form_type" value={formType} onChange={(e) => setFormType(e.target.value)} className={selectClassName}>
              {WHT_FORM_TYPES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="sequence_label">
              ลำดับที่ในแบบ
            </label>
            <input {...bind("sequence_label")} placeholder="เช่น 01/001" className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="book_number">
              เล่มที่ (ถ้ามี)
            </label>
            <input {...bind("book_number")} className={inputClassName} />
          </div>
        </div>
      </div>

      <div className={formCardClassName}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">เงินได้ที่จ่ายและภาษีที่หัก</h3>
        <p className="mt-1 text-xs text-teal-600">
          จำนวนเงินที่จ่ายใช้ยอดก่อน VAT · เลือกอัตราแล้วระบบคำนวณภาษีให้ หรือพิมพ์ยอดภาษีเองได้
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-teal-100 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-3 py-2">ประเภทเงินได้</th>
                <th className="w-36 px-3 py-2">วันที่จ่าย</th>
                <th className="w-36 px-3 py-2 text-right">จำนวนเงินที่จ่าย</th>
                <th className="w-24 px-3 py-2">อัตรา</th>
                <th className="w-32 px-3 py-2 text-right">ภาษีที่หัก</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const spec = WHT_INCOME_TYPES.find((t) => t.key === r.type);
                return (
                  <tr key={i} className="border-t border-teal-100 align-top">
                    <td className="px-2 py-1.5">
                      <select value={r.type} onChange={(e) => update(i, { type: e.target.value })} aria-label="ประเภทเงินได้" className={cellClassName}>
                        {WHT_INCOME_TYPES.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.short}
                          </option>
                        ))}
                      </select>
                      {spec?.specify && (
                        <input
                          value={r.description}
                          onChange={(e) => update(i, { description: e.target.value })}
                          required
                          placeholder="ระบุ"
                          aria-label="ระบุประเภทเงินได้"
                          className={`${cellClassName} mt-1`}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <DateInput
                        value={r.payDate}
                        onChange={(e) => update(i, { payDate: e.target.value })}
                        required
                        aria-label="วันที่จ่าย"
                        className={cellClassName}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={r.amount}
                        onChange={(e) => update(i, { amount: e.target.value })}
                        required={i === 0}
                        placeholder="0.00"
                        aria-label="จำนวนเงินที่จ่าย"
                        className={`${cellClassName} text-right`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.rate}
                        onChange={(e) => update(i, { rate: e.target.value, taxEdited: false })}
                        aria-label="อัตราภาษี"
                        className={cellClassName}
                      >
                        {WHT_RATES.map((rate) => (
                          <option key={rate} value={String(rate)}>
                            {rate}%
                          </option>
                        ))}
                        <option value="">กำหนดเอง</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={r.tax}
                        onChange={(e) => update(i, { tax: e.target.value, taxEdited: true })}
                        placeholder="0.00"
                        aria-label="ภาษีที่หัก"
                        className={`${cellClassName} text-right`}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))}
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
            onClick={() =>
              setRows((rs) => [...rs, { type: "5", description: "", payDate: issueDate, amount: "", rate: "3", tax: "", taxEdited: false }])
            }
            className="flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            เพิ่มรายการ
          </button>
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
            <dt className="text-teal-700">รวมเงินที่จ่าย</dt>
            <dd className="text-right font-medium text-teal-950">{formatMoney(totalPaid)}</dd>
            <dt className="text-teal-700">รวมภาษีที่หักและนำส่ง</dt>
            <dd className="text-right font-semibold text-teal-950">{formatMoney(totalTax)}</dd>
            <dd className="col-span-2 text-right text-xs text-teal-600">({bahtText(totalTax)})</dd>
          </dl>
        </div>
      </div>

      <div className={formCardClassName}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ผู้จ่ายเงินและผู้ลงนาม</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {PAYER_CONDITIONS.map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                condition === p.value ? "border-teal-600 bg-teal-50 font-medium text-teal-900" : "border-teal-200 bg-white text-teal-700"
              }`}
            >
              <input
                type="radio"
                name="payer_condition"
                value={p.value}
                checked={condition === p.value}
                onChange={() => setCondition(p.value)}
                className="accent-teal-600"
              />
              {p.label}
            </label>
          ))}
        </div>
        {condition === "other" && (
          <input {...bind("payer_condition_other")} required placeholder="ระบุ" className={`${inputClassName} max-w-md`} />
        )}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="signer_name">
              ชื่อผู้ลงนาม (ผู้มีหน้าที่หักภาษี ณ ที่จ่าย)
            </label>
            <input {...bind("signer_name")} className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-teal-800" htmlFor="note">
              หมายเหตุภายใน (ไม่พิมพ์ในหนังสือ)
            </label>
            <input {...bind("note")} className={inputClassName} />
          </div>
        </div>

        <details className="mt-4 rounded-lg border border-teal-100 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-teal-800">
            กองทุนสำรองเลี้ยงชีพ / ประกันสังคม (กรณีจ่ายเงินเดือน — ถ้าไม่มีไม่ต้องกรอก)
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="ใบอนุญาตกองทุนสำรองเลี้ยงชีพ เลขที่" {...bind("pf_license_no")} />
            <Field label="เงินสะสมเข้ากองทุนสำรองเลี้ยงชีพ (บาท)" type="number" {...bind("pf_amount")} />
            <Field label="เงินสมทบประกันสังคม (บาท)" type="number" {...bind("sso_amount")} />
            <Field label="เลขที่บัญชีนายจ้าง" {...bind("sso_employer_no")} />
            <Field label="เลขที่บัตรประกันสังคมของผู้ถูกหักภาษี" {...bind("sso_card_no")} />
          </div>
        </details>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton className={submitButtonClassName} pendingLabel="กำลังออกหนังสือ...">
          <FontAwesomeIcon icon={faFileSignature} />
          {defaults.replace ? "ออกฉบับแก้ไข" : "ออกหนังสือรับรอง"}
        </SubmitButton>
        <Link
          href={defaults.replace ? `/admin/tax-documents/wht/${defaults.replace.id}` : "/admin/tax-documents/wht"}
          className={secondaryButtonClassName}
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  type = "text",
  ...input
}: {
  label: string;
  type?: string;
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-teal-800" htmlFor={input.id}>
        {label}
      </label>
      <input
        {...input}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        className={inputClassName}
      />
    </div>
  );
}
