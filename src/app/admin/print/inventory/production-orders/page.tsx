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
import { PRODUCTION_STATUS, formatQty } from "@/app/admin/(dashboard)/inventory/labels";
import { idsFrom } from "../ids";

// ใบสั่งผลิตสินค้า -- opened from a production order's page.
export default async function PrintProductionOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const ids = idsFrom((await searchParams).id);
  const supabase = await createClient();

  const [{ data: company }, { data: orders }, { data: items }] = await Promise.all([
    supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
    ids.length ? supabase.from("production_orders").select("*").in("id", ids).order("production_number") : { data: [] },
    ids.length
      ? supabase.from("production_order_items").select("*").in("production_order_id", ids).order("sort_order")
      : { data: [] },
  ]);
  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, sku, name, unit").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  await logDocumentEvents(
    "document.print",
    "production_orders",
    (orders ?? []).map((o) => ({ id: o.id, label: o.production_number })),
  );

  return (
    <>
      <PrintBar summary={`ใบสั่งผลิต ${(orders ?? []).length} ใบ`} canPrint={(orders ?? []).length > 0} />
      <main className="py-6 print:py-0">
        {(orders ?? []).length === 0 && <p className="text-center text-gray-500">ไม่พบใบผลิตที่จะพิมพ์</p>}
        {orders?.map((o) => {
          const lines = (items ?? []).filter((i) => i.production_order_id === o.id);
          const anyReceived = lines.some((i) => i.received_quantity > 0);
          return (
            <DocSheet key={o.id} label={o.production_number}>
              {o.status === "cancelled" && <CancelledStamp />}
              <DocHeader
                company={company}
                title="ใบสั่งผลิตสินค้า"
                titleEn="PRODUCTION ORDER"
                number={o.production_number}
                date={o.order_date}
                extra={o.due_date ? [["ต้องการภายใน", docDate(o.due_date)]] : undefined}
              />
              <DocInfo
                rows={[
                  ["ผู้ผลิต / โรงงาน", o.producer_name],
                  ["หมายเหตุ", o.note],
                  ["สถานะ ณ วันที่พิมพ์", anyReceived || o.status !== "open" ? PRODUCTION_STATUS[o.status]?.label : null],
                ]}
              />
              <table className={docTableClassName}>
                <thead>
                  <tr>
                    <th className="w-[12mm]">ลำดับ</th>
                    <th className="w-[28mm]">รหัสสินค้า</th>
                    <th>รายการ</th>
                    <th className="w-[24mm]">จำนวนสั่งผลิต</th>
                    <th className="w-[16mm]">หน่วย</th>
                    {anyReceived && <th className="w-[20mm]">รับแล้ว</th>}
                    {anyReceived && <th className="w-[20mm]">ค้างรับ</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((i, n) => {
                    const p = productById.get(i.product_id);
                    return (
                      <tr key={i.id}>
                        <td className="text-center">{n + 1}</td>
                        <td>{p?.sku}</td>
                        <td>{p?.name}</td>
                        <td className="text-right font-semibold">{formatQty(i.quantity)}</td>
                        <td className="text-center">{p?.unit}</td>
                        {anyReceived && <td className="text-right">{formatQty(i.received_quantity)}</td>}
                        {anyReceived && <td className="text-right">{formatQty(Math.max(i.quantity - i.received_quantity, 0))}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {o.close_reason && (
                <p className="mt-2">
                  {o.status === "cancelled" ? "เหตุผลที่ยกเลิก" : "ปิดใบ (รับไม่ครบ)"}: {o.close_reason}
                </p>
              )}
              <DocSignatures labels={["ผู้สั่งผลิต", "ผู้อนุมัติ", "ผู้รับคำสั่งผลิต"]} />
            </DocSheet>
          );
        })}
      </main>
    </>
  );
}
