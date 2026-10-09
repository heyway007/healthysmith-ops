"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoice } from "@fortawesome/free-solid-svg-icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { thaiDate } from "@/lib/thai-money";

export type BuyerDefaults = {
  name: string;
  taxId: string;
  branch: string;
  address: string;
  phone: string;
};

type Customer = { id: string; name: string; tax_id: string | null; address: string | null; phone: string | null };

const inputClassName =
  "mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

export function BuyerForm({
  action,
  orderIds,
  defaults,
  defaultDate,
  lastIssueDate,
  customers,
  backHref,
}: {
  action: (formData: FormData) => Promise<void>;
  orderIds: string[];
  defaults: BuyerDefaults;
  defaultDate: string;
  lastIssueDate: string | null;
  customers: Customer[];
  backHref: string;
}) {
  const [buyer, setBuyer] = useState(defaults);
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(defaultDate);
  const set = (k: keyof BuyerDefaults) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBuyer((b) => ({ ...b, [k]: e.target.value }));

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) return setBuyer(defaults);
    setBuyer({
      name: c.name,
      taxId: c.tax_id ?? "",
      branch: c.tax_id ? "สำนักงานใหญ่" : "",
      address: c.address ?? "",
      phone: c.phone ?? "",
    });
  };

  const taxIdDigits = buyer.taxId.replace(/[\s-]/g, "");
  const taxIdInvalid = taxIdDigits !== "" && !/^\d{13}$/.test(taxIdDigits);

  return (
    <form action={action} className={formCardClassName}>
      <input type="hidden" name="order_ids" value={orderIds.join(",")} />
      <input type="hidden" name="customer_id" value={customerId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customers.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-teal-800" htmlFor="pick_customer">
              ดึงข้อมูลจากรายชื่อลูกค้า (ถ้ามี)
            </label>
            <select id="pick_customer" value={customerId} onChange={(e) => pickCustomer(e.target.value)} className={selectClassName}>
              <option value="">— ใช้ข้อมูลจากออเดอร์ —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.tax_id ? ` (${c.tax_id})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-teal-800" htmlFor="buyer_name">
            ชื่อผู้ซื้อ / บริษัท <span className="text-orange-500">*</span>
          </label>
          <input id="buyer_name" name="buyer_name" required value={buyer.name} onChange={set("name")} className={inputClassName} />
        </div>
        <div>
          <label className="block text-sm font-medium text-teal-800" htmlFor="issue_date">
            วันที่ใบกำกับ <span className="text-orange-500">*</span>
          </label>
          <input
            id="issue_date"
            name="issue_date"
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-800" htmlFor="buyer_tax_id">
            เลขประจำตัวผู้เสียภาษี (13 หลัก)
          </label>
          <input
            id="buyer_tax_id"
            name="buyer_tax_id"
            inputMode="numeric"
            value={buyer.taxId}
            onChange={set("taxId")}
            className={`${inputClassName} ${taxIdInvalid ? "border-orange-400" : ""}`}
          />
          {taxIdInvalid && <p className="mt-1 text-xs text-orange-600">ต้องเป็นตัวเลข 13 หลัก</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-teal-800" htmlFor="buyer_branch">
            สาขา
          </label>
          <input
            id="buyer_branch"
            name="buyer_branch"
            value={buyer.branch}
            onChange={set("branch")}
            placeholder={taxIdDigits ? "สำนักงานใหญ่" : "ไม่ต้องกรอกสำหรับบุคคลธรรมดา"}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-teal-800" htmlFor="buyer_phone">
            เบอร์โทร
          </label>
          <input id="buyer_phone" name="buyer_phone" value={buyer.phone} onChange={set("phone")} className={inputClassName} />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-teal-800" htmlFor="buyer_address">
            ที่อยู่
          </label>
          <textarea id="buyer_address" name="buyer_address" rows={2} value={buyer.address} onChange={set("address")} className={inputClassName} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-teal-800" htmlFor="note">
            หมายเหตุ (พิมพ์ในใบกำกับ)
          </label>
          <input id="note" name="note" className={inputClassName} />
        </div>
      </div>

      {lastIssueDate && issueDate < lastIssueDate && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠️ มีใบกำกับภาษีลงวันที่ {thaiDate(lastIssueDate)} ออกไปแล้ว — ใบนี้ลงวันที่ย้อนหลัง
          ทำให้เลขที่ไม่เรียงตามวันที่ ควรตรวจสอบกับฝ่ายบัญชีก่อน
        </p>
      )}

      <div className="mt-6 flex items-center gap-4 border-t border-teal-100 pt-5">
        <SubmitButton className={submitButtonClassName} pendingLabel="กำลังออกใบกำกับ...">
          <FontAwesomeIcon icon={faFileInvoice} />
          ออกใบกำกับภาษี
        </SubmitButton>
        <Link href={backHref} className={secondaryButtonClassName}>
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
