"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault } from "@/lib/forms";
import { PRODUCT_TYPES } from "../labels";

function productFields(formData: FormData) {
  const type = String(formData.get("product_type") ?? "");
  return {
    sku: String(formData.get("sku") ?? "").trim(),
    barcode: emptyToNull(formData.get("barcode")),
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim() || "ชิ้น",
    product_type: type in PRODUCT_TYPES ? type : "finished_good",
    cost_price: numberOrDefault(formData.get("cost_price"), 0),
    sale_price: numberOrDefault(formData.get("sale_price"), 0),
    min_stock: numberOrDefault(formData.get("min_stock"), 0),
    note: emptyToNull(formData.get("note")),
  };
}

function friendly(error: { code?: string; message: string }) {
  return error.code === "23505" ? "รหัสสินค้านี้มีอยู่แล้ว" : error.message;
}

function revalidateProducts() {
  revalidatePath("/admin/inventory/products");
  revalidatePath("/admin/inventory/stock");
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(productFields(formData));

  if (error) redirect(`/admin/inventory/products/new?error=${encodeURIComponent(friendly(error))}`);
  revalidateProducts();
  redirect("/admin/inventory/products");
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ ...productFields(formData), is_active: formData.get("is_active") === "1" })
    .eq("id", id);

  if (error) redirect(`/admin/inventory/products/${id}?error=${encodeURIComponent(friendly(error))}`);
  revalidateProducts();
  redirect("/admin/inventory/products");
}

/** A product that's already been used anywhere (stock, production, sales,
 * purchases) is deactivated instead, so its history stays intact. */
export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error?.code === "23503") {
    const { error: updateError } = await supabase.from("products").update({ is_active: false }).eq("id", id);
    if (updateError) redirect(`/admin/inventory/products?error=${encodeURIComponent(updateError.message)}`);
  } else if (error) {
    redirect(`/admin/inventory/products?error=${encodeURIComponent(error.message)}`);
  }
  revalidateProducts();
  redirect("/admin/inventory/products");
}
