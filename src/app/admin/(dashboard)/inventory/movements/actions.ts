"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

export type MovementFormState = { error: string } | null;

function parseLines(formData: FormData, key = "lines"): unknown[] | null {
  try {
    const lines = JSON.parse(String(formData.get(key) ?? "[]"));
    return Array.isArray(lines) ? lines : null;
  } catch {
    return null;
  }
}

/** รับเข้า / เบิกออก several products at once. */
export async function postMovements(_prev: MovementFormState, formData: FormData): Promise<MovementFormState> {
  const type = formData.get("type") === "out" ? "out" : "in";
  const lines = parseLines(formData);
  if (!lines || lines.length === 0) return { error: "กรุณาใส่สินค้าอย่างน้อย 1 รายการ" };

  const supabase = await createClient();
  const { data: docNumber, error } = await supabase.rpc("post_stock_movements", {
    p_type: type,
    p_date: emptyToNull(formData.get("movement_date")),
    p_ref_no: emptyToNull(formData.get("ref_no")),
    p_note: emptyToNull(formData.get("note")),
    p_lines: lines as never,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/inventory", "layout");
  redirect(`/admin/inventory/movements?type=${type}&saved=${encodeURIComponent(docNumber ?? "")}`);
}

/** นับสต๊อก: blank = not counted; every counted product is adjusted to the count. */
export async function postStockCount(formData: FormData) {
  const lines = formData
    .getAll("product_id")
    .map((id, i) => ({ product_id: String(id), counted: String(formData.getAll("counted")[i] ?? "").trim() }))
    .filter((l) => l.counted !== "")
    .map((l) => ({ product_id: l.product_id, counted: Number(l.counted) }));

  const supabase = await createClient();
  const { data, error } = lines.length
    ? await supabase.rpc("post_stock_count", {
        p_date: emptyToNull(formData.get("count_date")),
        p_note: emptyToNull(formData.get("note")),
        p_lines: lines,
      })
    : { data: null, error: { message: "ยังไม่ได้กรอกจำนวนที่นับได้" } };

  if (error) redirect(`/admin/inventory/count?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/inventory", "layout");
  redirect(`/admin/inventory/count?done=${lines.length}${data ? `&doc=${encodeURIComponent(data)}` : ""}`);
}
