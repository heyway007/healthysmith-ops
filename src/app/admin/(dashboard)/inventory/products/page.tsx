import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { getPaging, paginate } from "@/lib/pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPenToSquare, faPlus } from "@fortawesome/free-solid-svg-icons";
import { selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { FilterField, ListFilterForm } from "@/components/ui/list-filter";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { IconLinkButton } from "@/components/ui/icon-link-button";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { expiryStatus, fefoSort, shortDate } from "@/components/inventory/lots";
import { deleteProduct } from "./actions";
import { PRODUCT_TYPES, formatQty, productSearchFilter } from "../labels";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; type?: string; inactive?: string; page?: string; size?: string }>;
}) {
  const params = await searchParams;
  const paging = await getPaging(params);
  const q = params.q?.trim() ?? "";
  const type = params.type && params.type in PRODUCT_TYPES ? params.type : "";
  const showInactive = params.inactive === "1";
  const supabase = await createClient();

  let query = supabase.from("product_stock").select("*").order("sku");
  if (!showInactive) query = query.eq("is_active", true);
  if (type) query = query.eq("product_type", type);
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

  const paged = paginate(products ?? [], paging);

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

      <ListFilterForm
        action="/admin/inventory/products"
        q={q}
        placeholder="รหัส / ชื่อสินค้า / บาร์โค้ด"
        active={!!(q || type || showInactive)}
        clearHref="/admin/inventory/products"
      >
        <FilterField label="ประเภทสินค้า" htmlFor="type" className="min-w-44">
          <select id="type" name="type" defaultValue={type} className={selectClassName}>
            <option value="">ทุกประเภท</option>
            {Object.entries(PRODUCT_TYPES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>
        <label className="flex items-center gap-2 pb-2 text-sm text-teal-700">
          <input type="checkbox" name="inactive" value="1" defaultChecked={showInactive} className="accent-teal-600" />
          แสดงสินค้าที่ปิดใช้งาน
        </label>
      </ListFilterForm>

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
            {paged.rows.map((p) => (
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
                    <IconLinkButton
                      href={`/admin/inventory/stock/${p.id}`}
                      icon={faEye}
                      label={`ดูรายละเอียด ${p.name}`}
                    />
                    <IconLinkButton href={`/admin/inventory/products/${p.id}`} icon={faPenToSquare} label={`แก้ไข ${p.name}`} />
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
                  {q || type ? "ไม่พบสินค้าตามเงื่อนไขนี้" : "ยังไม่มีสินค้า — กด \"เพิ่มสินค้า\" เพื่อเริ่ม"}
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
