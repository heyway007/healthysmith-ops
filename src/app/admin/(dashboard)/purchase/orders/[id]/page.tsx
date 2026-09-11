import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  dangerButtonClassName,
  formCardClassName,
  secondaryButtonClassName,
  submitButtonClassName,
} from "@/lib/ui-classes";
import {
  updateOrder,
  submitOrder,
  approveOrder,
  markOrderSent,
  closeOrder,
  cancelOrder,
} from "../actions";
import { OrderForm } from "../order-form";
import { PO_STATUS } from "../status";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: order } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
  if (!order) notFound();

  const { data: items } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("purchase_order_id", id)
    .order("sort_order");

  if (order.status === "draft") {
    return (
      <div>
        <BackLink href="/admin/purchase/orders" label="กลับไปหน้าใบสั่งซื้อ" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-teal-950">แก้ไขใบสั่งซื้อ — {order.po_number}</h2>
            <StatusBadge status={order.status} config={PO_STATUS} />
          </div>
          <form action={submitOrder.bind(null, id)}>
            <button
              type="submit"
              className="rounded-lg border border-teal-300 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              ส่งอนุมัติ
            </button>
          </form>
        </div>
        <div className="mt-6">
          <OrderForm
            action={updateOrder.bind(null, id)}
            defaultValues={order}
            defaultItems={items ?? []}
            submitLabel="บันทึกการแก้ไข"
            error={error}
          />
        </div>
      </div>
    );
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("name, supplier_code")
    .eq("id", order.supplier_id)
    .single();

  const canReceive = ["approved", "sent", "partially_received"].includes(order.status);
  const canClose = ["sent", "partially_received", "received"].includes(order.status);

  return (
    <div>
      <BackLink href="/admin/purchase/orders" label="กลับไปหน้าใบสั่งซื้อ" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-teal-950">ใบสั่งซื้อ — {order.po_number}</h2>
        <StatusBadge status={order.status} config={PO_STATUS} />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className={`mt-6 ${formCardClassName}`}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="ซัพพลายเออร์" value={supplier ? `${supplier.name} (${supplier.supplier_code})` : "-"} />
          <Info label="วันที่สั่งซื้อ" value={order.order_date} />
          <Info label="คาดว่าจะได้รับ" value={order.expected_date ?? "-"} />
          <Info label="ยอดสินค้ารวม" value={order.subtotal.toLocaleString()} />
          <Info label="ภาษีมูลค่าเพิ่ม" value={order.vat_amount.toLocaleString()} />
          <Info label="ยอดรวมสุทธิ" value={order.total_amount.toLocaleString()} />
          <Info label="หมายเหตุ" value={order.note ?? "-"} />
        </dl>

        <div className="mt-6 overflow-x-auto rounded-lg border border-teal-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-3 py-2">รายละเอียด</th>
                <th className="px-3 py-2">จำนวน</th>
                <th className="px-3 py-2">ราคา/หน่วย</th>
                <th className="px-3 py-2">ส่วนลด</th>
                <th className="px-3 py-2">ยอดรวม</th>
                <th className="px-3 py-2">รับแล้ว</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-t border-teal-100">
                  <td className="px-3 py-2 text-teal-900">{item.description ?? "-"}</td>
                  <td className="px-3 py-2 text-teal-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-teal-700">{item.unit_price.toLocaleString()}</td>
                  <td className="px-3 py-2 text-teal-700">{item.discount_amount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-teal-700">{(item.amount ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-teal-700">
                    {item.received_quantity} / {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-teal-100 pt-5">
          {order.status === "pending_approval" && (
            <>
              <form action={approveOrder.bind(null, id)}>
                <button type="submit" className={submitButtonClassName}>
                  อนุมัติ
                </button>
              </form>
              <form action={cancelOrder.bind(null, id)}>
                <button type="submit" className={dangerButtonClassName}>
                  ยกเลิก
                </button>
              </form>
            </>
          )}

          {order.status === "approved" && (
            <form action={markOrderSent.bind(null, id)}>
              <button type="submit" className={submitButtonClassName}>
                ทำเครื่องหมายว่าส่งให้ผู้ขายแล้ว
              </button>
            </form>
          )}

          {canReceive && (
            <Link
              href={`/admin/purchase/receipts/new?po=${id}`}
              className={`inline-flex items-center gap-2 ${secondaryButtonClassName}`}
            >
              รับสินค้า (สร้างใบรับสินค้า)
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </Link>
          )}

          {canClose && (
            <form action={closeOrder.bind(null, id)}>
              <button type="submit" className={secondaryButtonClassName}>
                ปิดงาน
              </button>
            </form>
          )}
        </div>
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
