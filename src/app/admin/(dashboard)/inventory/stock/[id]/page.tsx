import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { thaiDate } from "@/lib/thai-money";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { MOVEMENT_TYPES, formatQty, formatSignedQty, movementPrintHref } from "../../labels";

const LIMIT = 300;

/** Stock card: every movement of one product, newest first, with the balance after each. */
export default async function StockCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: movements }] = await Promise.all([
    supabase.from("product_stock").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", id)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(LIMIT),
  ]);
  if (!product) notFound();

  const receiptIds = [...new Set((movements ?? []).map((m) => m.production_receipt_id).filter((x): x is string => !!x))];
  const { data: receipts } = receiptIds.length
    ? await supabase.from("production_receipts").select("id, production_order_id").in("id", receiptIds)
    : { data: [] };
  const orderByReceipt = new Map((receipts ?? []).map((r) => [r.id, r.production_order_id]));

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
              const printHref = movementPrintHref(m);
              return (
                <tr key={m.id} className="border-t border-teal-100">
                  <td data-label="วันที่" className="whitespace-nowrap px-4 py-3 text-teal-700">{thaiDate(m.movement_date, true)}</td>
                  <td data-label="เลขที่เอกสาร" className="whitespace-nowrap px-4 py-3">
                    {printHref ? (
                      <Link href={printHref} target="_blank" title="พิมพ์เอกสาร" className="font-medium text-teal-800 hover:text-orange-600">
                        {m.doc_number ?? "พิมพ์"}
                      </Link>
                    ) : (
                      <span className="text-teal-400">-</span>
                    )}
                  </td>
                  <td data-label="ประเภท" className="px-4 py-3">
                    <StatusBadge status={m.movement_type} config={MOVEMENT_TYPES} />
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
