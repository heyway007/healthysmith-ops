import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { deleteCustomer } from "./actions";
import { DeleteButton } from "@/components/ui/delete-button";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">🛒 ระบบขาย — ลูกค้า</h1>
          <p className="mt-1 text-teal-700">
            รายชื่อลูกค้า — ใบเสนอราคา / ออเดอร์ / ใบแจ้งหนี้ ฯลฯ จะสร้างต่อไป
          </p>
        </div>
        <Link
          href="/admin/sales/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มลูกค้าใหม่
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อ</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">เบอร์โทร</th>
              <th className="px-4 py-3">เครดิต</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/sales/${c.id}`} className="text-teal-800 hover:text-orange-600">
                    {c.customer_code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/sales/${c.id}`} className="hover:text-orange-600">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">
                  {c.customer_type === "company" ? "นิติบุคคล" : "บุคคลธรรมดา"}
                </td>
                <td className="px-4 py-3 text-teal-700">{c.phone ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">
                  {c.credit_limit.toLocaleString()} / {c.credit_term_days} วัน
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deleteCustomer.bind(null, c.id)}
                    confirmMessage={`ลบลูกค้า "${c.name}"?`}
                  />
                </td>
              </tr>
            ))}
            {(!customers || customers.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีข้อมูลลูกค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
