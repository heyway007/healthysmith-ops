import { fefoSort, type LotOption } from "@/components/inventory/lots";

type CountProduct = { id: string; sku: string; name: string; unit: string; on_hand: number; track_lot: boolean };

/** One line of a stock count: a product, or one lot of a lot-tracked product. */
export type CountRow = {
  key: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  tracked: boolean;
  /** null = the product total (not tracked) or the ไม่ระบุล็อต bucket */
  lot: string | null;
  expiry: string | null;
  onHand: number;
  /** first line of its product (product columns are shown only there) */
  first: boolean;
};

/**
 * Lot-tracked products are counted lot by lot: one row per lot that has stock
 * (soonest expiry first, ไม่ระบุล็อต last), or a single ไม่ระบุล็อต row when
 * there is none. The rest keep one row with their total.
 */
export function expandForCount(products: CountProduct[], lots: LotOption[]): CountRow[] {
  return products.flatMap((p): CountRow[] => {
    if (!p.track_lot) {
      return [
        { key: p.id, productId: p.id, sku: p.sku, name: p.name, unit: p.unit, tracked: false, lot: null, expiry: null, onHand: p.on_hand, first: true },
      ];
    }
    const own = fefoSort(lots.filter((l) => l.product_id === p.id && l.on_hand !== 0));
    const rows = own.length ? own : [{ lot_number: null, expiry_date: null, on_hand: 0 }];
    return rows.map((l, i) => ({
      key: `${p.id}:${l.lot_number ?? ""}`,
      productId: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      tracked: true,
      lot: l.lot_number,
      expiry: l.expiry_date,
      onHand: l.on_hand,
      first: i === 0,
    }));
  });
}
