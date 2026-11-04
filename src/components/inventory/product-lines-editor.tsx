"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { emptyLine, labelOf, type PickableProduct, type ProductLine } from "./product-lines";

export type { PickableProduct, ProductLine };

const cellClassName =
  "w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none";

const isBlank = (l: ProductLine) => !l.productId && !l.quantity.trim() && !l.lot.trim() && !l.expiry;

/**
 * Product + quantity rows (optionally lot / expiry) for production orders and
 * stock in/out. Products are picked from a dropdown (without lot columns a
 * product can only be picked once); the rows are submitted as JSON in one
 * hidden input (`name`):
 * [{ product_id, quantity, lot_number, expiry_date }].
 */
export function ProductLinesEditor({
  products,
  initialLines,
  name = "lines",
  withLot = false,
  showOnHand = false,
  minQuantity = {},
}: {
  products: PickableProduct[];
  initialLines?: ProductLine[];
  name?: string;
  withLot?: boolean;
  showOnHand?: boolean;
  /** per product id: the lowest quantity allowed, and the row can't be removed (already received) */
  minQuantity?: Record<string, number>;
}) {
  const [lines, setLines] = useState<ProductLine[]>(initialLines?.length ? initialLines : [emptyLine()]);

  const update = (i: number, patch: Partial<ProductLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const payload = lines
    .filter((l) => !isBlank(l))
    .map((l) => ({
      product_id: l.productId,
      quantity: Number(l.quantity) || 0,
      lot_number: l.lot.trim() || null,
      expiry_date: l.expiry || null,
    }));

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(payload)} />

      <div className="overflow-x-auto rounded-lg border border-teal-100 bg-white">
        <table className={`w-full text-sm ${withLot ? "min-w-[760px]" : "min-w-[520px]"}`}>
          <thead>
            <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="w-10 px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">สินค้า</th>
              <th className="w-32 px-3 py-2 text-right">จำนวน</th>
              {withLot && <th className="w-36 px-3 py-2">Lot</th>}
              {withLot && <th className="w-40 px-3 py-2">วันหมดอายุ</th>}
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const product = products.find((p) => p.id === l.productId);
              const min = minQuantity[l.productId];
              return (
                <tr key={i} className="border-t border-teal-100 align-top">
                  <td className="px-3 py-2.5 text-center text-teal-500">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={l.productId}
                      onChange={(e) => update(i, { productId: e.target.value })}
                      disabled={min !== undefined}
                      required={!isBlank(l)}
                      aria-label={`สินค้ารายการที่ ${i + 1}`}
                      className={`${cellClassName} bg-white disabled:bg-teal-50`}
                    >
                      <option value="">— เลือกสินค้า —</option>
                      {l.productId && !product && <option value={l.productId}>(สินค้าที่ปิดใช้งานแล้ว)</option>}
                      {products.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={!withLot && p.id !== l.productId && lines.some((x) => x.productId === p.id)}
                        >
                          {labelOf(p)}
                        </option>
                      ))}
                    </select>
                    {product && (
                      <p className="mt-0.5 text-xs text-teal-500">
                        หน่วย: {product.unit}
                        {showOnHand && product.on_hand !== undefined && ` · คงเหลือ ${product.on_hand.toLocaleString("en-US")}`}
                        {min !== undefined && ` · รับแล้ว ${min.toLocaleString("en-US")}`}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={min || "0.001"}
                      step="any"
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: e.target.value })}
                      required={!isBlank(l)}
                      aria-label="จำนวน"
                      className={`${cellClassName} text-right`}
                    />
                  </td>
                  {withLot && (
                    <td className="px-2 py-1.5">
                      <input
                        value={l.lot}
                        onChange={(e) => update(i, { lot: e.target.value })}
                        aria-label="Lot"
                        className={cellClassName}
                      />
                    </td>
                  )}
                  {withLot && (
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={l.expiry}
                        onChange={(e) => update(i, { expiry: e.target.value })}
                        aria-label="วันหมดอายุ"
                        className={cellClassName}
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-right">
                    {min === undefined && (
                      <button
                        type="button"
                        onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : [emptyLine()]))}
                        className="rounded border border-orange-200 p-1.5 text-orange-500 hover:border-orange-400 hover:bg-orange-50"
                        title="ลบรายการ"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setLines((ls) => [...ls, emptyLine()])}
        className="mt-2 flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
      >
        <FontAwesomeIcon icon={faPlus} className="text-xs" />
        เพิ่มรายการ
      </button>
    </div>
  );
}
