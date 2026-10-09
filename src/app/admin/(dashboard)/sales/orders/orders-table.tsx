"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoice, faLayerGroup, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { startNavigationProgress } from "@/components/ui/navigation-progress";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { formatMoney, thaiDate } from "@/lib/thai-money";
import { ChannelBadge, ORDER_STATUS } from "../status";
import { issueTaxInvoicesPerOrder } from "../tax-invoices/actions";

export type OrderRow = {
  id: string;
  orderNumber: string;
  externalId: string | null;
  date: string;
  channelCode: string | null;
  channelName: string | null;
  buyer: string | null;
  requested: boolean;
  items: string | null;
  total: number;
  status: string;
  taxInvoiceId: string | null;
  taxInvoiceNumber: string | null;
};

const canIssue = (r: OrderRow) => r.status !== "cancelled" && !r.taxInvoiceId;

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; errors: string[] } | null>(null);

  const issuable = useMemo(() => rows.filter(canIssue), [rows]);
  const chosen = rows.filter((r) => selected.has(r.id));
  const allChecked = issuable.length > 0 && issuable.every((r) => selected.has(r.id));
  const months = new Set(chosen.map((r) => r.date.slice(0, 7)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const issueEach = () => {
    if (!window.confirm(`ออกใบกำกับภาษี ${chosen.length} ใบ (1 ใบต่อ 1 ออเดอร์)?`)) return;
    setMessage(null);
    startTransition(async () => {
      const res = await issueTaxInvoicesPerOrder(chosen.map((r) => r.id));
      setSelected(new Set());
      setMessage({ text: `ออกใบกำกับภาษีแล้ว ${res.issued} ใบ`, errors: res.errors });
      router.refresh();
    });
  };

  const combine = () => {
    startNavigationProgress();
    router.push(`/admin/sales/tax-invoices/new?orders=${chosen.map((r) => r.id).join(",")}`);
  };

  return (
    <div>
      <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-teal-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <span className="text-sm text-teal-700">
          เลือก <b className="text-teal-950">{chosen.length}</b> ออเดอร์
          {chosen.length > 0 && ` · ฿${formatMoney(chosen.reduce((s, r) => s + r.total, 0))}`}
        </span>
        <button
          type="button"
          disabled={pending || chosen.length === 0}
          onClick={issueEach}
          className={`${submitButtonClassName} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FontAwesomeIcon icon={pending ? faSpinner : faFileInvoice} spin={pending} />
          {pending ? "กำลังออกใบกำกับ..." : "ออกใบกำกับแยกตามออเดอร์"}
        </button>
        <button
          type="button"
          disabled={pending || chosen.length === 0 || months.size > 1}
          onClick={combine}
          title={months.size > 1 ? "รวมเป็นใบเดียวได้เฉพาะออเดอร์ในเดือนเดียวกัน" : undefined}
          className={`${secondaryButtonClassName} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FontAwesomeIcon icon={faLayerGroup} />
          {chosen.length === 1 ? "ออกใบกำกับ (แก้ข้อมูลผู้ซื้อ)" : "รวมเป็นใบเดียว"}
        </button>
        {chosen.length > 0 && (
          <button type="button" onClick={() => setSelected(new Set())} className="text-sm text-teal-500 hover:text-teal-800">
            ล้างที่เลือก
          </button>
        )}
      </div>

      {message && (
        <div className="mb-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>
            {message.text} —{" "}
            <Link href="/admin/sales/tax-invoices" className="font-medium underline hover:text-orange-600">
              ไปพิมพ์ที่หน้าใบกำกับภาษี
            </Link>
          </p>
          {message.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-orange-700">
              {message.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="เลือกทั้งหมด"
                  checked={allChecked}
                  disabled={issuable.length === 0}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(issuable.map((r) => r.id)))}
                  className="size-4 accent-teal-600"
                />
              </th>
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">ออเดอร์</th>
              <th className="px-4 py-3">ผู้ซื้อ</th>
              <th className="px-4 py-3">สินค้า</th>
              <th className="px-4 py-3 text-right">ยอด (รวม VAT)</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">ใบกำกับภาษี</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-teal-100 ${selected.has(r.id) ? "bg-orange-50/60" : "hover:bg-teal-50"} ${
                  r.status === "cancelled" ? "text-gray-400" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${r.externalId ?? r.orderNumber}`}
                    checked={selected.has(r.id)}
                    disabled={!canIssue(r)}
                    onChange={() => toggle(r.id)}
                    className="size-4 accent-teal-600 disabled:opacity-30"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-teal-700">{thaiDate(r.date, true)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/sales/orders/${r.id}`} className="font-mono text-xs font-medium text-teal-800 hover:text-orange-600">
                    {r.externalId ?? r.orderNumber}
                  </Link>
                  <div className="mt-1">
                    <ChannelBadge code={r.channelCode} name={r.channelName} />
                  </div>
                </td>
                <td className="px-4 py-3 text-teal-900">
                  {r.buyer ?? "-"}
                  {r.requested && (
                    <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                      ขอใบกำกับ
                    </span>
                  )}
                </td>
                <td className="max-w-72 truncate px-4 py-3 text-teal-700" title={r.items ?? undefined}>
                  {r.items ?? "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-teal-900">{formatMoney(r.total)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} config={ORDER_STATUS} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.taxInvoiceId ? (
                    <Link
                      href={`/admin/sales/tax-invoices/${r.taxInvoiceId}`}
                      className="font-mono text-xs font-medium text-emerald-700 hover:text-orange-600"
                    >
                      {r.taxInvoiceNumber}
                    </Link>
                  ) : (
                    <span className="text-xs text-teal-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-teal-400">
                  ไม่มีออเดอร์ในเดือนนี้ —{" "}
                  <Link href="/admin/sales/orders/import" className="text-teal-600 underline hover:text-orange-600">
                    นำเข้าออเดอร์
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
