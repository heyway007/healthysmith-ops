import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { deleteSupplier } from "./actions";
import { DeleteButton } from "@/components/ui/delete-button";

export default async function PurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ซัพพลายเออร์</h2>
          <p className="mt-1 text-sm text-teal-700">รายชื่อคู่ค้า/ผู้ขาย</p>
        </div>
        <Link
          href="/admin/purchase/suppliers/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มซัพพลายเออร์ใหม่
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
              <th className="px-4 py-3">ชื่อบริษัท</th>
              <th className="px-4 py-3">ผู้ติดต่อ</th>
              <th className="px-4 py-3">เบอร์โทร</th>
              <th className="px-4 py-3">เครดิตเทอม</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers?.map((s) => (
              <tr key={s.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/purchase/suppliers/${s.id}`} className="text-teal-800 hover:text-orange-600">
                    {s.supplier_code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/purchase/suppliers/${s.id}`} className="hover:text-orange-600">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">{s.contact_person ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">{s.phone ?? "-"}</td>
                <td className="px-4 py-3 text-teal-700">{s.payment_term_days} วัน</td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deleteSupplier.bind(null, s.id)}
                    confirmMessage={`ลบซัพพลายเออร์ "${s.name}"?`}
                  />
                </td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีข้อมูลซัพพลายเออร์
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
