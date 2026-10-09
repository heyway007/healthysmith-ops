import { FIELD_LABELS, IMPORT_FORMATS, type FieldKey, type ImportFormat } from "./formats";
import type { Cell, SheetRow } from "./read-sheet";

export type ParsedItem = {
  external_sku: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
};

/** Shape expected by the import_sales_orders() RPC. */
export type ParsedOrder = {
  external_order_id: string;
  order_date: string | null;
  external_status: string | null;
  status: "pending" | "confirmed" | "shipped" | "completed" | "cancelled";
  payment_status: "unpaid" | "paid";
  buyer_username: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  shipping_address: string | null;
  billing_name: string | null;
  billing_tax_id: string | null;
  billing_branch: string | null;
  billing_address: string | null;
  discount_amount: number;
  platform_discount: number;
  shipping_fee: number;
  items: ParsedItem[];
};

export type ParseResult = {
  orders: ParsedOrder[];
  warnings: string[];
};

const MAX_ORDERS = 5000;

const headerKey = (h: Cell) =>
  String(h ?? "")
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/[\s_\-.:#()/*]+/g, "");

const text = (v: Cell | undefined): string | null => {
  if (v == null) return null;
  const s = (v instanceof Date ? v.toISOString() : String(v)).replace(/\s+/g, " ").trim();
  return s === "" || s === "-" ? null : s;
};

export function parseNumber(v: Cell | undefined): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return null;
  let s = String(v).replace(/[,\s฿]|THB/gi, "");
  const negative = /^\(.*\)$/.test(s);
  if (negative) s = s.slice(1, -1);
  if (s === "" || s === "-") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const pad = (n: number) => String(n).padStart(2, "0");

function ymd(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (y > 2400) y -= 543; // พ.ศ.
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Any date the exports use -> 'YYYY-MM-DD' (the wall-clock date shown in the file). */
export function parseDate(v: Cell | undefined, dayFirst: boolean): string | null {
  if (v == null || v === "") return null;
  // exceljs returns date cells as UTC instants holding the sheet's wall-clock time.
  if (v instanceof Date) return ymd(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  if (typeof v === "number") {
    if (v < 20000 || v > 80000) return null; // Excel serial day
    const d = new Date(Math.round((v - 25569) * 86400000));
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) return dayFirst ? ymd(+m[3], +m[2], +m[1]) : ymd(+m[3], +m[1], +m[2]);
  m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]{3})[A-Za-z]*[\s,-]+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return ymd(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = s.match(/^([A-Za-z]{3})[A-Za-z]*\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return ymd(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

/** A marketplace status (Thai or English) -> our order status. Order matters. */
export function mapStatus(raw: string | null): Pick<ParsedOrder, "status" | "payment_status"> {
  const s = (raw ?? "").toLowerCase();
  if (!s) return { status: "confirmed", payment_status: "paid" };
  if (/ยกเลิก|cancel|ไม่สำเร็จ|fail|คืนเงิน|คืนสินค้า|return|refund|lost/.test(s))
    return { status: "cancelled", payment_status: "unpaid" };
  if (/ที่ต้องชำระ|รอชำระ|รอการชำระ|ยังไม่ชำระ|unpaid|awaiting payment|pending payment/.test(s))
    return { status: "pending", payment_status: "unpaid" };
  if (/สำเร็จ|completed|delivered|ได้รับสินค้า|ส่งสำเร็จ|^confirmed$/.test(s))
    return { status: "completed", payment_status: "paid" };
  if (/ที่ต้องจัดส่ง|รอจัดส่ง|to ship|ready.to.ship|awaiting (shipment|collection)|packed|pending|processing|เตรียม/.test(s))
    return { status: "confirmed", payment_status: "paid" };
  if (/จัดส่ง|shipped|shipping|in transit|ขนส่ง|out for delivery/.test(s))
    return { status: "shipped", payment_status: "paid" };
  return { status: "confirmed", payment_status: "paid" };
}

const looksLikeOrderId = (s: string) => /^[#\w\-/.]{3,64}$/.test(s);

export function parseOrderRows(rows: SheetRow[], format: ImportFormat): ParseResult {
  const spec = IMPORT_FORMATS[format];

  // Find the header row: the first row (within the top 15) holding both the
  // order-id and product-name columns.
  const find = (header: SheetRow, aliases: string[] | undefined) => {
    if (!aliases) return -1;
    const keys = header.map(headerKey);
    for (const a of aliases) {
      const i = keys.indexOf(headerKey(a));
      if (i >= 0) return i;
    }
    return -1;
  };
  const headerIndex = rows
    .slice(0, 15)
    .findIndex((r) => find(r, spec.fields.orderId) >= 0 && find(r, spec.fields.productName) >= 0);
  if (headerIndex < 0) {
    const sample = (rows[0] ?? []).map(text).filter(Boolean).slice(0, 12).join(", ");
    throw new Error(
      `ไม่พบหัวตารางของไฟล์ ${spec.label} (ต้องมีคอลัมน์ "${spec.fields.orderId?.[0]}" และ "${spec.fields.productName?.[0]}")` +
        (sample ? ` — หัวตารางที่พบ: ${sample}` : "") +
        " — ตรวจว่าเลือกช่องทางถูกต้องหรือไม่",
    );
  }
  const header = rows[headerIndex];

  const col = Object.fromEntries(
    (Object.keys(spec.fields) as FieldKey[]).map((k) => [k, find(header, spec.fields[k])]),
  ) as Record<FieldKey, number>;
  const missing = spec.required.filter((k) => col[k] < 0);
  if (missing.length > 0) {
    throw new Error(
      `ไฟล์ ${spec.label} ไม่มีคอลัมน์: ${missing.map((k) => `${FIELD_LABELS[k]} ("${spec.fields[k]?.[0]}")`).join(", ")}`,
    );
  }
  const cols = (list: string[][] | undefined) => (list ?? []).map((aliases) => find(header, aliases)).filter((i) => i >= 0);
  const addressCols = cols(spec.addressParts);
  const billingAddressCols = cols(spec.billingAddressParts);
  const platformCols = cols(spec.platformDiscountCols);
  const platformLineCols = cols(spec.platformDiscountPerLine);

  const get = (row: SheetRow, k: FieldKey) => (col[k] >= 0 ? row[col[k]] : undefined);
  const joinCols = (row: SheetRow, list: number[]) =>
    list.map((i) => text(row[i])).filter(Boolean).join(" ") || null;
  const money = (v: Cell | undefined) => Math.abs(parseNumber(v) ?? 0);

  // Data rows grouped by order id (keeping file order). Rows whose order-id
  // cell isn't an id (e.g. TikTok's column-description row) are skipped.
  const groups = new Map<string, SheetRow[]>();
  for (const row of rows.slice(headerIndex + 1)) {
    const id = text(get(row, "orderId"));
    if (!id || !looksLikeOrderId(id)) continue;
    const list = groups.get(id);
    if (list) list.push(row);
    else groups.set(id, [row]);
  }
  if (groups.size > MAX_ORDERS) {
    throw new Error(`ไฟล์มี ${groups.size.toLocaleString()} ออเดอร์ — นำเข้าได้ครั้งละไม่เกิน ${MAX_ORDERS.toLocaleString()} ออเดอร์ กรุณาแบ่งช่วงวันที่`);
  }

  // Is "03/04/2026" day-first? Decide once for the whole file.
  let dayFirst = spec.dayFirst;
  for (const list of groups.values()) {
    const m = String(get(list[0], "orderDate") ?? "").match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (!m) continue;
    if (+m[1] > 12) { dayFirst = true; break; }
    if (+m[2] > 12) { dayFirst = false; break; }
  }

  const warnings: string[] = [];
  const orders: ParsedOrder[] = [];
  for (const [id, list] of groups) {
    const first = list[0];
    const externalStatus = text(get(first, "status"));
    const orderDate = parseDate(get(first, "orderDate"), dayFirst);
    if (col.orderDate >= 0 && !orderDate) {
      warnings.push(`ออเดอร์ ${id}: อ่านวันที่ "${text(get(first, "orderDate")) ?? ""}" ไม่ได้ — ข้ามออเดอร์นี้`);
      continue;
    }

    // Merge identical lines (Lazada exports one row per unit).
    const lines = new Map<string, ParsedItem>();
    let badPrice = false;
    let platformLines = 0;
    let shippingLines = 0;
    for (const row of list) {
      const unitPrice = parseNumber(get(row, "unitPrice"));
      if (unitPrice == null) {
        badPrice = true;
        continue;
      }
      const name = text(get(row, "productName")) ?? "-";
      const variation = text(get(row, "variation"));
      const description = variation && !name.includes(variation) ? `${name} (${variation})` : name;
      const sku = text(get(row, "sku")) ?? text(get(row, "parentSku"));
      const quantity = col.quantity >= 0 ? (parseNumber(get(row, "quantity")) ?? 1) : 1;
      const discount = money(get(row, "itemDiscount"));
      if (quantity === 0) continue;

      const paid = parseNumber(get(row, "paidPrice"));
      if (paid != null) platformLines += Math.max(0, unitPrice * quantity - discount - paid);
      for (const i of platformLineCols) platformLines += money(row[i]);
      if (!spec.orderLevelShipping) shippingLines += money(get(row, "shippingFee"));

      const key = `${sku ?? ""}|${description}|${unitPrice}`;
      const existing = lines.get(key);
      if (existing) {
        existing.quantity += quantity;
        existing.discount_amount += discount;
      } else {
        lines.set(key, { external_sku: sku, description, quantity, unit_price: unitPrice, discount_amount: discount });
      }
    }
    if (badPrice) {
      warnings.push(`ออเดอร์ ${id}: มีรายการที่ไม่มีราคา — ข้ามออเดอร์นี้`);
      continue;
    }
    if (lines.size === 0) continue;

    const billingTaxId = text(get(first, "billingTaxId"))?.replace(/\D/g, "") || null;
    const billingName = text(get(first, "billingName"));
    const billingAddress = joinCols(first, billingAddressCols);
    // Marketplaces fill billing name with the shipping name even without a
    // request; only a tax id (or our template's explicit columns) counts.
    const hasBilling = format === "generic" ? Boolean(billingName || billingTaxId || billingAddress) : Boolean(billingTaxId);

    orders.push({
      external_order_id: id,
      order_date: orderDate,
      external_status: externalStatus,
      ...mapStatus(externalStatus),
      buyer_username: text(get(first, "username")),
      buyer_name: text(get(first, "receiver")) ?? text(get(first, "username")),
      buyer_phone: text(get(first, "phone")),
      shipping_address: joinCols(first, addressCols),
      billing_name: hasBilling ? billingName : null,
      billing_tax_id: hasBilling ? billingTaxId : null,
      billing_branch: hasBilling ? text(get(first, "billingBranch")) : null,
      billing_address: hasBilling ? billingAddress : null,
      discount_amount: money(get(first, "orderDiscount")),
      platform_discount: round2(platformCols.reduce((sum, i) => sum + money(first[i]), 0) + platformLines),
      shipping_fee: round2(spec.orderLevelShipping ? money(get(first, "shippingFee")) : shippingLines),
      items: [...lines.values()].map((l) => ({ ...l, discount_amount: round2(l.discount_amount) })),
    });
  }

  if (orders.length === 0 && warnings.length === 0) warnings.push("ไม่พบออเดอร์ในไฟล์");
  return { orders, warnings };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function orderTotal(o: ParsedOrder) {
  return round2(o.items.reduce((s, i) => s + i.quantity * i.unit_price - i.discount_amount, 0) - o.discount_amount);
}
