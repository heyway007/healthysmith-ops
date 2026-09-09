import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formCardClassName } from "@/lib/ui-classes";
import { cancelReceipt } from "../actions";
import { GR_STATUS } from "../status";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: receipt } = await supabase.from("goods_receipts").select("*").eq("id", id).single();
  if (!receipt) notFound();

  const [{ data: order }, { data: supplier }, { data: items }, { data: receivedByEmp }] =
    await Promise.all([
      supabase.from("purchase_orders").select("po_number").eq("id", receipt.purchase_order_id).maybeSingle(),
      supabase.from("suppliers").select("name, supplier_code").eq("id", receipt.supplier_id).maybeSingle(),
      supabase.from("goods_receipt_items").select("*").eq("goods_receipt_id", id),
      receipt.received_by
        ? supabase
            .from("employees")
            .select("first_name, last_name")
            .eq("id", receipt.received_by)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  return (
    <div>
      <BackLink href="/purchase/receipts" label="กลับไปหน้าใบรับสินค้า" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-teal-950">ใบรับสินค้า — {receipt.gr_number}</h2>
        <StatusBadge status={receipt.status} config={GR_STATUS} />
      </div>

      <div className={`mt-6 ${formCardClassName}`}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="อ้างอิงใบสั่งซื้อ" value={order?.po_number ?? "-"} />
          <Info label="ซัพพลายเออร์" value={supplier ? `${supplier.name} (${supplier.supplier_code})` : "-"} />
          <Info label="วันที่รับ" value={receipt.receipt_date} />
          <Info
            label="ผู้รับสินค้า"
            value={receivedByEmp ? `${receivedByEmp.first_name} ${receivedByEmp.last_name}` : "-"}
          />
          <Info label="หมายเหตุ" value={receipt.note ?? "-"} />
        </dl>

        <div className="mt-6 overflow-x-auto rounded-lg border border-teal-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-3 py-2">จำนวนที่รับ</th>
                <th className="px-3 py-2">ราคา/หน่วย</th>
                <th className="px-3 py-2">ยอดรวม</th>
                <th className="px-3 py-2">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-t border-teal-100">
                  <td className="px-3 py-2 text-teal-900">{item.quantity_received}</td>
                  <td className="px-3 py-2 text-teal-700">{item.unit_price.toLocaleString()}</td>
                  <td className="px-3 py-2 text-teal-700">{(item.amount ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-teal-700">{item.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {receipt.status === "confirmed" && (
          <div className="mt-6 border-t border-teal-100 pt-5">
            <form action={cancelReceipt.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                ยกเลิกใบรับสินค้านี้
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-teal-500">{label}</dt>
      <dd className="mt-1 text-sm text-teal-900">{value}</dd>
    </div>
  );
}
