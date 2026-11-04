import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
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
  const [{ data: product }, { data: all }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("unit"),
  ]);
  if (!product) notFound();
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
    </div>
  );
}
