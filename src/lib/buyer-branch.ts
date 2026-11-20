// Buyer branch on a tax invoice: a free-text field, stored and printed as typed.
// Left empty it stays empty -- nothing is ever filled in on the user's behalf.
// Common spellings are tidied up so invoices read the same way:
//   "สำนักงานใหญ่" / "00000" / "0" -> "สำนักงานใหญ่"
//   "1" / "00001" / "สาขาที่ 1"     -> "สาขา 00001"
// Anything else is kept as typed.

export const HQ_LABEL = "สำนักงานใหญ่";

/** The branch text to store, or null when nothing was entered. */
export function branchText(raw: FormDataEntryValue | string | null | undefined): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  if (/^(สำนักงานใหญ่|head\s*office|hq)$/i.test(text)) return HQ_LABEL;
  const digits = /^\d{1,5}$/.test(text) ? text : /^สาขา(?:ที่)?\s*(\d{1,5})$/.exec(text)?.[1];
  if (digits === undefined) return text;
  return Number(digits) === 0 ? HQ_LABEL : `สาขา ${digits.padStart(5, "0")}`;
}
