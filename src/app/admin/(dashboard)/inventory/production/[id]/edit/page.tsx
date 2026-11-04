import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { linesFromRows } from "@/components/inventory/product-lines";
import { ProductionForm } from "../../production-form";
import { productionFormData } from "../../form-data";

export default async function EditProductionOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }, formData] = await Promise.all([
    supabase.from("production_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("production_order_items").select("*").eq("production_order_id", id).order("sort_order"),
    productionFormData(supabase),
  ]);
  if (!order) notFound();
  if (order.status !== "open" && order.status !== "partial") redirect(`/admin/inventory/production/${id}`);

  // Products on the order stay pickable even if they've since been deactivated.
  const missing = (items ?? []).filter((i) => !formData.products.some((p) => p.id === i.product_id)).map((i) => i.product_id);
  const { data: extra } = missing.length
    ? await supabase.from("products").select("id, sku, name, unit, barcode").in("id", missing)
    : { data: [] };
  const products = [...formData.products, ...(extra ?? [])];

  const receivedByProduct = Object.fromEntries(
    (items ?? []).filter((i) => i.received_quantity > 0).map((i) => [i.product_id, i.received_quantity]),
  );

  return (
    <div>
      <BackLink href={`/admin/inventory/production/${id}`} label={`กลับไปใบผลิต ${order.production_number}`} />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">แก้ไขใบผลิต {order.production_number}</h2>
      <div className="mt-4">
        <ProductionForm
          id={id}
          defaults={order}
          products={products}
          producers={formData.producers}
          initialLines={linesFromRows(items ?? [])}
          receivedByProduct={receivedByProduct}
          submitLabel="บันทึกการแก้ไข"
        />
      </div>
    </div>
  );
}
