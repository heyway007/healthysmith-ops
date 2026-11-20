// Types/helpers for <ProductLinesEditor>, kept out of the client module so
// server pages can build initial lines too.

export type PickableProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  barcode: string | null;
  on_hand?: number;
  /** lot-tracked: Lot is required on รับเข้า, and เบิกออก must pick a lot */
  track_lot?: boolean;
  /** อายุสินค้า: default expiry on receiving = date + this many months */
  shelf_life_months?: number | null;
};

export type ProductLine = {
  productId: string;
  quantity: string;
  lot: string;
  expiry: string;
  /** the expiry was filled in from the product's shelf life (not typed, not from an existing lot) */
  expiryAuto?: boolean;
};

export const emptyLine = (): ProductLine => ({ productId: "", quantity: "", lot: "", expiry: "" });
export const labelOf = (p: PickableProduct) => `${p.sku} · ${p.name}`;

export function linesFromRows(
  rows: { product_id: string; quantity?: number; lot_number?: string | null; expiry_date?: string | null }[],
): ProductLine[] {
  return rows.map((r) => ({
    productId: r.product_id,
    quantity: r.quantity === undefined ? "" : String(r.quantity),
    lot: r.lot_number ?? "",
    expiry: r.expiry_date ?? "",
  }));
}
