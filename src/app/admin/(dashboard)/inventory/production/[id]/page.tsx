import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faPrint, faTruckRampBox } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { thaiDate } from "@/lib/thai-money";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { dangerButtonClassName, formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { PRODUCTION_STATUS, formatQty } from "../../labels";
import { cancelProductionReceipt, receiveProduction, setProductionOrderStatus } from "../actions";
import { DateInput } from "@/components/ui/date-input";

const cellInput =
  "w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none";

export default async function ProductionOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; received?: string }>;
}) {
  const { id } = await params;
  const { error, received } = await searchParams;
  const supabase = await createClient();

  const [{ data: order }, { data: items }, { data: receipts }] = await Promise.all([
    supabase.from("production_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("production_order_items").select("*").eq("production_order_id", id).order("sort_order"),
    supabase
      .from("production_receipts")
      .select("*")
      .eq("production_order_id", id)
      .order("receipt_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();

  const receiptIds = (receipts ?? []).map((r) => r.id);
  const productIds = (items ?? []).map((i) => i.product_id);
  const [{ data: receiptItems }, { data: products }] = await Promise.all([
    receiptIds.length
      ? supabase.from("production_receipt_items").select("*").in("production_receipt_id", receiptIds)
      : Promise.resolve({ data: [] as never[] }),
    productIds.length
      ? supabase.from("products").select("id, sku, name, unit").in("id", productIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const linesByReceipt = new Map<string, NonNullable<typeof receiptItems>>();
  for (const line of receiptItems ?? []) {
    linesByReceipt.set(line.production_receipt_id, [...(linesByReceipt.get(line.production_receipt_id) ?? []), line]);
  }

  const newReceipt = received ? receipts?.find((r) => r.id === received) : undefined;
  const canReceive = order.status === "open" || order.status === "partial";
  const hasActiveReceipts = (receipts ?? []).some((r) => !r.is_cancelled);
  const totalOrdered = (items ?? []).reduce((s, i) => s + i.quantity, 0);
  const totalReceived = (items ?? []).reduce((s, i) => s + i.received_quantity, 0);
  const overdue = canReceive && order.due_date && order.due_date < bangkokToday();

  return (
    <div>
      <BackLink href="/admin/inventory/production" label="กลับไปหน้ารายการใบผลิต" />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-teal-950">ใบผลิต {order.production_number}</h2>
            <StatusBadge status={order.status} config={PRODUCTION_STATUS} />
          </div>
          <p className="mt-1 text-sm text-teal-700">
            สั่งผลิต {thaiDate(order.order_date)}
            {order.due_date && (
              <span className={overdue ? "font-medium text-rose-600" : undefined}>
                {" "}· ต้องการภายใน {thaiDate(order.due_date)}
                {overdue && " (เลยกำหนด)"}
              </span>
            )}
            {order.producer_name && <> · ผู้ผลิต: {order.producer_name}</>}
          </p>
          {order.note && <p className="mt-1 whitespace-pre-line text-sm text-teal-600">หมายเหตุ: {order.note}</p>}
          {order.close_reason && (
            <p className="mt-1 text-sm text-gray-600">
              {order.status === "cancelled" ? "เหตุผลที่ยกเลิก" : "เหตุผลที่ปิดใบ"}: {order.close_reason}
              {order.closed_by_email && ` (${order.closed_by_email})`}
            </p>
          )}
          {order.created_by_email && <p className="mt-1 text-xs text-teal-400">สร้างโดย {order.created_by_email}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canReceive && (
            <Link href={`/admin/inventory/production/${id}/edit`} className={`flex items-center gap-2 ${secondaryButtonClassName}`}>
              <FontAwesomeIcon icon={faPenToSquare} />
              แก้ไขใบผลิต
            </Link>
          )}
          <Link
            href={`/admin/print/inventory/production-orders?id=${id}`}
            target="_blank"
            className={`flex items-center gap-2 ${submitButtonClassName}`}
          >
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์ใบสั่งผลิต
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}
      {received && !error && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          รับสินค้าเข้าคลังแล้ว
          {newReceipt && (
            <>
              {" "}·{" "}
              <Link href={`/admin/print/inventory/production-receipts?id=${newReceipt.id}`} target="_blank" className="underline">
                พิมพ์ใบรับ {newReceipt.receipt_number}
              </Link>
            </>
          )}
        </p>
      )}

      {/* Items and progress */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[640px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">สินค้า</th>
              <th className="px-4 py-3 text-right">สั่งผลิต</th>
              <th className="px-4 py-3 text-right">รับแล้ว</th>
              <th className="px-4 py-3 text-right">ค้างรับ</th>
              <th className="w-48 px-4 py-3">ความคืบหน้า</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((i) => {
              const p = productById.get(i.product_id);
              const pct = Math.min(100, Math.round((i.received_quantity / i.quantity) * 100));
              return (
                <tr key={i.id} className="border-t border-teal-100">
                  <td data-label="สินค้า" className="px-4 py-3">
                    <Link href={`/admin/inventory/stock/${i.product_id}`} className="text-teal-900 hover:text-orange-600">
                      <span className="font-medium">{p?.sku}</span> {p?.name}
                    </Link>
                  </td>
                  <td data-label="สั่งผลิต" className="px-4 py-3 text-right text-teal-800">
                    {formatQty(i.quantity)} <span className="text-xs text-teal-500">{p?.unit}</span>
                  </td>
                  <td data-label="รับแล้ว" className="px-4 py-3 text-right font-medium text-emerald-700">{formatQty(i.received_quantity)}</td>
                  <td data-label="ค้างรับ" className="px-4 py-3 text-right font-medium text-amber-700">
                    {formatQty(Math.max(i.quantity - i.received_quantity, 0))}
                  </td>
                  <td data-label="ความคืบหน้า" className="px-4 py-3">
                    <ProgressBar pct={pct} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-teal-200 bg-teal-50/60">
              <td className="px-4 py-3 text-right text-teal-700">รวม</td>
              <td data-label="สั่งผลิต" className="px-4 py-3 text-right font-semibold text-teal-900">{formatQty(totalOrdered)}</td>
              <td data-label="รับแล้ว" className="px-4 py-3 text-right font-semibold text-emerald-700">{formatQty(totalReceived)}</td>
              <td data-label="ค้างรับ" className="px-4 py-3 text-right font-semibold text-amber-700">
                {formatQty(Math.max(totalOrdered - totalReceived, 0))}
              </td>
              <td data-label="ความคืบหน้า" className="px-4 py-3">
                <ProgressBar pct={totalOrdered ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Receive (partial or full) */}
      {canReceive && (
        <section id="receive" className={`mt-6 ${formCardClassName}`}>
          <h3 className="flex items-center gap-2 font-semibold text-teal-950">
            <FontAwesomeIcon icon={faTruckRampBox} className="text-teal-600" />
            รับสินค้าเข้าคลัง
          </h3>
          <p className="mt-1 text-sm text-teal-700">
            ใส่เฉพาะจำนวนที่ได้รับรอบนี้ — รับแยกได้หลายครั้งจนครบ ช่องที่เว้นว่างจะไม่รับ
          </p>
          <form action={receiveProduction.bind(null, id)} className="mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-teal-800" htmlFor="receipt_date">
                  วันที่รับ
                </label>
                <DateInput
                  id="receipt_date"
                  name="receipt_date"
                  defaultValue={bangkokToday()}
                  required
                  className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-teal-800" htmlFor="receipt_note">
                  หมายเหตุ (เช่น เลขที่ใบส่งของจากโรงงาน)
                </label>
                <textarea
                  id="receipt_note"
                  name="note"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-teal-100 bg-white">
              <table className="stack-table w-full text-sm md:min-w-[720px]">
                <thead>
                  <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                    <th className="px-3 py-2">สินค้า</th>
                    <th className="px-3 py-2 text-right">ค้างรับ</th>
                    <th className="w-36 px-3 py-2 text-right">รับรอบนี้</th>
                    <th className="w-36 px-3 py-2">Lot</th>
                    <th className="w-40 px-3 py-2">วันหมดอายุ</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    ?.filter((i) => i.received_quantity < i.quantity)
                    .map((i) => {
                      const p = productById.get(i.product_id);
                      const remaining = i.quantity - i.received_quantity;
                      return (
                        <tr key={i.id} className="border-t border-teal-100">
                          <td data-label="สินค้า" className="px-3 py-2 text-teal-900">
                            <span className="font-medium">{p?.sku}</span> {p?.name}
                          </td>
                          <td data-label="ค้างรับ" className="px-3 py-2 text-right text-amber-700">
                            {formatQty(remaining)} <span className="text-xs text-teal-500">{p?.unit}</span>
                          </td>
                          <td data-label="รับรอบนี้" className="px-2 py-1.5">
                            <input type="hidden" name="item_id" value={i.id} />
                            <input
                              name="quantity"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={remaining}
                              step="any"
                              placeholder={formatQty(remaining)}
                              aria-label={`จำนวนรับ ${p?.sku ?? ""}`}
                              className={`${cellInput} text-right`}
                            />
                          </td>
                          <td data-label="Lot" className="px-2 py-1.5">
                            <input name="lot_number" aria-label="Lot" className={cellInput} />
                          </td>
                          <td data-label="วันหมดอายุ" className="px-2 py-1.5">
                            <DateInput name="expiry_date" aria-label="วันหมดอายุ" className={cellInput} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <SubmitButton className={submitButtonClassName}>รับเข้าคลัง</SubmitButton>
            </div>
          </form>
        </section>
      )}

      {/* Receipt history */}
      <section className="mt-8">
        <h3 className="font-semibold text-teal-950">ประวัติการรับสินค้า</h3>
        <div className="mt-3 space-y-3">
          {receipts?.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${r.is_cancelled ? "border-gray-200 opacity-70" : "border-teal-100"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${r.is_cancelled ? "text-gray-500 line-through" : "text-teal-900"}`}>
                    {r.receipt_number}
                  </span>
                  <span className="text-sm text-teal-600">รับวันที่ {thaiDate(r.receipt_date)}</span>
                  {r.is_cancelled && (
                    <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">ยกเลิกแล้ว</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-teal-400">{r.created_by_email}</span>
                  <Link
                    href={`/admin/print/inventory/production-receipts?id=${r.id}`}
                    target="_blank"
                    className="flex items-center gap-1.5 rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                  >
                    <FontAwesomeIcon icon={faPrint} />
                    พิมพ์ใบรับ
                  </Link>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-teal-800">
                {(linesByReceipt.get(r.id) ?? []).map((l) => {
                  const p = productById.get(l.product_id);
                  return (
                    <li key={l.id}>
                      <span className="font-medium">{p?.sku}</span> {p?.name} —{" "}
                      <span className="font-semibold text-emerald-700">
                        {formatQty(l.quantity)} {p?.unit}
                      </span>
                      {l.lot_number && <span className="text-teal-600"> · Lot {l.lot_number}</span>}
                      {l.expiry_date && <span className="text-teal-600"> · หมดอายุ {thaiDate(l.expiry_date, true)}</span>}
                    </li>
                  );
                })}
              </ul>
              {r.note && <p className="mt-1 whitespace-pre-line text-xs text-teal-500">หมายเหตุ: {r.note}</p>}
              {r.is_cancelled ? (
                <p className="mt-1 text-xs text-gray-500">
                  ยกเลิกโดย {r.cancelled_by_email ?? "-"}: {r.cancel_reason}
                </p>
              ) : (
                order.status !== "cancelled" && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-rose-600">ยกเลิกการรับครั้งนี้ (ตัดสต๊อกออก)</summary>
                    <form action={cancelProductionReceipt.bind(null, id, r.id)} className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        name="reason"
                        required
                        placeholder="เหตุผล เช่น บันทึกผิด"
                        className="w-64 max-w-full rounded-lg border border-teal-300 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
                      />
                      <SubmitButton className={dangerButtonClassName} pendingLabel="กำลังยกเลิก...">
                        ยืนยันยกเลิก
                      </SubmitButton>
                    </form>
                  </details>
                )
              )}
            </div>
          ))}
          {(!receipts || receipts.length === 0) && <p className="text-sm text-teal-400">ยังไม่มีการรับสินค้า</p>}
        </div>
      </section>

      {/* Order status */}
      {order.status !== "cancelled" && order.status !== "completed" && (
        <section className="mt-8 flex flex-wrap gap-6 border-t border-teal-100 pt-6">
          {canReceive && hasActiveReceipts && (
            <StatusAction
              title="ปิดใบผลิต (รับไม่ครบ)"
              hint="ใช้เมื่อผลิตไม่ครบและจะไม่รับส่วนที่เหลือแล้ว"
              action={setProductionOrderStatus.bind(null, id, "close")}
              button="ปิดใบผลิต"
              reasonRequired={false}
            />
          )}
          {order.status === "closed" && (
            <form action={setProductionOrderStatus.bind(null, id, "reopen")}>
              <SubmitButton className={secondaryButtonClassName} pendingLabel="กำลังเปิด...">
                เปิดใบผลิตอีกครั้ง
              </SubmitButton>
            </form>
          )}
          {!hasActiveReceipts && (
            <StatusAction
              title="ยกเลิกใบผลิต"
              hint="ยกเลิกได้เมื่อยังไม่มีการรับสินค้าเข้าคลัง"
              action={setProductionOrderStatus.bind(null, id, "cancel")}
              button="ยกเลิกใบผลิต"
              reasonRequired
            />
          )}
        </section>
      )}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-teal-100">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-teal-600">{pct}%</span>
    </div>
  );
}

function StatusAction({
  title,
  hint,
  action,
  button,
  reasonRequired,
}: {
  title: string;
  hint: string;
  action: (formData: FormData) => Promise<void>;
  button: string;
  reasonRequired: boolean;
}) {
  return (
    <details className="min-w-64">
      <summary className="cursor-pointer text-sm font-medium text-rose-600">{title}</summary>
      <p className="mt-1 text-xs text-teal-600">{hint}</p>
      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        <input
          name="reason"
          required={reasonRequired}
          placeholder={reasonRequired ? "เหตุผล" : "เหตุผล (ถ้ามี)"}
          className="w-64 max-w-full rounded-lg border border-teal-300 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
        />
        <SubmitButton className={dangerButtonClassName}>{button}</SubmitButton>
      </form>
    </details>
  );
}
