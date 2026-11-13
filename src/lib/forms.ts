export function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

export function numberOrDefault(value: FormDataEntryValue | null, fallback: number): number {
  const s = String(value ?? "").trim();
  if (s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Reconstructs repeated-row form fields (each column submitted as
 * `item_<key>` once per row, in row order via <LineItemsEditor>) back into
 * an array of row objects. Rows where every column is blank are dropped.
 */
export function zipLineItems(formData: FormData, keys: string[]): Record<string, string>[] {
  const columns = keys.map((key) => formData.getAll(`item_${key}`).map(String));
  const rowCount = Math.max(0, ...columns.map((c) => c.length));

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, string> = {};
    keys.forEach((key, colIndex) => {
      row[key] = columns[colIndex][i] ?? "";
    });
    if (Object.values(row).some((v) => v.trim() !== "")) rows.push(row);
  }
  return rows;
}

/** Readable message for anything a server action catches. Supabase/PostgREST
 * errors are plain objects (not `Error`), so read their `message` too instead
 * of falling back to a generic text that hides the real cause. */
export function errorMessage(err: unknown, fallback = "เกิดข้อผิดพลาด"): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    const details = "details" in err && typeof err.details === "string" && err.details ? ` (${err.details})` : "";
    return err.message + details;
  }
  return fallback;
}
