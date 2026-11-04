// Types/helpers for <ProductLinesEditor>, kept out of the client module so
// server pages can build initial lines too.

export type PickableProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  barcode: string | null;
  on_hand?: number;
};

export type ProductLine = {
  productId: string;
  quantity: string;
  lot: string;
  expiry: string;
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
