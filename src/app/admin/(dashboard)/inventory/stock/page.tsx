import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faClipboardCheck, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, thaiDate } from "@/lib/thai-money";
import { PRODUCT_TYPES, formatQty, productSearchFilter } from "../labels";

const FILTERS: Record<string, string> = {
  all: "ทั้งหมด",
  low: "ต่ำกว่าขั้นต่ำ",
  out: "หมดสต๊อก",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; show?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type && params.type in PRODUCT_TYPES ? params.type : "";
  const show = params.show && params.show in FILTERS ? params.show : "all";
  const supabase = await createClient();

  let query = supabase
    .from("product_stock")
    .select("*")
    .eq("is_active", true)
    .neq("product_type", "service")
    .order("sku");
  if (type) query = query.eq("product_type", type);
  const filter = productSearchFilter(q);
  if (filter) query = query.or(filter);
  const { data } = await query;

  const all = data ?? [];
  const isLow = (p: (typeof all)[number]) => p.min_stock > 0 && p.on_hand < p.min_stock;
  const rows = all.filter((p) => (show === "low" ? isLow(p) : show === "out" ? p.on_hand <= 0 : true));
  const lowCount = all.filter(isLow).length;
  const outCount = all.filter((p) => p.on_hand <= 0).length;
  const value = all.reduce((sum, p) => sum + Math.max(p.on_hand, 0) * p.cost_price, 0);

  const filterHref = (s: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (type) sp.set("type", type);
    if (s !== "all") sp.set("show", s);
    const str = sp.toString();
    return `/admin/inventory/stock${str ? `?${str}` : ""}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">สต๊อกคงเหลือ</h2>
          <p className="mt-1 text-sm text-teal-700">ยอดคงเหลือ ณ ตอนนี้ จากทุกรายการรับเข้า / เบิกออก / รับจากการผลิต / ปรับยอด</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/inventory/movements/new?type=in" className={`flex items-center gap-2 ${submitButtonClassName}`}>
            <FontAwesomeIcon icon={faArrowDown} />
            รับเข้า
          </Link>
          <Link href="/admin/inventory/movements/new?type=out" className={`flex items-center gap-2 ${secondaryButtonClassName}`}>
            <FontAwesomeIcon icon={faArrowUp} />
            เบิกออก
          </Link>
          <Link href="/admin/inventory/count" className={`flex items-center gap-2 ${secondaryButtonClassName}`}>
            <FontAwesomeIcon icon={faClipboardCheck} />
            นับสต๊อก
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="สินค้าที่นับสต๊อก" value={`${all.length} รายการ`} />
        <Stat label="ต่ำกว่าขั้นต่ำ" value={`${lowCount} รายการ`} className={lowCount ? "text-amber-600" : undefined} />
        <Stat label="หมดสต๊อก" value={`${outCount} รายการ`} className={outCount ? "text-rose-600" : undefined} />
        <Stat label="มูลค่าคงคลัง (ราคาทุน)" value={`฿${formatMoney(value)}`} />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="relative">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-teal-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหารหัส / ชื่อ / บาร์โค้ด"
            className="w-72 max-w-full rounded-lg border border-teal-300 py-2 pl-8 pr-3 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>
        <select name="type" defaultValue={type} aria-label="ประเภทสินค้า" className={`${selectClassName} mt-0 w-auto`}>
          <option value="">ทุกประเภท</option>
          {Object.entries(PRODUCT_TYPES)
            .filter(([v]) => v !== "service")
            .map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
        </select>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อสินค้า</th>
              <th className="px-4 py-3 text-right">คงเหลือ</th>
              <th className="px-4 py-3">หน่วย</th>
              <th className="px-4 py-3 text-right">ขั้นต่ำ</th>
              <th className="px-4 py-3 text-right">กำลังผลิต</th>
              <th className="px-4 py-3">เคลื่อนไหวล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link href={`/admin/inventory/stock/${p.id}`} className="font-medium text-teal-800 hover:text-orange-600">
                    {p.sku}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/inventory/stock/${p.id}`} className="hover:text-orange-600">
                    {p.name}
                  </Link>
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    p.on_hand <= 0 ? "text-rose-600" : isLow(p) ? "text-amber-600" : "text-teal-950"
                  }`}
                >
                  {formatQty(p.on_hand)}
                </td>
                <td className="px-4 py-3 text-teal-700">{p.unit}</td>
                <td className="px-4 py-3 text-right text-teal-600">{p.min_stock > 0 ? formatQty(p.min_stock) : "-"}</td>
                <td className="px-4 py-3 text-right text-cyan-700">{p.in_production > 0 ? formatQty(p.in_production) : "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-teal-600">
                  {thaiDate(p.last_movement_date, true)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  {all.length === 0 ? (
                    <>
                      ยังไม่มีสินค้า —{" "}
                      <Link href="/admin/inventory/products/new" className="text-orange-600 hover:underline">
                        เพิ่มสินค้า
                      </Link>
                    </>
                  ) : (
                    "ไม่มีสินค้าตามเงื่อนไขนี้"
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
