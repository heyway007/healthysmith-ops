import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPrint } from "@fortawesome/free-solid-svg-icons";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { postStockCount } from "../movements/actions";
import { PRODUCT_TYPES, formatQty, productSearchFilter } from "../labels";

export default async function StockCountPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; error?: string; done?: string; doc?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type && params.type in PRODUCT_TYPES ? params.type : "";
  const supabase = await createClient();

  let query = supabase
    .from("product_stock")
    .select("id, sku, name, unit, on_hand")
    .eq("is_active", true)
    .neq("product_type", "service")
    .order("sku");
  if (type) query = query.eq("product_type", type);
  const filter = productSearchFilter(q);
  if (filter) query = query.or(filter);
  const { data: products } = await query;

  return (
    <div>
      <h2 className="text-lg font-semibold text-teal-950">นับสต๊อก</h2>
      <p className="mt-1 text-sm text-teal-700">
        กรอกจำนวนที่นับได้จริง ระบบจะปรับยอดคงเหลือให้ตรง (บันทึกเป็นรายการ &quot;ปรับยอด&quot;) · ช่องที่เว้นว่าง = ไม่ได้นับ ไม่ปรับ
      </p>

      {params.error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{params.error}</p>}
      {params.done && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          บันทึกการนับ {params.done} รายการแล้ว —{" "}
          {params.doc ? (
            <>
              ยอดที่ไม่ตรงถูกปรับในเอกสาร {params.doc} ·{" "}
              <Link
                href={`/admin/print/inventory/stock-documents?doc=${encodeURIComponent(params.doc)}`}
                target="_blank"
                className="underline"
              >
                พิมพ์ใบปรับยอด
              </Link>
            </>
          ) : (
            "ทุกรายการตรงกับระบบ ไม่ต้องปรับยอด"
          )}
        </p>
      )}

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-72">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-teal-400"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="นับเฉพาะ: รหัส / ชื่อ / บาร์โค้ด"
            className="w-full rounded-lg border border-teal-300 py-2 pl-8 pr-3 text-sm focus:border-teal-600 focus:outline-none"
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
        <button type="submit" className={secondaryButtonClassName}>
          กรอง
        </button>
        <Link
          href={`/admin/print/inventory/stock-count?${new URLSearchParams({ ...(q && { q }), ...(type && { type }) })}`}
          target="_blank"
          className={`ml-auto flex items-center gap-2 ${secondaryButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPrint} />
          พิมพ์ใบนับสต๊อก
        </Link>
      </form>

      <form action={postStockCount} className={`mt-4 ${formCardClassName}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="วันที่นับ" name="count_date" type="date" defaultValue={bangkokToday()} />
          <Field label="หมายเหตุ (เช่น นับสิ้นเดือน / ผู้นับ)" name="note" rows={3} className="sm:col-span-2" />
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-teal-100 bg-white">
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-4 py-2">รหัส</th>
                <th className="px-4 py-2">ชื่อสินค้า</th>
                <th className="px-4 py-2 text-right">ในระบบ</th>
                <th className="w-40 px-4 py-2 text-right">นับได้จริง</th>
                <th className="px-4 py-2">หน่วย</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((p) => (
                <tr key={p.id} className="border-t border-teal-100">
                  <td data-label="รหัส" className="whitespace-nowrap px-4 py-2 font-medium text-teal-800">{p.sku}</td>
                  <td data-label="ชื่อสินค้า" className="px-4 py-2 text-teal-950">{p.name}</td>
                  <td data-label="ในระบบ" className="px-4 py-2 text-right text-teal-700">{formatQty(p.on_hand)}</td>
                  <td data-label="นับได้จริง" className="px-4 py-1.5">
                    <input type="hidden" name="product_id" value={p.id} />
                    <input
                      name="counted"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      aria-label={`นับได้จริง ${p.sku}`}
                      className="w-full rounded-md border border-teal-200 px-2 py-1.5 text-right text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </td>
                  <td data-label="หน่วย" className="px-4 py-2 text-teal-600">{p.unit}</td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-teal-400">
                    ไม่มีสินค้าให้นับ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 border-t border-teal-100 pt-5">
          <SubmitButton className={submitButtonClassName}>บันทึกผลการนับ</SubmitButton>
        </div>
      </form>
    </div>
  );
}
