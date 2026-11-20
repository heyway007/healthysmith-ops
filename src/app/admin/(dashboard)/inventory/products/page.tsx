import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faMagnifyingGlass, faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { expiryStatus, fefoSort, shortDate } from "@/components/inventory/lots";
import { deleteProduct } from "./actions";
import { PRODUCT_TYPES, formatQty, productSearchFilter } from "../labels";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; inactive?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const showInactive = params.inactive === "1";
  const supabase = await createClient();

  let query = supabase.from("product_stock").select("*").order("sku");
  if (!showInactive) query = query.eq("is_active", true);
  const filter = productSearchFilter(q);
  if (filter) query = query.or(filter);
  const { data: products } = await query;

  // soonest expiry among the lots that still have stock (lot-tracked products only)
  const trackedIds = (products ?? []).filter((p) => p.track_lot).map((p) => p.id);
  const { data: lotData } = trackedIds.length
    ? await supabase
        .from("product_lot_stock")
        .select("product_id, lot_number, expiry_date, on_hand, received_date")
        .in("product_id", trackedIds)
        .gt("on_hand", 0)
    : { data: [] };
  const today = bangkokToday();
  const expiryOf = (productId: string) => {
    const lots = fefoSort((lotData ?? []).filter((l) => l.product_id === productId));
    const next = lots.find((l) => l.expiry_date);
    return { next: next?.expiry_date ?? null, count: lots.length };
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">สินค้า</h2>
          <p className="mt-1 text-sm text-teal-700">รหัสสินค้า หน่วยนับ ราคา และสต๊อกขั้นต่ำ — ใช้ร่วมกับใบผลิตและการนับสต๊อก</p>
        </div>
        <Link href="/admin/inventory/products/new" className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}>
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มสินค้า
        </Link>
      </div>

      {params.error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{params.error}</p>}

      <form className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-teal-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหารหัส / ชื่อ / บาร์โค้ด"
            className="w-full rounded-lg border border-teal-300 py-2 pl-8 pr-3 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-teal-700">
          <input type="checkbox" name="inactive" value="1" defaultChecked={showInactive} className="accent-teal-600" />
          แสดงสินค้าที่ปิดใช้งาน
        </label>
        <button type="submit" className={secondaryButtonClassName}>
          ค้นหา
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อสินค้า</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">หน่วย</th>
              <th className="px-4 py-3 text-right">ราคาขาย</th>
              <th className="px-4 py-3 text-right">คงเหลือ</th>
              <th className="px-4 py-3">วันหมดอายุ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id} className={`border-t border-teal-100 hover:bg-teal-50 ${p.is_active ? "" : "opacity-50"}`}>
                <td data-label="รหัส" className="whitespace-nowrap px-4 py-3">
                  <Link href={`/admin/inventory/products/${p.id}`} className="font-medium text-teal-800 hover:text-orange-600">
                    {p.sku}
                  </Link>
                </td>
                <td data-label="ชื่อสินค้า" className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/inventory/products/${p.id}`} className="hover:text-orange-600">
                    {p.name}
                  </Link>
                  {!p.is_active && <span className="ml-2 text-xs text-teal-500">(ปิดใช้งาน)</span>}
                </td>
                <td data-label="ประเภท" className="px-4 py-3 text-teal-700">{PRODUCT_TYPES[p.product_type] ?? p.product_type}</td>
                <td data-label="หน่วย" className="px-4 py-3 text-teal-700">{p.unit}</td>
                <td data-label="ราคาขาย" className="px-4 py-3 text-right text-teal-700">{p.sale_price.toLocaleString()}</td>
                <td data-label="คงเหลือ" className="px-4 py-3 text-right font-medium text-teal-950">
                  {p.product_type === "service" ? (
                    "-"
                  ) : (
                    <Link href={`/admin/inventory/stock/${p.id}`} className="hover:text-orange-600">
                      {formatQty(p.on_hand)}
                    </Link>
                  )}
                </td>
                <td data-label="วันหมดอายุ" className="px-4 py-3 text-teal-700">
                  {p.track_lot ? (
                    (() => {
                      const { next, count } = expiryOf(p.id);
                      if (count === 0) return <span className="text-teal-300">ไม่มีสต๊อก</span>;
                      if (!next) return <span className="text-teal-400">ไม่ระบุวันหมดอายุ · {count} ล็อต</span>;
                      const st = expiryStatus(next, today);
                      return (
                        <>
                          <span className="whitespace-nowrap">{shortDate(next)}</span>{" "}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                          <span className="block text-xs text-teal-500">ล็อตที่หมดอายุก่อน · มี {count} ล็อต</span>
                        </>
                      );
                    })()
                  ) : (
                    <span className="text-teal-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/inventory/stock/${p.id}`}
                      className="flex items-center gap-1.5 rounded-full border border-teal-200 px-3 py-1 text-xs font-medium text-teal-700 transition-colors hover:border-teal-400 hover:bg-teal-50"
                      title="ดูรายละเอียด: ยอดคงเหลือแยกตามล็อต วันหมดอายุ และความเคลื่อนไหว"
                    >
                      <FontAwesomeIcon icon={faEye} />
                      ดูรายละเอียด
                    </Link>
                    <Link
                      href={`/admin/inventory/products/${p.id}`}
                      className="flex items-center gap-1.5 rounded-full border border-teal-200 px-3 py-1 text-xs font-medium text-teal-700 transition-colors hover:border-teal-400 hover:bg-teal-50"
                      title="แก้ไขข้อมูลสินค้า"
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                      แก้ไข
                    </Link>
                    <DeleteButton
                      action={deleteProduct.bind(null, p.id)}
                      confirmMessage={`ลบสินค้า "${p.name}"? (ถ้ามีประวัติแล้วจะปิดใช้งานแทน)`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-teal-400">
                  {q ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้า — กด \"เพิ่มสินค้า\" เพื่อเริ่ม"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
