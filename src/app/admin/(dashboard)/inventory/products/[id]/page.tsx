import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { UNLOTTED_LABEL, expiryStatus, fefoSort, shortDate } from "@/components/inventory/lots";
import { formatQty } from "../../labels";
import { updateProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const [{ data: product }, { data: all }, { data: lotData }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("unit"),
    supabase
      .from("product_lot_stock")
      .select("product_id, lot_number, expiry_date, on_hand, received_date")
      .eq("product_id", id)
      .neq("on_hand", 0),
  ]);
  if (!product) notFound();
  const lots = fefoSort(lotData ?? []);
  const today = bangkokToday();
  const units = [...new Set((all ?? []).map((p) => p.unit))].sort();

  return (
    <div>
      <BackLink href="/admin/inventory/products" label="กลับไปหน้ารายการสินค้า" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-teal-950">
          แก้ไขสินค้า — {product.sku} {product.name}
        </h2>
        <Link href={`/admin/inventory/stock/${id}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
          ดูความเคลื่อนไหวสต๊อก →
        </Link>
      </div>
      <div className="mt-4">
        <ProductForm
          action={updateProduct.bind(null, id)}
          defaultValues={product}
          units={units}
          submitLabel="บันทึกการแก้ไข"
          error={error}
        />
      </div>

      {(product.track_lot || lots.some((l) => l.lot_number)) && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-teal-950">ล็อตและวันหมดอายุที่มีอยู่</h3>
          <p className="mt-1 text-xs text-teal-600">
            วันหมดอายุจริงเก็บเป็นรายล็อต — ใส่ตอนรับเข้า / รับจากการผลิต (ช่อง &quot;อายุสินค้า&quot; ด้านบนใช้เติมค่าให้อัตโนมัติ)
          </p>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
            <table className="stack-table w-full text-sm md:min-w-[560px]">
              <thead>
                <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
                  <th className="px-4 py-2.5">Lot</th>
                  <th className="px-4 py-2.5">วันหมดอายุ</th>
                  <th className="px-4 py-2.5">สถานะ</th>
                  <th className="px-4 py-2.5 text-right">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => {
                  const st = expiryStatus(l.expiry_date, today);
                  return (
                    <tr key={l.lot_number ?? ""} className="border-t border-teal-100">
                      <td data-label="Lot" className="px-4 py-2.5 font-medium text-teal-800">
                        {l.lot_number ?? <span className="font-normal text-teal-400">{UNLOTTED_LABEL}</span>}
                      </td>
                      <td data-label="วันหมดอายุ" className="whitespace-nowrap px-4 py-2.5 text-teal-700">
                        {l.expiry_date ? shortDate(l.expiry_date) : "-"}
                      </td>
                      <td data-label="สถานะ" className="px-4 py-2.5">
                        {l.expiry_date ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                        ) : (
                          <span className="text-teal-300">-</span>
                        )}
                      </td>
                      <td data-label="คงเหลือ" className="px-4 py-2.5 text-right font-semibold text-teal-950">
                        {formatQty(l.on_hand)} <span className="text-xs font-normal text-teal-500">{product.unit}</span>
                      </td>
                    </tr>
                  );
                })}
                {lots.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-teal-400">
                      ยังไม่มีสต๊อกในล็อตใด — รับเข้าพร้อมเลข Lot และวันหมดอายุได้ที่หน้า &quot;รับเข้า / เบิกออก&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
