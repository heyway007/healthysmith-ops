import type { createClient } from "@/lib/supabase/server";

/** Products that can be put on a production order, and producer names used before. */
export async function productionFormData(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, unit, barcode")
      .eq("is_active", true)
      .neq("product_type", "service")
      .order("sku"),
    supabase.from("production_orders").select("producer_name").not("producer_name", "is", null),
  ]);
  const producers = [...new Set((orders ?? []).map((o) => o.producer_name!))].sort();
  return { products: products ?? [], producers };
}
