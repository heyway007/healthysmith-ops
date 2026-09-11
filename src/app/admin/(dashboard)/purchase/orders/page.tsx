import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteOrder } from "./actions";
import { PO_STATUS } from "./status";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: orders }, { data: suppliers }] = await Promise.all([
    supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("suppliers").select("id, name"),
  ]);
  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ใบสั่งซื้อ (Purchase Order)</h2>
          <p className="mt-1 text-sm text-teal-700">คำสั่งซื้อที่ส่งให้ซัพพลายเออร์</p>
        </div>
        <Link
          href="/admin/purchase/orders/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          สร้างใบสั่งซื้อ
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เลขที่ PO</th>
              <th className="px-4 py-3">ซัพพลายเออร์</th>
              <th className="px-4 py-3">วันที่สั่ง</th>
              <th className="px-4 py-3">คาดว่าจะได้รับ</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">ยอดรวม</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/purchase/orders/${o.id}`}
                    className="font-medium text-teal-800 hover:text-orange-600"
                  >
                    {o.po_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">{supplierNameById.get(o.supplier_id) ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">{o.order_date}</td>
                <td className="px-4 py-3 text-teal-700">{o.expected_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} config={PO_STATUS} />
                </td>
                <td className="px-4 py-3 text-teal-700">{o.total_amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {o.status === "draft" && (
                    <DeleteButton
                      action={deleteOrder.bind(null, o.id)}
                      confirmMessage={`ลบใบสั่งซื้อ "${o.po_number}"?`}
                    />
                  )}
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีใบสั่งซื้อ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
