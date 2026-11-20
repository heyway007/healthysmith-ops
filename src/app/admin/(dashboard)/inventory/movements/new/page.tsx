import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { linesFromRows } from "@/components/inventory/product-lines";
import type { LotOption } from "@/components/inventory/lots";
import { MovementForm } from "./movement-form";

export default async function NewMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; product?: string }>;
}) {
  const params = await searchParams;
  const type = params.type === "out" ? "out" : "in";
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_stock")
    .select("id, sku, name, unit, barcode, on_hand, track_lot")
    .eq("is_active", true)
    .neq("product_type", "service")
    .order("sku");
  const products = data ?? [];
  // balance per lot of the lot-tracked products (zero-balance lots too: a lot can be received again)
  const trackedIds = products.filter((p) => p.track_lot).map((p) => p.id);
  const { data: lotRows } = trackedIds.length
    ? await supabase
        .from("product_lot_stock")
        .select("product_id, lot_number, expiry_date, on_hand, received_date")
        .in("product_id", trackedIds)
    : { data: [] as LotOption[] };
  const preset = params.product && products.some((p) => p.id === params.product)
    ? linesFromRows([{ product_id: params.product }])
    : undefined;

  return (
    <div>
      <BackLink href="/admin/inventory/movements" label="กลับไปหน้ารับเข้า / เบิกออก" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["in", "out"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/inventory/movements/new?type=${t}${params.product ? `&product=${params.product}` : ""}`}
            aria-current={type === t ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              type === t ? "bg-teal-700 text-white" : "border border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
            }`}
          >
            {t === "in" ? "รับเข้า" : "เบิกออก"}
          </Link>
        ))}
      </div>
      <div className="mt-4">
        {/* key: switching in/out starts a fresh form */}
        <MovementForm
          key={type}
          type={type}
          products={products}
          lots={lotRows ?? []}
          initialLines={preset}
          today={bangkokToday()}
        />
      </div>
    </div>
  );
}
