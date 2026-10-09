import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoice } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import { formatMoney, splitVat, thaiDate } from "@/lib/thai-money";
import { ChannelBadge, ORDER_STATUS } from "../../status";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }, { data: links }] = await Promise.all([
    supabase.from("sales_order_list").select("*").eq("id", id).maybeSingle(),
    supabase.from("sales_order_items").select("*").eq("sales_order_id", id).order("sort_order"),
    supabase.from("tax_invoice_orders").select("tax_invoice_id").eq("sales_order_id", id),
  ]);
  if (!order) notFound();

  const invoiceIds = (links ?? []).map((l) => l.tax_invoice_id);
  const { data: invoices } = invoiceIds.length
    ? await supabase
        .from("tax_invoices")
        .select("id, tax_invoice_number, issue_date, total_amount, is_cancelled, cancel_reason")
        .in("id", invoiceIds)
        .order("created_at")
    : { data: [] };

  const { net, vat } = splitVat(order.total_amount);
  const canIssue = order.status !== "cancelled" && !order.tax_invoice_id;
  const requested = Boolean(order.billing_name || order.billing_tax_id);

  return (
    <div>
      <BackLink href={`/admin/sales/orders?month=${order.order_date.slice(0, 7)}`} label="กลับไปหน้ารายการออเดอร์" />
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-center gap-3 text-lg font-semibold text-teal-950">
            <span className="font-mono">{order.external_order_id ?? order.order_number}</span>
            <ChannelBadge code={order.channel_code} name={order.channel_name} />
            <StatusBadge status={order.status} config={ORDER_STATUS} />
          </h2>
          <p className="mt-1 text-sm text-teal-700">
            {thaiDate(order.order_date)} · เลขที่ภายใน {order.order_number}
            {order.external_status && ` · สถานะบนแพลตฟอร์ม: ${order.external_status}`}
          </p>
        </div>
        {canIssue && (
          <Link
            href={`/admin/sales/tax-invoices/new?orders=${order.id}`}
            className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
          >
            <FontAwesomeIcon icon={faFileInvoice} />
            ออกใบกำกับภาษี
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={formCardClassName}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ผู้ซื้อ / ที่อยู่จัดส่ง</h3>
          <dl className="mt-3 space-y-1 text-sm">
            <Row label="ชื่อ" value={order.buyer_name} />
            <Row label="ชื่อผู้ใช้" value={order.buyer_username} />
            <Row label="เบอร์โทร" value={order.buyer_phone} />
            <Row label="ที่อยู่" value={order.shipping_address} />
          </dl>
        </div>
        <div className={formCardClassName}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ข้อมูลขอใบกำกับภาษี</h3>
          {requested ? (
            <dl className="mt-3 space-y-1 text-sm">
              <Row label="ชื่อ" value={order.billing_name} />
              <Row label="เลขผู้เสียภาษี" value={order.billing_tax_id} />
              <Row label="สาขา" value={order.billing_branch} />
              <Row label="ที่อยู่" value={order.billing_address} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-teal-500">
              ลูกค้าไม่ได้ขอ — ถ้าออกใบกำกับ จะใช้ชื่อและที่อยู่จัดส่ง (แก้ไขได้ตอนออก)
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">สินค้า</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">จำนวน</th>
              <th className="px-4 py-3 text-right">ราคา/หน่วย</th>
              <th className="px-4 py-3 text-right">ส่วนลดร้าน</th>
              <th className="px-4 py-3 text-right">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((i) => (
              <tr key={i.id} className="border-t border-teal-100">
                <td className="px-4 py-3 text-teal-900">{i.description}</td>
                <td className="px-4 py-3 font-mono text-xs text-teal-600">
                  {i.external_sku ?? "-"}
                  {i.external_sku && !i.product_id && (
                    <span className="ml-1 font-sans text-[10px] text-orange-500" title="ยังไม่มีสินค้า SKU นี้ในระบบ — ใบกำกับจะใช้ชื่อจากแพลตฟอร์ม">
                      (ไม่พบในระบบ)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-teal-900">{i.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-teal-700">{formatMoney(i.unit_price)}</td>
                <td className="px-4 py-3 text-right text-teal-700">{i.discount_amount ? formatMoney(i.discount_amount) : "-"}</td>
                <td className="px-4 py-3 text-right font-medium text-teal-900">{formatMoney(i.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-teal-200 text-sm">
            <Total label="รวม" value={order.subtotal} />
            {order.discount_amount > 0 && <Total label="โค้ดส่วนลดจากร้าน" value={-order.discount_amount} />}
            <Total label="ยอดขาย (รวม VAT)" value={order.total_amount} strong />
            <Total label="มูลค่าก่อน VAT" value={net} muted />
            <Total label="VAT 7%" value={vat} muted />
            {order.platform_discount > 0 && (
              <Total label="ส่วนลดที่แพลตฟอร์มออกให้ (ไม่หักในใบกำกับ)" value={order.platform_discount} muted />
            )}
            {order.shipping_fee > 0 && (
              <Total
                label={order.is_marketplace ? "ค่าส่งที่ผู้ซื้อจ่ายแพลตฟอร์ม (ไม่อยู่ในใบกำกับ)" : "ค่าส่ง (รวมในใบกำกับ)"}
                value={order.shipping_fee}
                muted
              />
            )}
          </tfoot>
        </table>
      </div>

      {(invoices ?? []).length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">ใบกำกับภาษีของออเดอร์นี้</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {invoices?.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/sales/tax-invoices/${t.id}`}
                  className={`font-mono font-medium hover:text-orange-600 ${t.is_cancelled ? "text-gray-400 line-through" : "text-emerald-700"}`}
                >
                  {t.tax_invoice_number}
                </Link>{" "}
                <span className="text-teal-600">
                  {thaiDate(t.issue_date, true)} · ฿{formatMoney(t.total_amount)}
                  {t.is_cancelled && ` · ยกเลิกแล้ว (${t.cancel_reason ?? "-"})`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-teal-500">{label}</dt>
      <dd className="text-teal-900">{value ?? "-"}</dd>
    </div>
  );
}

function Total({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }) {
  return (
    <tr>
      <td colSpan={5} className={`px-4 py-1.5 text-right ${muted ? "text-teal-500" : "text-teal-700"}`}>
        {label}
      </td>
      <td className={`px-4 py-1.5 text-right ${strong ? "font-semibold text-teal-950" : muted ? "text-teal-500" : "text-teal-900"}`}>
        {formatMoney(value)}
      </td>
    </tr>
  );
}
