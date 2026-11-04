import type { StatusConfig } from "@/components/ui/status-badge";

export const PRODUCTION_STATUS: StatusConfig = {
  open: { label: "รอรับสินค้า", className: "bg-amber-100 text-amber-700" },
  partial: { label: "รับแล้วบางส่วน", className: "bg-cyan-100 text-cyan-700" },
  completed: { label: "รับครบแล้ว", className: "bg-emerald-100 text-emerald-700" },
  closed: { label: "ปิดใบ (รับไม่ครบ)", className: "bg-gray-200 text-gray-600" },
  cancelled: { label: "ยกเลิก", className: "bg-rose-100 text-rose-700" },
};

export const MOVEMENT_TYPES: StatusConfig = {
  in: { label: "รับเข้า", className: "bg-emerald-100 text-emerald-700" },
  out: { label: "เบิกออก", className: "bg-orange-100 text-orange-700" },
  adjust: { label: "ปรับยอด (นับสต๊อก)", className: "bg-violet-100 text-violet-700" },
  production: { label: "รับจากการผลิต", className: "bg-cyan-100 text-cyan-700" },
};

export const PRODUCT_TYPES: Record<string, string> = {
  finished_good: "สินค้าสำเร็จรูป",
  raw_material: "วัตถุดิบ / บรรจุภัณฑ์",
  service: "บริการ (ไม่นับสต๊อก)",
};

/** 1200 -> "1,200", 2.5 -> "2.5" (quantities keep up to 3 decimals). */
export function formatQty(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
}

/** "+1,200" / "-50" for ledger rows. */
export function formatSignedQty(n: number) {
  return `${n > 0 ? "+" : ""}${formatQty(n)}`;
}

/** PostgREST `or=` filter matching SKU / name / barcode. Characters that
 * have meaning in the filter syntax are dropped from the search text. */
export function productSearchFilter(q: string) {
  const s = q.replace(/[,()*%\\]/g, " ").trim();
  return s ? `sku.ilike.%${s}%,name.ilike.%${s}%,barcode.ilike.%${s}%` : null;
}

/** Printable document for a stock movement: its production receipt, or its IN/OUT/CNT document. */
export function movementPrintHref(m: { doc_number: string | null; production_receipt_id: string | null }) {
  if (m.production_receipt_id) return `/admin/print/inventory/production-receipts?id=${m.production_receipt_id}`;
  return m.doc_number ? `/admin/print/inventory/stock-documents?doc=${encodeURIComponent(m.doc_number)}` : null;
}

export function productLabel(p: { sku: string; name: string } | null | undefined) {
  return p ? `${p.sku} · ${p.name}` : "-";
}
