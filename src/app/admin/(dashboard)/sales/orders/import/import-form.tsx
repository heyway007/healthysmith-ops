"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faDownload,
  faFileArrowUp,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { formatMoney, thaiDate } from "@/lib/thai-money";
import { ORDER_STATUS } from "../../status";
import {
  commitOrderImport,
  previewOrderImport,
  type ImportPreview,
  type ImportResult,
} from "./actions";

type FormatOption = { key: string; label: string; hint: string; needsChannel: boolean };

export function ImportForm({
  formats,
  channels,
}: {
  formats: FormatOption[];
  channels: { code: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [format, setFormat] = useState(formats[0]?.key ?? "shopee");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"preview" | "commit" | null>(null);

  const selected = formats.find((f) => f.key === format);
  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
  };

  // Called directly (not via <form action>) so the chosen file stays in the
  // input between "ตรวจสอบ" and "ยืนยัน" -- form actions reset the form.
  const run = (mode: "preview" | "commit") => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const data = new FormData(form);
    setError(null);
    setStep(mode);
    startTransition(async () => {
      if (mode === "preview") {
        const res = await previewOrderImport(data);
        if (res.ok) setPreview(res.data);
        else setError(res.error);
      } else {
        const res = await commitOrderImport(data);
        if (res.ok) {
          setResult(res.data);
          setPreview(null);
          form.reset();
        } else setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        className={formCardClassName}
        onSubmit={(e) => {
          e.preventDefault();
          run("preview");
        }}
        onChange={() => preview && setPreview(null)}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">1. เลือกช่องทาง</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {formats.map((f) => (
            <label
              key={f.key}
              className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition-colors ${
                format === f.key
                  ? "border-teal-600 bg-teal-50 font-medium text-teal-900 ring-2 ring-teal-100"
                  : "border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
              }`}
            >
              <input
                type="radio"
                name="format"
                value={f.key}
                checked={format === f.key}
                onChange={() => {
                  setFormat(f.key);
                  reset();
                }}
                className="sr-only"
              />
              {f.label}
            </label>
          ))}
        </div>
        {selected && <p className="mt-3 text-sm text-teal-600">วิธี export: {selected.hint}</p>}

        {selected?.needsChannel && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-teal-800" htmlFor="channel">
                ช่องทางการขาย
              </label>
              <select id="channel" name="channel" required className={selectClassName} defaultValue="">
                <option value="" disabled>
                  — เลือก —
                </option>
                {channels.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <a
                href="/templates/order-import-template.csv"
                download
                className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-orange-600"
              >
                <FontAwesomeIcon icon={faDownload} />
                ดาวน์โหลดไฟล์ตัวอย่าง (.csv)
              </a>
            </div>
          </div>
        )}

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-teal-500">2. เลือกไฟล์</h3>
        <input
          type="file"
          name="file"
          required
          accept=".xlsx,.csv,.txt"
          onChange={reset}
          className="mt-3 block w-full text-sm text-teal-800 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-800 hover:file:bg-teal-200"
        />
        <p className="mt-2 text-xs text-teal-500">รองรับ .xlsx และ .csv ไม่เกิน 10MB / 5,000 ออเดอร์ต่อไฟล์</p>

        <div className="mt-6 border-t border-teal-100 pt-5">
          <button type="submit" disabled={pending} className={`${submitButtonClassName} inline-flex items-center gap-2 disabled:opacity-70`}>
            <FontAwesomeIcon icon={pending && step === "preview" ? faSpinner : faFileArrowUp} spin={pending && step === "preview"} />
            {pending && step === "preview" ? "กำลังอ่านไฟล์..." : "ตรวจสอบไฟล์"}
          </button>
        </div>
      </form>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          {error}
        </p>
      )}

      {preview && (
        <div className={formCardClassName}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">3. ตรวจสอบก่อนนำเข้า</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ออเดอร์" value={preview.orderCount.toLocaleString()} />
            <Stat
              label="ช่วงวันที่"
              value={preview.dateFrom ? `${thaiDate(preview.dateFrom, true)} – ${thaiDate(preview.dateTo, true)}` : "-"}
            />
            <Stat label="ยอดขาย (ไม่รวมที่ยกเลิก)" value={`฿${formatMoney(preview.totalAmount)}`} />
            <Stat
              label="มีในระบบแล้ว (จะอัปเดต)"
              value={preview.existingCount.toLocaleString()}
            />
          </div>
          <p className="mt-3 text-sm text-teal-700">
            {preview.channelName} · {preview.fileName} · {preview.itemCount.toLocaleString()} รายการสินค้า
            {preview.cancelledCount > 0 && ` · ยกเลิก/คืน ${preview.cancelledCount.toLocaleString()} ออเดอร์`}
            {preview.billingCount > 0 && ` · ลูกค้าขอใบกำกับ ${preview.billingCount.toLocaleString()} ออเดอร์`}
          </p>

          {preview.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {preview.warnings.map((w) => (
                <li key={w}>⚠️ {w}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 overflow-x-auto rounded-xl border border-teal-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-50 text-left text-xs font-medium text-teal-700">
                  <th className="px-3 py-2">เลขที่ออเดอร์</th>
                  <th className="px-3 py-2">วันที่</th>
                  <th className="px-3 py-2">ผู้ซื้อ</th>
                  <th className="px-3 py-2">สินค้า</th>
                  <th className="px-3 py-2 text-right">ยอด</th>
                  <th className="px-3 py-2">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((o) => (
                  <tr key={o.id} className="border-t border-teal-100">
                    <td className="px-3 py-2 font-mono text-xs text-teal-900">{o.id}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-teal-700">{thaiDate(o.date, true)}</td>
                    <td className="px-3 py-2 text-teal-900">{o.buyer ?? "-"}</td>
                    <td className="max-w-80 truncate px-3 py-2 text-teal-700" title={o.items}>
                      {o.items}
                    </td>
                    <td className="px-3 py-2 text-right text-teal-900">{formatMoney(o.total)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={o.status} config={ORDER_STATUS} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.orderCount > preview.sample.length && (
            <p className="mt-2 text-xs text-teal-500">แสดง {preview.sample.length} ออเดอร์แรก</p>
          )}

          <div className="mt-5 flex flex-wrap gap-3 border-t border-teal-100 pt-5">
            <button
              type="button"
              disabled={pending || preview.orderCount === 0}
              onClick={() => run("commit")}
              className={`${submitButtonClassName} inline-flex items-center gap-2 disabled:opacity-70`}
            >
              <FontAwesomeIcon icon={pending && step === "commit" ? faSpinner : faCheck} spin={pending && step === "commit"} />
              {pending && step === "commit" ? "กำลังนำเข้า..." : `ยืนยันนำเข้า ${preview.orderCount.toLocaleString()} ออเดอร์`}
            </button>
            <button type="button" disabled={pending} onClick={reset} className={secondaryButtonClassName}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="font-medium">
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            นำเข้าเรียบร้อย — ใหม่ {result.inserted.toLocaleString()} · อัปเดต {result.updated.toLocaleString()}
            {result.locked > 0 && ` · ออกใบกำกับไปแล้ว ${result.locked.toLocaleString()} (อัปเดตเฉพาะสถานะ)`}
          </p>
          <Link
            href={`/admin/sales/orders?channel=${result.channel}${result.month ? `&month=${result.month}` : ""}`}
            className="mt-2 inline-block font-medium text-teal-700 underline hover:text-orange-600"
          >
            ไปที่รายการออเดอร์ →
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white px-4 py-3">
      <p className="text-xs text-teal-500">{label}</p>
      <p className="mt-1 font-semibold text-teal-950">{value}</p>
    </div>
  );
}
