import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  dangerButtonClassName,
  formCardClassName,
  secondaryButtonClassName,
  submitButtonClassName,
} from "@/lib/ui-classes";
import { updateBill, submitBill, approveBill, cancelBill } from "../actions";
import { BillForm } from "../bill-form";
import { BILL_STATUS } from "../status";

export default async function BillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: bill } = await supabase.from("purchase_bills").select("*").eq("id", id).single();
  if (!bill) notFound();

  const { data: items } = await supabase
    .from("purchase_bill_items")
    .select("*")
    .eq("purchase_bill_id", id)
    .order("sort_order");

  if (bill.status === "draft") {
    return (
      <div>
        <BackLink href="/admin/purchase/bills" label="กลับไปหน้าบิลซื้อ" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-teal-950">แก้ไขบิลซื้อ — {bill.bill_number}</h2>
            <StatusBadge status={bill.status} config={BILL_STATUS} />
          </div>
          <form action={submitBill.bind(null, id)}>
            <button type="submit" className={secondaryButtonClassName}>
              ส่งอนุมัติ
            </button>
          </form>
        </div>
        <div className="mt-6">
          <BillForm
            action={updateBill.bind(null, id)}
            defaultValues={bill}
            defaultItems={items ?? []}
            submitLabel="บันทึกการแก้ไข"
            error={error}
          />
        </div>
      </div>
    );
  }

  const [{ data: supplier }, { data: order }, { data: payments }] = await Promise.all([
    supabase.from("suppliers").select("name, supplier_code").eq("id", bill.supplier_id).maybeSingle(),
    bill.purchase_order_id
      ? supabase.from("purchase_orders").select("po_number").eq("id", bill.purchase_order_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("ap_payments").select("*").eq("purchase_bill_id", id).order("payment_date"),
  ]);

  return (
    <div>
      <BackLink href="/admin/purchase/bills" label="กลับไปหน้าบิลซื้อ" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-teal-950">บิลซื้อ — {bill.bill_number}</h2>
        <StatusBadge status={bill.status} config={BILL_STATUS} />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className={`mt-6 ${formCardClassName}`}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="ซัพพลายเออร์" value={supplier ? `${supplier.name} (${supplier.supplier_code})` : "-"} />
          <Info label="อ้างอิงใบสั่งซื้อ" value={order?.po_number ?? "-"} />
          <Info label="เลขที่บิลผู้ขาย" value={bill.supplier_invoice_number ?? "-"} />
          <Info label="วันที่บิล" value={bill.bill_date} />
          <Info label="วันครบกำหนด" value={bill.due_date ?? "-"} />
          <Info label="ยอดรวมสุทธิ" value={bill.total_amount.toLocaleString()} />
          <Info label="จ่ายแล้ว" value={bill.paid_amount.toLocaleString()} />
          <Info label="ค้างชำระ" value={(bill.outstanding_amount ?? 0).toLocaleString()} />
        </dl>

        <div className="mt-6 overflow-x-auto rounded-lg border border-teal-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-3 py-2">รายละเอียด</th>
                <th className="px-3 py-2">จำนวน</th>
                <th className="px-3 py-2">ราคา/หน่วย</th>
                <th className="px-3 py-2">ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-t border-teal-100">
                  <td className="px-3 py-2 text-teal-900">{item.description ?? "-"}</td>
                  <td className="px-3 py-2 text-teal-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-teal-700">{item.unit_price.toLocaleString()}</td>
                  <td className="px-3 py-2 text-teal-700">{(item.amount ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payments && payments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">
              ประวัติการจ่ายชำระ
            </h3>
            <div className="mt-3 overflow-x-auto rounded-lg border border-teal-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                    <th className="px-3 py-2">เลขที่</th>
                    <th className="px-3 py-2">วันที่จ่าย</th>
                    <th className="px-3 py-2">วิธีจ่าย</th>
                    <th className="px-3 py-2">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-teal-100">
                      <td className="px-3 py-2 text-teal-900">{p.payment_number}</td>
                      <td className="px-3 py-2 text-teal-700">{p.payment_date}</td>
                      <td className="px-3 py-2 text-teal-700">{p.payment_method}</td>
                      <td className="px-3 py-2 text-teal-700">{p.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-teal-100 pt-5">
          {bill.status === "pending_approval" && (
            <>
              <form action={approveBill.bind(null, id)}>
                <button type="submit" className={submitButtonClassName}>
                  อนุมัติ
                </button>
              </form>
              <form action={cancelBill.bind(null, id)}>
                <button type="submit" className={dangerButtonClassName}>
                  ยกเลิก
                </button>
              </form>
            </>
          )}

          {["approved", "partially_paid"].includes(bill.status) && (bill.outstanding_amount ?? 0) > 0 && (
            <Link href={`/admin/purchase/payables?bill=${id}`} className={submitButtonClassName}>
              บันทึกจ่ายชำระ
            </Link>
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
