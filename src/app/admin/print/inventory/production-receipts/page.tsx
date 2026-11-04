import { createClient } from "@/lib/supabase/server";
import { logDocumentEvents } from "@/lib/audit";
import { PrintBar } from "@/components/inventory/print-bar";
import {
  CancelledStamp,
  DocHeader,
  DocInfo,
  DocSheet,
  DocSignatures,
  docDate,
  docTableClassName,
} from "@/components/inventory/stock-document";
import { formatQty } from "@/app/admin/(dashboard)/inventory/labels";
import { idsFrom } from "../ids";

// ใบรับสินค้าจากการผลิต -- one per receiving round of a production order.
export default async function PrintProductionReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const ids = idsFrom((await searchParams).id);
  const supabase = await createClient();

  const [{ data: company }, { data: receipts }, { data: lines }] = await Promise.all([
    supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
    ids.length ? supabase.from("production_receipts").select("*").in("id", ids).order("receipt_number") : { data: [] },
    ids.length ? supabase.from("production_receipt_items").select("*").in("production_receipt_id", ids) : { data: [] },
  ]);
  const orderIds = [...new Set((receipts ?? []).map((r) => r.production_order_id))];
  const productIds = [...new Set((lines ?? []).map((l) => l.product_id))];
  const [{ data: orders }, { data: products }] = await Promise.all([
    orderIds.length
      ? supabase.from("production_orders").select("id, production_number, producer_name").in("id", orderIds)
      : { data: [] },
    productIds.length ? supabase.from("products").select("id, sku, name, unit").in("id", productIds) : { data: [] },
  ]);
  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  await logDocumentEvents(
    "document.print",
    "production_receipts",
    (receipts ?? []).map((r) => ({ id: r.id, label: r.receipt_number })),
  );

  return (
    <>
      <PrintBar summary={`ใบรับสินค้า ${(receipts ?? []).length} ใบ`} canPrint={(receipts ?? []).length > 0} />
      <main className="py-6 print:py-0">
        {(receipts ?? []).length === 0 && <p className="text-center text-gray-500">ไม่พบใบรับสินค้าที่จะพิมพ์</p>}
        {receipts?.map((r) => {
          const order = orderById.get(r.production_order_id);
          const rows = (lines ?? [])
            .filter((l) => l.production_receipt_id === r.id)
            .map((l) => ({ ...l, p: productById.get(l.product_id) }))
            .sort((a, b) => (a.p?.sku ?? "").localeCompare(b.p?.sku ?? ""));
          return (
            <DocSheet key={r.id} label={r.receipt_number}>
              {r.is_cancelled && <CancelledStamp />}
              <DocHeader
                company={company}
                title="ใบรับสินค้าจากการผลิต"
                titleEn="FINISHED GOODS RECEIPT"
                number={r.receipt_number}
                date={r.receipt_date}
                extra={order ? [["ใบสั่งผลิต", order.production_number]] : undefined}
              />
              <DocInfo
                rows={[
                  ["ผู้ผลิต / โรงงาน", order?.producer_name],
                  ["หมายเหตุ", r.note],
                  ["ยกเลิก", r.is_cancelled ? `${r.cancel_reason ?? ""} (${r.cancelled_by_email ?? "-"})` : null],
                ]}
              />
              <table className={docTableClassName}>
                <thead>
                  <tr>
                    <th className="w-[12mm]">ลำดับ</th>
                    <th className="w-[28mm]">รหัสสินค้า</th>
                    <th>รายการ</th>
                    <th className="w-[26mm]">Lot</th>
                    <th className="w-[24mm]">วันหมดอายุ</th>
                    <th className="w-[22mm]">จำนวนรับ</th>
                    <th className="w-[16mm]">หน่วย</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l, n) => (
                    <tr key={l.id}>
                      <td className="text-center">{n + 1}</td>
                      <td>{l.p?.sku}</td>
                      <td>{l.p?.name}</td>
                      <td>{l.lot_number}</td>
                      <td className="text-center">{docDate(l.expiry_date)}</td>
                      <td className="text-right font-semibold">{formatQty(l.quantity)}</td>
                      <td className="text-center">{l.p?.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {r.created_by_email && <p className="mt-2 text-[11px]">บันทึกในระบบโดย {r.created_by_email}</p>}
              <DocSignatures labels={["ผู้ส่งสินค้า", "ผู้รับสินค้า", "ผู้ตรวจสอบ"]} />
            </DocSheet>
          );
        })}
      </main>
    </>
  );
}
