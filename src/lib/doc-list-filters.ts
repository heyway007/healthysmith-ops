// Filters shared by the tax-document lists and their Excel export, so an
// export always contains exactly what the list showed.

import { bangkokToday, monthRange, thaiDate, thaiMonth } from "@/lib/thai-money";

export type DocListParams = { month?: string; from?: string; to?: string; status?: string; q?: string };
export type DocStatus = "active" | "pending" | "cancelled" | "all";

export const DOC_STATUS_OPTIONS: { value: DocStatus; label: string }[] = [
  { value: "active", label: "ใช้งาน" },
  { value: "pending", label: "รออนุมัติยกเลิก" },
  { value: "cancelled", label: "ยกเลิกแล้ว" },
  { value: "all", label: "ทั้งหมด" },
];

const isDate = (s?: string): s is string => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

export function parseDocFilters(params: DocListParams) {
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : bangkokToday().slice(0, 7);
  const isRange = isDate(params.from) || isDate(params.to);
  const [mFrom, mTo] = monthRange(month);
  const from = isRange ? (isDate(params.from) ? params.from : "2000-01-01") : mFrom;
  const to = isRange ? (isDate(params.to) ? params.to : "2999-12-31") : mTo;
  const status: DocStatus = (["pending", "cancelled", "all"] as const).includes(params.status as never)
    ? (params.status as DocStatus)
    : "active";
  // Strip characters that would break PostgREST's or()/ilike filter syntax.
  const q = (params.q ?? "").replace(/[,()*%\\]/g, " ").trim();
  const label = isRange
    ? `${isDate(params.from) ? thaiDate(params.from) : "ตั้งแต่ต้น"} – ${isDate(params.to) ? thaiDate(params.to) : "ล่าสุด"}`
    : thaiMonth(month);
  return { month, from, to, isRange, status, q, label, rawFrom: params.from ?? "", rawTo: params.to ?? "" };
}

/** The query string for the same filters (for links, print and export). */
export function docFilterQuery(f: ReturnType<typeof parseDocFilters>, patch: Partial<DocListParams> = {}) {
  const base: DocListParams = f.isRange
    ? { from: f.rawFrom, to: f.rawTo, status: f.status === "active" ? "" : f.status, q: f.q }
    : { month: f.month, status: f.status === "active" ? "" : f.status, q: f.q };
  const next = { ...base, ...patch };
  return new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
}

