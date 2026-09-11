import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteBill } from "./actions";
import { BILL_STATUS } from "./status";

export default async function PurchaseBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: bills }, { data: suppliers }] = await Promise.all([
    supabase.from("purchase_bills").select("*").order("created_at", { ascending: false }),
    supabase.from("suppliers").select("id, name"),
  ]);
  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">บันทึกบิลซื้อ (Purchase Bill)</h2>
          <p className="mt-1 text-sm text-teal-700">บิล/ใบแจ้งหนี้จากซัพพลายเออร์</p>
        </div>
        <Link
          href="/admin/purchase/bills/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          บันทึกบิลซื้อ
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เลขที่บิล</th>
              <th className="px-4 py-3">เลขที่บิลผู้ขาย</th>
              <th className="px-4 py-3">ซัพพลายเออร์</th>
              <th className="px-4 py-3">วันครบกำหนด</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">ยอดรวม</th>
              <th className="px-4 py-3">ค้างชำระ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bills?.map((b) => (
              <tr key={b.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/purchase/bills/${b.id}`}
                    className="font-medium text-teal-800 hover:text-orange-600"
                  >
                    {b.bill_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">{b.supplier_invoice_number ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">{supplierNameById.get(b.supplier_id) ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">{b.due_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} config={BILL_STATUS} />
                </td>
                <td className="px-4 py-3 text-teal-700">{b.total_amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-teal-700">
                  {(b.outstanding_amount ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {b.status === "draft" && (
                    <DeleteButton
                      action={deleteBill.bind(null, b.id)}
                      confirmMessage={`ลบบิล "${b.bill_number}"?`}
                    />
                  )}
                </td>
              </tr>
            ))}
            {(!bills || bills.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีบิลซื้อ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
