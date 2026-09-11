import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { GR_STATUS } from "./status";

export default async function PurchaseReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: receipts }, { data: orders }, { data: suppliers }] = await Promise.all([
    supabase.from("goods_receipts").select("*").order("created_at", { ascending: false }),
    supabase.from("purchase_orders").select("id, po_number"),
    supabase.from("suppliers").select("id, name"),
  ]);
  const poNumberById = new Map((orders ?? []).map((o) => [o.id, o.po_number]));
  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ใบรับสินค้า (Goods Receipt)</h2>
          <p className="mt-1 text-sm text-teal-700">บันทึกการรับสินค้าจากใบสั่งซื้อ</p>
        </div>
        <Link
          href="/admin/purchase/receipts/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          สร้างใบรับสินค้า
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เลขที่ GR</th>
              <th className="px-4 py-3">อ้างอิง PO</th>
              <th className="px-4 py-3">ซัพพลายเออร์</th>
              <th className="px-4 py-3">วันที่รับ</th>
              <th className="px-4 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {receipts?.map((r) => (
              <tr key={r.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/purchase/receipts/${r.id}`}
                    className="font-medium text-teal-800 hover:text-orange-600"
                  >
                    {r.gr_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">{poNumberById.get(r.purchase_order_id) ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">{supplierNameById.get(r.supplier_id) ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">{r.receipt_date}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} config={GR_STATUS} />
                </td>
              </tr>
            ))}
            {(!receipts || receipts.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีใบรับสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
