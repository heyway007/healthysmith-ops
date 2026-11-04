import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { thaiDate } from "@/lib/thai-money";
import { StatusBadge } from "@/components/ui/status-badge";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { PRODUCTION_STATUS, formatQty } from "../labels";

const VIEWS: Record<string, { label: string; statuses: string[] | null }> = {
  active: { label: "กำลังผลิต / รอรับ", statuses: ["open", "partial"] },
  completed: { label: "รับครบแล้ว", statuses: ["completed"] },
  closed: { label: "ปิด / ยกเลิก", statuses: ["closed", "cancelled"] },
  all: { label: "ทั้งหมด", statuses: null },
};

export default async function ProductionOrdersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  const view = params.view && params.view in VIEWS ? params.view : "active";
  const supabase = await createClient();

  let query = supabase
    .from("production_orders")
    .select("*")
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  const statuses = VIEWS[view].statuses;
  if (statuses) query = query.in("status", statuses);
  const { data: orders } = await query;

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: items } = orderIds.length
    ? await supabase.from("production_order_items").select("*").in("production_order_id", orderIds).order("sort_order")
    : { data: [] };
  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, sku, name, unit").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const itemsByOrder = new Map<string, NonNullable<typeof items>>();
  for (const i of items ?? []) itemsByOrder.set(i.production_order_id, [...(itemsByOrder.get(i.production_order_id) ?? []), i]);

  const today = bangkokToday();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ใบผลิตสินค้า</h2>
          <p className="mt-1 text-sm text-teal-700">สั่งผลิตแล้วรับสินค้าเข้าคลังได้ทีละล็อตจนครบ — ยอดที่รับจะเข้าสต๊อกทันที</p>
        </div>
        <Link href="/admin/inventory/production/new" className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}>
          <FontAwesomeIcon icon={faPlus} />
          เปิดใบผลิต
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-1">
        {Object.entries(VIEWS).map(([key, v]) => (
          <Link
            key={key}
            href={`/admin/inventory/production?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              view === key ? "bg-teal-700 text-white" : "bg-white text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เลขที่</th>
              <th className="px-4 py-3">วันที่สั่ง</th>
              <th className="px-4 py-3">ต้องการภายใน</th>
              <th className="px-4 py-3">สินค้า</th>
              <th className="px-4 py-3">ผู้ผลิต</th>
              <th className="px-4 py-3 text-right">รับแล้ว / สั่ง</th>
              <th className="px-4 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => {
              const lines = itemsByOrder.get(o.id) ?? [];
              const ordered = lines.reduce((s, i) => s + i.quantity, 0);
              const received = lines.reduce((s, i) => s + i.received_quantity, 0);
              const first = productById.get(lines[0]?.product_id ?? "");
              const overdue = (o.status === "open" || o.status === "partial") && o.due_date && o.due_date < today;
              return (
                <tr key={o.id} className="border-t border-teal-100 hover:bg-teal-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link href={`/admin/inventory/production/${o.id}`} className="font-medium text-teal-800 hover:text-orange-600">
                      {o.production_number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-teal-700">{thaiDate(o.order_date, true)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 ${overdue ? "font-medium text-rose-600" : "text-teal-700"}`}>
                    {o.due_date ? thaiDate(o.due_date, true) : "-"}
                    {overdue && <span className="block text-xs">เลยกำหนด</span>}
                  </td>
                  <td className="px-4 py-3 text-teal-900">
                    <Link href={`/admin/inventory/production/${o.id}`} className="hover:text-orange-600">
                      {first ? `${first.sku} ${first.name}` : "-"}
                    </Link>
                    {lines.length > 1 && <span className="text-teal-500"> และอีก {lines.length - 1} รายการ</span>}
                  </td>
                  <td className="px-4 py-3 text-teal-700">{o.producer_name ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-teal-900">
                    <span className="font-medium text-emerald-700">{formatQty(received)}</span> / {formatQty(ordered)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} config={PRODUCTION_STATUS} />
                  </td>
                </tr>
              );
            })}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  ไม่มีใบผลิตในกลุ่มนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
