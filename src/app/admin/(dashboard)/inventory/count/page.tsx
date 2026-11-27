import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { FilterField, ListFilterForm } from "@/components/ui/list-filter";
import { formCardClassName, secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { postStockCount } from "../movements/actions";
import { PRODUCT_TYPES, formatQty, productSearchFilter } from "../labels";
import { expiryStatus, shortDate, UNLOTTED_LABEL, type LotOption } from "@/components/inventory/lots";
import { expandForCount } from "../count-rows";
import { CountScanner } from "./count-scanner";

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
    .select("id, sku, name, unit, barcode, on_hand, track_lot")
    .eq("is_active", true)
    .neq("product_type", "service")
    .order("sku");
  if (type) query = query.eq("product_type", type);
  const filter = productSearchFilter(q);
  if (filter) query = query.or(filter);
  const { data: products } = await query;

  // lot-tracked products are counted lot by lot
  const trackedIds = (products ?? []).filter((p) => p.track_lot).map((p) => p.id);
  const { data: lotData } = trackedIds.length
    ? await supabase
        .from("product_lot_stock")
        .select("product_id, lot_number, expiry_date, on_hand, received_date")
        .in("product_id", trackedIds)
    : { data: [] as LotOption[] };
  const rows = expandForCount(products ?? [], lotData ?? []);
  const today = bangkokToday();

  return (
    <div>
      <h2 className="text-lg font-semibold text-teal-950">นับสต๊อก</h2>
      <p className="mt-1 text-sm text-teal-700">
        กรอกจำนวนที่นับได้จริง ระบบจะปรับยอดคงเหลือให้ตรง (บันทึกเป็นรายการ &quot;ปรับยอด&quot;) · ช่องที่เว้นว่าง = ไม่ได้นับ ไม่ปรับ · สินค้าที่ติดตามเป็นล็อตนับแยกทีละล็อต
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

      <ListFilterForm
        action="/admin/inventory/count"
        q={q}
        placeholder="นับเฉพาะ: รหัส / ชื่อสินค้า / บาร์โค้ด"
        active={!!(q || type)}
        clearHref="/admin/inventory/count"
        actions={
          <Link
            href={`/admin/print/inventory/stock-count?${new URLSearchParams({ ...(q && { q }), ...(type && { type }) })}`}
            target="_blank"
            className={`flex items-center gap-2 ${secondaryButtonClassName}`}
          >
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์ใบนับสต๊อก
          </Link>
        }
      >
        <FilterField label="ประเภทสินค้า" htmlFor="type" className="min-w-44">
          <select id="type" name="type" defaultValue={type} className={selectClassName}>
            <option value="">ทุกประเภท</option>
            {Object.entries(PRODUCT_TYPES)
              .filter(([v]) => v !== "service")
              .map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
          </select>
        </FilterField>
      </ListFilterForm>

      <form action={postStockCount} className={`mt-4 ${formCardClassName}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="วันที่นับ" name="count_date" type="date" defaultValue={bangkokToday()} />
          <Field label="หมายเหตุ (เช่น นับสิ้นเดือน / ผู้นับ)" name="note" rows={3} className="sm:col-span-2" />
        </div>

        <CountScanner products={products ?? []} />

        <div className="mt-3 overflow-x-auto rounded-lg border border-teal-100 bg-white">
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-4 py-2">รหัส</th>
                <th className="px-4 py-2">ชื่อสินค้า</th>
                <th className="px-4 py-2">Lot / หมดอายุ</th>
                <th className="px-4 py-2 text-right">ในระบบ</th>
                <th className="w-40 px-4 py-2 text-right">นับได้จริง</th>
                <th className="px-4 py-2">หน่วย</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={`border-t border-teal-100 ${r.first ? "" : "border-dashed"}`}>
                  <td data-label="รหัส" className="whitespace-nowrap px-4 py-2 font-medium text-teal-800">{r.first ? r.sku : ""}</td>
                  <td data-label="ชื่อสินค้า" className="px-4 py-2 text-teal-950">{r.first ? r.name : ""}</td>
                  <td data-label="Lot / หมดอายุ" className="px-4 py-2 text-teal-700">
                    {r.tracked ? (
                      <>
                        {r.lot ?? <span className="text-teal-400">{UNLOTTED_LABEL}</span>}
                        {r.expiry && (
                          <span className="block text-xs text-teal-500">
                            หมดอายุ {shortDate(r.expiry)}{" "}
                            <span className={`rounded-full px-1.5 py-0.5 font-medium ${expiryStatus(r.expiry, today).className}`}>
                              {expiryStatus(r.expiry, today).label}
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-teal-300">-</span>
                    )}
                  </td>
                  <td data-label="ในระบบ" className="px-4 py-2 text-right text-teal-700">{formatQty(r.onHand)}</td>
                  <td data-label="นับได้จริง" className="px-4 py-1.5">
                    <input type="hidden" name="product_id" value={r.productId} />
                    <input type="hidden" name="lot_number" value={r.lot ?? ""} />
                    <input
                      name="counted"
                      data-count-product={r.productId}
                      data-count-lot={r.lot ?? undefined}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      aria-label={`นับได้จริง ${r.sku}${r.lot ? ` ล็อต ${r.lot}` : ""}`}
                      className="w-full rounded-md border border-teal-200 px-2 py-1.5 text-right text-sm focus:border-teal-600 focus:outline-none"
                    />
                  </td>
                  <td data-label="หน่วย" className="px-4 py-2 text-teal-600">{r.unit}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-teal-400">
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
