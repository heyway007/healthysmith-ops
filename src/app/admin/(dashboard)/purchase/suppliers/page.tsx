import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { getPaging, paginate } from "@/lib/pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { deleteSupplier } from "./actions";
import { DeleteButton } from "@/components/ui/delete-button";
import { IconLinkButton } from "@/components/ui/icon-link-button";
import { RowActions } from "@/components/ui/row-actions";

export default async function PurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; page?: string; size?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { error } = sp;
  const q = (sp.q ?? "").trim().toLowerCase();
  const paging = await getPaging(sp);
  const supabase = await createClient();
  const { data: allSuppliers } = await supabase
    .from("suppliers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  const suppliers = q
    ? (allSuppliers ?? []).filter((s) =>
        [s.supplier_code, s.name, s.contact_person, s.phone].join(" ").toLowerCase().includes(q),
      )
    : (allSuppliers ?? []);

  const paged = paginate(suppliers, paging);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ร้านค้า / ผู้ขาย</h2>
          <p className="mt-1 text-sm text-teal-700">รายชื่อคู่ค้า/ผู้ขาย</p>
        </div>
        <Link
          href="/admin/purchase/suppliers/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มร้านค้า / ผู้ขายใหม่
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form method="get" action="/admin/purchase/suppliers" className="mt-6 flex flex-wrap items-end justify-end gap-3">
        <div className="min-w-64 flex-1">
          <label className="block text-xs font-medium text-teal-700" htmlFor="q">
            ค้นหา
          </label>
          <input
            id="q"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="รหัส / ชื่อ / ผู้ติดต่อ / เบอร์โทร"
            className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <button type="submit" className={secondaryButtonClassName}>
          ค้นหา
        </button>
        {q && (
          <Link href="/admin/purchase/suppliers" className={secondaryButtonClassName}>
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[720px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อบริษัท</th>
              <th className="px-4 py-3">ผู้ติดต่อ</th>
              <th className="px-4 py-3">เบอร์โทร</th>
              <th className="px-4 py-3">เครดิตเทอม</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((s) => (
              <tr key={s.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td data-label="รหัส" className="px-4 py-3">
                  <Link href={`/admin/purchase/suppliers/${s.id}`} className="text-teal-800 hover:text-orange-600">
                    {s.supplier_code}
                  </Link>
                </td>
                <td data-label="ชื่อบริษัท" className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/purchase/suppliers/${s.id}`} className="hover:text-orange-600">
                    {s.name}
                  </Link>
                </td>
                <td data-label="ผู้ติดต่อ" className="px-4 py-3 text-teal-700">{s.contact_person ?? "-"}</td>
                <td data-label="เบอร์โทร" className="px-4 py-3 text-teal-700">{s.phone ?? "-"}</td>
                <td data-label="เครดิตเทอม" className="px-4 py-3 text-teal-700">{s.payment_term_days} วัน</td>
                <td className="px-4 py-3">
                  <RowActions>
                    <IconLinkButton href={`/admin/purchase/suppliers/${s.id}`} icon={faEye} label={`ดูรายละเอียด ${s.name}`} />
                    <IconLinkButton href={`/admin/purchase/suppliers/${s.id}`} icon={faPenToSquare} label={`แก้ไข ${s.name}`} />
                    <DeleteButton
                      action={deleteSupplier.bind(null, s.id)}
                      confirmMessage={`ลบร้านค้า / ผู้ขาย "${s.name}"?`}
                    />
                  </RowActions>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-teal-400">
                  {q ? "ไม่พบร้านค้า / ผู้ขายตามเงื่อนไขนี้" : "ยังไม่มีข้อมูลร้านค้า / ผู้ขาย"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={paged.total} page={paged.page} size={paged.size} />
    </div>
  );
}
