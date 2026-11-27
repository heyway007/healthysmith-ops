import Link from "next/link";
import { getPaging } from "@/lib/pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { fefoSort } from "@/components/inventory/lots";
import { deleteProduct } from "./actions";
import { ProductList, type ProductRow } from "./product-list";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; size?: string }>;
}) {
  const params = await searchParams;
  const paging = await getPaging(params);
  const supabase = await createClient();

  // All products (active and not): searching/filtering happens in the browser.
  const { data: products } = await supabase.from("product_stock").select("*").order("sku");

  // soonest expiry among the lots that still have stock (lot-tracked products only)
  const trackedIds = (products ?? []).filter((p) => p.track_lot).map((p) => p.id);
  const { data: lotData } = trackedIds.length
    ? await supabase
        .from("product_lot_stock")
        .select("product_id, lot_number, expiry_date, on_hand, received_date")
        .in("product_id", trackedIds)
        .gt("on_hand", 0)
    : { data: [] };
  const expiryOf = (productId: string) => {
    const lots = fefoSort((lotData ?? []).filter((l) => l.product_id === productId));
    const next = lots.find((l) => l.expiry_date);
    return { next: next?.expiry_date ?? null, count: lots.length };
  };

  const rows: ProductRow[] = (products ?? []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    barcode: p.barcode,
    product_type: p.product_type,
    unit: p.unit,
    sale_price: p.sale_price,
    on_hand: p.on_hand,
    is_active: p.is_active,
    track_lot: p.track_lot,
    expiry: p.track_lot ? expiryOf(p.id) : null,
  }));

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

      <ProductList products={rows} today={bangkokToday()} pageSize={paging.size} deleteProduct={deleteProduct} />
    </div>
  );
}
