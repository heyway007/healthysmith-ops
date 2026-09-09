import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { formCardClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { recordPayment } from "./actions";

const PAYMENT_METHODS: Record<string, string> = {
  cash: "เงินสด",
  bank_transfer: "โอนเงิน",
  cheque: "เช็ค",
  other: "อื่นๆ",
};

function agingLabel(dueDate: string | null): { label: string; className: string } {
  if (!dueDate) return { label: "-", className: "text-teal-500" };
  const days = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000);
  if (days > 0) return { label: `เกินกำหนด ${days} วัน`, className: "text-rose-600 font-medium" };
  if (days === 0) return { label: "ครบกำหนดวันนี้", className: "text-amber-600 font-medium" };
  return { label: `เหลืออีก ${-days} วัน`, className: "text-teal-600" };
}

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; bill?: string }>;
}) {
  const { error, bill: billId } = await searchParams;
  const supabase = await createClient();

  const [{ data: bills }, { data: suppliers }] = await Promise.all([
    supabase
      .from("purchase_bills")
      .select("*")
      .in("status", ["approved", "partially_paid"])
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("suppliers").select("id, name"),
  ]);
  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const outstandingBills = (bills ?? []).filter((b) => (b.outstanding_amount ?? 0) > 0);

  const totalOutstanding = outstandingBills.reduce((sum, b) => sum + (b.outstanding_amount ?? 0), 0);

  let payingBill: (typeof outstandingBills)[number] | null = null;
  if (billId) {
    payingBill = outstandingBills.find((b) => b.id === billId) ?? null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ติดตามยอดค้างจ่าย</h2>
          <p className="mt-1 text-sm text-teal-700">บิลซื้อที่ยังค้างชำระทั้งหมด</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-500">ยอดค้างจ่ายรวม</p>
          <p className="mt-1 text-xl font-semibold text-rose-600">{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      {payingBill && (
        <div className={`mt-6 max-w-lg ${formCardClassName}`}>
          <h3 className="text-sm font-semibold text-teal-900">
            บันทึกจ่ายชำระ — {payingBill.bill_number}
          </h3>
          <p className="mt-1 text-sm text-teal-600">
            ยอดค้างชำระ: {(payingBill.outstanding_amount ?? 0).toLocaleString()} บาท
          </p>
          <form action={recordPayment.bind(null, payingBill.id)} className="mt-4 space-y-4">
            <Field
              label="วันที่จ่าย"
              name="payment_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <div>
              <label className="block text-sm font-medium text-teal-800">วิธีจ่าย</label>
              <select name="payment_method" defaultValue="bank_transfer" className={selectClassName}>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="จำนวนเงิน"
              name="amount"
              type="number"
              step="0.01"
              defaultValue={payingBill.outstanding_amount}
            />
            <Field label="เลขที่อ้างอิง" name="reference_number" />
            <Field label="หมายเหตุ" name="note" />
            <div className="flex items-center gap-4">
              <button type="submit" className={submitButtonClassName}>
                บันทึกจ่ายชำระ
              </button>
              <Link href="/purchase/payables" className="text-sm text-teal-700 hover:text-teal-900">
                ยกเลิก
              </Link>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เลขที่บิล</th>
              <th className="px-4 py-3">ซัพพลายเออร์</th>
              <th className="px-4 py-3">ครบกำหนด</th>
              <th className="px-4 py-3">อายุหนี้</th>
              <th className="px-4 py-3">ยอดรวม</th>
              <th className="px-4 py-3">ค้างชำระ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {outstandingBills.map((b) => {
              const aging = agingLabel(b.due_date);
              return (
                <tr key={b.id} className="border-t border-teal-100 hover:bg-teal-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/purchase/bills/${b.id}`}
                      className="font-medium text-teal-800 hover:text-orange-600"
                    >
                      {b.bill_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-teal-700">{supplierNameById.get(b.supplier_id) ?? "-"}</td>
                  <td className="px-4 py-3 text-teal-700">{b.due_date ?? "-"}</td>
                  <td className={`px-4 py-3 ${aging.className}`}>{aging.label}</td>
                  <td className="px-4 py-3 text-teal-700">{b.total_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-rose-600">
                    {(b.outstanding_amount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/purchase/payables?bill=${b.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-orange-600"
                    >
                      บันทึกจ่าย
                    </Link>
                  </td>
                </tr>
              );
            })}
            {outstandingBills.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  ไม่มียอดค้างจ่าย
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
