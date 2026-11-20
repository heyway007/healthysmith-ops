import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { thaiDate } from "@/lib/thai-money";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { MOVEMENT_TYPES, formatQty, formatSignedQty, movementViewHref } from "../../labels";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { CancelWithReasonButton } from "@/components/ui/cancel-with-reason-button";
import { cancelStockDocument } from "../../movements/actions";
import { UNLOTTED_LABEL, expiryStatus, fefoSort, shortDate } from "@/components/inventory/lots";

const LIMIT = 300;

/** Stock card: every movement of one product, newest first, with the balance after each. */
export default async function StockCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancelled?: string; error?: string }>;
}) {
  const { id } = await params;
  const { cancelled, error } = await searchParams;
  const supabase = await createClient();

  const [{ data: product }, { data: movements }, { data: lotData }] = await Promise.all([
    supabase.from("product_stock").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", id)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("product_lot_stock")
      .select("product_id, lot_number, expiry_date, on_hand, received_date")
      .eq("product_id", id)
      .neq("on_hand", 0),
  ]);
  if (!product) notFound();

  // balance per lot (soonest expiry first); shown for lot-tracked products or anything that has a lot
  const lots = fefoSort(lotData ?? []);
  const showLots = product.track_lot || lots.some((l) => l.lot_number);
  const today = bangkokToday();
  const unlotted = lots.find((l) => l.lot_number === null);

  const receiptIds = [...new Set((movements ?? []).map((m) => m.production_receipt_id).filter((x): x is string => !!x))];
  const { data: receipts } = receiptIds.length
    ? await supabase.from("production_receipts").select("id, production_order_id").in("id", receiptIds)
    : { data: [] };
  const orderByReceipt = new Map((receipts ?? []).map((r) => [r.id, r.production_order_id]));

  const docNumbers = [...new Set((movements ?? []).map((m) => m.doc_number).filter((d): d is string => !!d))];
  const { data: cancellations } = docNumbers.length
    ? await supabase.from("stock_document_cancellations").select("doc_number").in("doc_number", docNumbers)
    : { data: [] };
  const cancelledDocs = new Set((cancellations ?? []).map((c) => c.doc_number));
  const formShown = new Set<string>(); // cancel form on the first row of each IN / OUT document

  // Walk back from the current balance so the latest rows are right even
  // when older history is beyond the page limit.
  const rows: (NonNullable<typeof movements>[number] & { after: number })[] = [];
  for (const m of movements ?? []) {
    const after = rows.length ? rows[rows.length - 1].after - rows[rows.length - 1].quantity : product.on_hand;
    rows.push({ ...m, after });
  }
  const totalIn = rows.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
  const totalOut = rows.filter((m) => m.quantity < 0).reduce((s, m) => s - m.quantity, 0);

  return (
    <div>
      <BackLink href="/admin/inventory/stock" label="กลับไปหน้าสต๊อกคงเหลือ" />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">
            {product.sku} · {product.name}
          </h2>
          <p className="mt-1 text-sm text-teal-700">
            การ์ดสต๊อก — ความเคลื่อนไหวเข้า-ออกทั้งหมด ·{" "}
            <Link href={`/admin/inventory/products/${id}`} className="text-orange-600 hover:underline">
              แก้ไขข้อมูลสินค้า
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Stat label="คงเหลือ" value={`${formatQty(product.on_hand)} ${product.unit}`} />
          {product.in_production > 0 && (
            <Stat label="กำลังผลิต (ค้างรับ)" value={`${formatQty(product.in_production)} ${product.unit}`} />
          )}
          {product.min_stock > 0 && <Stat label="ขั้นต่ำ" value={`${formatQty(product.min_stock)} ${product.unit}`} />}
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {cancelled && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ยกเลิกเอกสาร {cancelled} แล้ว — ระบบบันทึกรายการกลับสต๊อกให้เรียบร้อย
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/admin/inventory/movements/new?type=in&product=${id}`}
          className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-50"
        >
          + รับเข้า
        </Link>
        <Link
          href={`/admin/inventory/movements/new?type=out&product=${id}`}
          className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-50"
        >
          − เบิกออก
        </Link>
      </div>

      {showLots && (
        <section className="mt-4">
          <h3 className="text-sm font-semibold text-teal-950">
            ยอดคงเหลือแยกตามล็อต
            {product.track_lot && (
              <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">ติดตามเป็นล็อต</span>
            )}
          </h3>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
            <table className="stack-table w-full text-sm md:min-w-[620px]">
              <thead>
                <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
                  <th className="px-4 py-2.5">Lot</th>
                  <th className="px-4 py-2.5">วันหมดอายุ</th>
                  <th className="px-4 py-2.5">สถานะ</th>
                  <th className="px-4 py-2.5">รับเข้าเมื่อ</th>
                  <th className="px-4 py-2.5 text-right">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => {
                  const st = expiryStatus(l.expiry_date, today);
                  return (
                    <tr key={l.lot_number ?? ""} className="border-t border-teal-100">
                      <td data-label="Lot" className="px-4 py-2.5 font-medium text-teal-800">
                        {l.lot_number ?? <span className="font-normal text-teal-400">{UNLOTTED_LABEL}</span>}
                      </td>
                      <td data-label="วันหมดอายุ" className="whitespace-nowrap px-4 py-2.5 text-teal-700">
                        {l.expiry_date ? shortDate(l.expiry_date) : "-"}
                      </td>
                      <td data-label="สถานะ" className="px-4 py-2.5">
                        {l.expiry_date ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                        ) : (
                          <span className="text-teal-300">-</span>
                        )}
                      </td>
                      <td data-label="รับเข้าเมื่อ" className="whitespace-nowrap px-4 py-2.5 text-teal-600">
                        {l.received_date ? shortDate(l.received_date) : "-"}
                      </td>
                      <td data-label="คงเหลือ" className={`px-4 py-2.5 text-right font-semibold ${l.on_hand < 0 ? "text-rose-600" : "text-teal-950"}`}>
                        {formatQty(l.on_hand)} <span className="text-xs font-normal text-teal-500">{product.unit}</span>
                      </td>
                    </tr>
                  );
                })}
                {lots.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-teal-400">
                      ไม่มีสต๊อกคงเหลือ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {product.track_lot && unlotted && (
            <p className="mt-2 text-xs text-amber-700">
              มีสต๊อก {formatQty(unlotted.on_hand)} {product.unit} ที่ยังไม่ระบุล็อต (รับเข้าก่อนเปิดใช้ล็อต) — ใช้ &quot;นับสต๊อก&quot; ปรับกลุ่มนี้เป็น 0
              แล้วรับเข้าใหม่พร้อมเลข Lot เพื่อให้ยอดอยู่ในล็อตที่ถูกต้อง
            </p>
          )}
        </section>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[860px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">เลขที่เอกสาร</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">อ้างอิง / หมายเหตุ</th>
              <th className="px-4 py-3">Lot / หมดอายุ</th>
              <th className="px-4 py-3 text-right">เข้า</th>
              <th className="px-4 py-3 text-right">ออก</th>
              <th className="px-4 py-3 text-right">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const orderId = m.production_receipt_id ? orderByReceipt.get(m.production_receipt_id) : undefined;
              const viewHref = movementViewHref(m, orderId);
              const isCancelled = !!m.doc_number && cancelledDocs.has(m.doc_number);
              const canCancel =
                !!m.doc_number &&
                !m.is_reversal &&
                (m.movement_type === "in" || m.movement_type === "out") &&
                !isCancelled &&
                !formShown.has(m.doc_number);
              if (canCancel) formShown.add(m.doc_number!);
              return (
                <tr key={m.id} className="border-t border-teal-100">
                  <td data-label="วันที่" className="whitespace-nowrap px-4 py-3 text-teal-700">{thaiDate(m.movement_date, true)}</td>
                  <td data-label="เลขที่เอกสาร" className="whitespace-nowrap px-4 py-3">
                    {viewHref ? (
                      <Link href={viewHref} title="ดูเอกสาร" className="font-medium text-teal-800 hover:text-orange-600">
                        {m.doc_number ?? "พิมพ์"}
                      </Link>
                    ) : (
                      <span className="text-teal-400">-</span>
                    )}
                    {canCancel && (
                      <div className="mt-1.5">
                        <CancelWithReasonButton
                          action={cancelStockDocument.bind(null, m.doc_number!, `/admin/inventory/stock/${id}`)}
                          title={`ยกเลิกเอกสาร ${m.doc_number}`}
                          description="ยกเลิกทั้งใบ ระบบจะบันทึกรายการกลับสต๊อกให้ และใบเดิมยังเก็บไว้เป็นประวัติ"
                          label={`ยกเลิกเอกสาร ${m.doc_number}`}
                          submitLabel="ยืนยันยกเลิกทั้งใบ"
                          reasonPlaceholder="เช่น บันทึกซ้ำ"
                        />
                      </div>
                    )}
                  </td>
                  <td data-label="ประเภท" className="px-4 py-3">
                    <StatusBadge status={m.movement_type} config={MOVEMENT_TYPES} />
                    {m.is_reversal && (
                      <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">รายการกลับ</span>
                    )}
                    {isCancelled && !m.is_reversal && (
                      <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">ยกเลิกแล้ว</span>
                    )}
                  </td>
                  <td data-label="อ้างอิง / หมายเหตุ" className="px-4 py-3 text-teal-800">
                    {orderId ? (
                      <Link href={`/admin/inventory/production/${orderId}`} className="hover:text-orange-600">
                        {m.ref_no}
                      </Link>
                    ) : (
                      m.ref_no
                    )}
                    {m.note && <span className="block text-xs text-teal-500">{m.note}</span>}
                    {m.created_by_email && <span className="block text-xs text-teal-400">โดย {m.created_by_email}</span>}
                  </td>
                  <td data-label="Lot / หมดอายุ" className="px-4 py-3 text-teal-700">
                    {m.lot_number ?? "-"}
                    {m.expiry_date && <span className="block text-xs text-teal-500">หมดอายุ {thaiDate(m.expiry_date, true)}</span>}
                  </td>
                  <td data-label="เข้า" className="px-4 py-3 text-right font-medium text-emerald-700">
                    {m.quantity > 0 ? formatSignedQty(m.quantity) : ""}
                  </td>
                  <td data-label="ออก" className="px-4 py-3 text-right font-medium text-orange-600">
                    {m.quantity < 0 ? formatSignedQty(m.quantity) : ""}
                  </td>
                  <td data-label="คงเหลือ" className="px-4 py-3 text-right font-semibold text-teal-950">{formatQty(m.after)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีความเคลื่อนไหว
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-teal-200 bg-teal-50/60 text-sm">
                <td colSpan={5} className="px-4 py-3 text-right text-teal-700">
                  รวม{rows.length === LIMIT ? ` (${LIMIT} รายการล่าสุด)` : ""}
                </td>
                <td data-label="รวมเข้า" className="px-4 py-3 text-right font-semibold text-emerald-700">+{formatQty(totalIn)}</td>
                <td data-label="รวมออก" className="px-4 py-3 text-right font-semibold text-orange-600">-{formatQty(totalOut)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white px-4 py-2 shadow-sm">
      <p className="text-xs font-medium text-teal-500">{label}</p>
      <p className="text-lg font-semibold text-teal-950">{value}</p>
    </div>
  );
}
