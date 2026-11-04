import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("unit");
  const units = [...new Set((data ?? []).map((p) => p.unit))].sort();

  return (
    <div>
      <BackLink href="/admin/inventory/products" label="กลับไปหน้ารายการสินค้า" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">เพิ่มสินค้าใหม่</h2>
      <div className="mt-4">
        <ProductForm action={createProduct} units={units} submitLabel="เพิ่มสินค้า" error={error} />
      </div>
    </div>
  );
}
