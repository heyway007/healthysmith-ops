import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import { updateBill } from "../actions";
import { BillForm } from "../bill-form";
import { BILL_STATUS, PAYMENT_METHODS } from "../status";

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

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("purchase_bill_items").select("*").eq("purchase_bill_id", id).order("sort_order"),
    supabase.from("ap_payments").select("*").eq("purchase_bill_id", id).order("payment_date"),
  ]);
  const outstanding = bill.outstanding_amount ?? bill.total_amount - bill.paid_amount;

  return (
    <div>
      <BackLink href="/admin/purchase/bills" label="กลับไปหน้ารายการซื้อ" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-teal-950">แก้ไขรายการซื้อ — {bill.bill_number}</h2>
        <StatusBadge status={bill.status} config={BILL_STATUS} />
      </div>

      <div className={`mt-6 ${formCardClassName}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Amount label="ยอดรวม" value={bill.total_amount} />
            <Amount label="จ่ายแล้ว" value={bill.paid_amount} className="text-emerald-700" />
            <Amount label="ค้างจ่าย" value={outstanding} className={outstanding > 0 ? "text-rose-600" : undefined} />
          </dl>
          {outstanding > 0 && bill.status !== "cancelled" && (
            <Link href={`/admin/purchase/payables?bill=${id}`} className={submitButtonClassName}>
              บันทึกจ่ายเงิน
            </Link>
          )}
        </div>

        {payments && payments.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-teal-100 pt-4 text-sm text-teal-700">
            {payments.map((p) => (
              <li key={p.id}>
                {p.payment_date} · {PAYMENT_METHODS[p.payment_method] ?? p.payment_method} ·{" "}
                <span className="font-medium text-teal-900">{p.amount.toLocaleString()}</span> บาท
                {p.reference_number && ` · อ้างอิง ${p.reference_number}`}
              </li>
            ))}
          </ul>
        )}
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

function Amount({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-teal-500">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold ${className ?? "text-teal-950"}`}>{value.toLocaleString()}</dd>
    </div>
  );
}
