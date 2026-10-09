import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Looks up a supplier by exact name, creating one on the fly (with an
 * auto-generated code) if it doesn't exist yet -- lets PO/Bill forms take a
 * typed supplier name instead of picking from the Supplier tab's dropdown. */
export async function resolveSupplierIdByName(
  supabase: SupabaseClient,
  name: string | null
): Promise<string | null> {
  if (!name) return null;

  const { data: existing } = await supabase
    .from("suppliers")
    .select("id, is_active")
    .eq("name", name)
    .maybeSingle();
  if (existing) {
    // buying from a hidden shop again brings it back into the list
    if (!existing.is_active) await supabase.from("suppliers").update({ is_active: true }).eq("id", existing.id);
    return existing.id;
  }

  const { count } = await supabase.from("suppliers").select("id", { count: "exact", head: true });
  const supplier_code = `SUP-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data: created, error } = await supabase
    .from("suppliers")
    .insert({ supplier_code, name })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}
