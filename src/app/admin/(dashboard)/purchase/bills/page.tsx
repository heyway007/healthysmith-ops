import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { bangkokToday, formatThaiDate } from "@/components/holidays/holiday-views";
import { deleteBill } from "./actions";
import { BILL_STATUS } from "./status";

const MONTH_RE = /^\d{4}-\d{2}$/;

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function PurchaseBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month && MONTH_RE.test(params.month) ? params.month : bangkokToday().slice(0, 7);
  const supabase = await createClient();

  const [{ data: bills }, { data: suppliers }] = await Promise.all([
    supabase
      .from("purchase_bills")
      .select("*")
      .neq("status", "cancelled")
      .gte("bill_date", `${month}-01`)
      .lt("bill_date", `${shiftMonth(month, 1)}-01`)
      .order("bill_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("suppliers").select("id, name"),
  ]);
  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  const billIds = (bills ?? []).map((b) => b.id);
  const { data: items } = billIds.length
    ? await supabase
        .from("purchase_bill_items")
        .select("purchase_bill_id, description, sort_order")
        .in("purchase_bill_id", billIds)
        .order("sort_order")
    : { data: [] };
  const itemsByBill = new Map<string, string[]>();
  for (const item of items ?? []) {
    const list = itemsByBill.get(item.purchase_bill_id) ?? [];
    if (item.description) list.push(item.description);
    itemsByBill.set(item.purchase_bill_id, list);
  }

  const total = (bills ?? []).reduce((sum, b) => sum + b.total_amount, 0);
  const unpaid = (bills ?? []).reduce((sum, b) => sum + (b.outstanding_amount ?? 0), 0);
  const monthLabel = formatThaiDate(`${month}-01`, { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">รายการซื้อ</h2>
          <p className="mt-1 text-sm text-teal-700">ของที่ซื้อเข้าบริษัท ทั้งจ่ายแล้วและยังค้างจ่าย</p>
        </div>
        <Link
          href="/admin/purchase/bills/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          จดรายการซื้อ
        </Link>
      </div>

      {params.error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{params.error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/purchase/bills?month=${shiftMonth(month, -1)}`}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนก่อน"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
          </Link>
          <span className="min-w-36 text-center font-medium text-teal-900">{monthLabel}</span>
          <Link
            href={`/admin/purchase/bills?month=${shiftMonth(month, 1)}`}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนถัดไป"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3" />
          </Link>
        </div>
        <div className="flex gap-3">
          <Stat label="ซื้อทั้งเดือน" value={total} />
          <Stat label="ยังค้างจ่าย" value={unpaid} className={unpaid > 0 ? "text-rose-600" : undefined} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">ร้าน / ผู้ขาย</th>
              <th className="px-4 py-3">รายการ</th>
              <th className="px-4 py-3 text-right">ยอดรวม</th>
              <th className="px-4 py-3">จ่ายเงิน</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bills?.map((b) => {
              const descriptions = itemsByBill.get(b.id) ?? [];
              return (
                <tr key={b.id} className="border-t border-teal-100 hover:bg-teal-50">
                  <td className="whitespace-nowrap px-4 py-3 text-teal-700">
                    {formatThaiDate(b.bill_date, { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-teal-900">{supplierNameById.get(b.supplier_id) ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/purchase/bills/${b.id}`}
                      className="font-medium text-teal-800 hover:text-orange-600"
                    >
                      {descriptions[0] ?? b.bill_number}
                    </Link>
                    {descriptions.length > 1 && (
                      <span className="text-teal-500"> และอีก {descriptions.length - 1} รายการ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-teal-900">
                    {b.total_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} config={BILL_STATUS} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton
                      action={deleteBill.bind(null, b.id)}
                      confirmMessage={`ลบรายการซื้อ "${descriptions[0] ?? b.bill_number}"?`}
                    />
                  </td>
                </tr>
              );
            })}
            {(!bills || bills.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-teal-400">
                  เดือนนี้ยังไม่มีรายการซื้อ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white px-4 py-2 shadow-sm">
      <p className="text-xs font-medium text-teal-500">{label}</p>
      <p className={`text-lg font-semibold ${className ?? "text-teal-950"}`}>{value.toLocaleString()}</p>
    </div>
  );
}
