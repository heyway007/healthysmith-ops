import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faMagnifyingGlass, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { IconLinkButton } from "@/components/ui/icon-link-button";
import { RowActions } from "@/components/ui/row-actions";
import { secondaryButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { NEAR_EXPIRY_DAYS, UNLOTTED_LABEL, expiryStatus, fefoSort, shortDate } from "@/components/inventory/lots";
import { formatQty, productSearchFilter } from "../labels";

const FILTERS: Record<string, string> = {
  all: "ทั้งหมด",
  near: `ใกล้หมดอายุ (≤ ${NEAR_EXPIRY_DAYS} วัน)`,
  expired: "หมดอายุแล้ว",
};

/** Balance of every lot of the lot-tracked products, soonest expiry first. */
export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; show?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const show = params.show && params.show in FILTERS ? params.show : "all";
  const today = bangkokToday();
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id, sku, name, unit")
    .eq("is_active", true)
    .eq("track_lot", true)
    .order("sku");
  const filter = productSearchFilter(q);
  if (filter) query = query.or(filter);
  const { data: products } = await query;

  const ids = (products ?? []).map((p) => p.id);
  const { data: lotData } = ids.length
    ? await supabase
        .from("product_lot_stock")
        .select("product_id, lot_number, expiry_date, on_hand, received_date")
        .in("product_id", ids)
        .neq("on_hand", 0)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const all = fefoSort(lotData ?? []).filter((l) => productById.has(l.product_id));
  const status = (l: (typeof all)[number]) => expiryStatus(l.expiry_date, today);
  const nearCount = all.filter((l) => status(l).key === "near").length;
  const expiredCount = all.filter((l) => status(l).key === "expired").length;
  const rows = all.filter((l) => (show === "all" ? true : status(l).key === show));
  // a product's lots stay together: sort by expiry across products, as FEFO does for one product
  const filterHref = (s: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (s !== "all") sp.set("show", s);
    const str = sp.toString();
    return `/admin/inventory/lots${str ? `?${str}` : ""}`;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-teal-950">ล็อต / วันหมดอายุ</h2>
      <p className="mt-1 text-sm text-teal-700">
        ยอดคงเหลือแยกตามล็อตของสินค้าที่ติดตามเป็นล็อต เรียงตามวันหมดอายุ (เบิกล็อตบนสุดก่อน) · ตั้งสินค้าให้ติดตามเป็นล็อตได้ที่หน้า &quot;สินค้า&quot;
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ล็อตที่มีของ" value={`${all.length} ล็อต`} />
        <Stat label="ใกล้หมดอายุ" value={`${nearCount} ล็อต`} className={nearCount ? "text-amber-600" : undefined} />
        <Stat label="หมดอายุแล้ว (ยังมีของ)" value={`${expiredCount} ล็อต`} className={expiredCount ? "text-rose-600" : undefined} />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-72">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-teal-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหารหัส / ชื่อสินค้า"
            className="w-full rounded-lg border border-teal-300 py-2 pl-8 pr-3 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        {show !== "all" && <input type="hidden" name="show" value={show} />}
        <button type="submit" className={secondaryButtonClassName}>
          ค้นหา
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-1">
        {Object.entries(FILTERS).map(([key, label]) => (
          <Link
            key={key}
            href={filterHref(key)}
            aria-current={show === key ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              show === key ? "bg-teal-700 text-white" : "bg-white text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[760px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">สินค้า</th>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3">วันหมดอายุ</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">รับเข้าเมื่อ</th>
              <th className="px-4 py-3 text-right">คงเหลือ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const p = productById.get(l.product_id)!;
              const st = status(l);
              return (
                <tr key={`${l.product_id}:${l.lot_number ?? ""}`} className="border-t border-teal-100 hover:bg-teal-50">
                  <td data-label="สินค้า" className="px-4 py-3">
                    <Link href={`/admin/inventory/stock/${p.id}`} className="text-teal-900 hover:text-orange-600">
                      <span className="font-medium">{p.sku}</span> {p.name}
                    </Link>
                  </td>
                  <td data-label="Lot" className="px-4 py-3 font-medium text-teal-800">
                    {l.lot_number ?? <span className="font-normal text-teal-400">{UNLOTTED_LABEL}</span>}
                  </td>
                  <td data-label="วันหมดอายุ" className="whitespace-nowrap px-4 py-3 text-teal-700">
                    {l.expiry_date ? shortDate(l.expiry_date) : "-"}
                  </td>
                  <td data-label="สถานะ" className="px-4 py-3">
                    {l.expiry_date ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                    ) : (
                      <span className="text-teal-300">-</span>
                    )}
                  </td>
                  <td data-label="รับเข้าเมื่อ" className="whitespace-nowrap px-4 py-3 text-teal-600">
                    {l.received_date ? shortDate(l.received_date) : "-"}
                  </td>
                  <td data-label="คงเหลือ" className={`px-4 py-3 text-right font-semibold ${l.on_hand < 0 ? "text-rose-600" : "text-teal-950"}`}>
                    {formatQty(l.on_hand)} <span className="text-xs font-normal text-teal-500">{p.unit}</span>
                  </td>
                  <td data-label="จัดการ" className="px-4 py-3">
                    <RowActions>
                      <IconLinkButton href={`/admin/inventory/stock/${p.id}`} icon={faEye} label={`ดูการ์ดสต๊อก ${p.name}`} />
                      <IconLinkButton href={`/admin/inventory/products/${p.id}`} icon={faPenToSquare} label={`แก้ไข ${p.name}`} />
                    </RowActions>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  {ids.length === 0 ? (
                    <>
                      ยังไม่มีสินค้าที่ติดตามเป็นล็อต —{" "}
                      <Link href="/admin/inventory/products" className="text-orange-600 hover:underline">
                        ตั้งค่าที่หน้าสินค้า
                      </Link>
                    </>
                  ) : (
                    "ไม่มีล็อตตามเงื่อนไขนี้"
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white px-4 py-2 shadow-sm">
      <p className="text-xs font-medium text-teal-500">{label}</p>
      <p className={`text-lg font-semibold ${className ?? "text-teal-950"}`}>{value}</p>
    </div>
  );
}
