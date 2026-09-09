import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Looks up a row by exact name, creating it on the fly if it doesn't exist
 * yet -- lets a form take a plain typed name instead of a dropdown while
 * keeping the underlying FK-normalized table intact. */
export async function resolveByName(
  supabase: SupabaseClient,
  table: "departments" | "positions",
  name: string | null,
  extraOnCreate: Record<string, unknown> = {}
): Promise<string | null> {
  if (!name) return null;

  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from(table)
    .insert({ name, ...extraOnCreate })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}
