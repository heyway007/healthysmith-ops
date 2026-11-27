"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { emptyLine, labelOf, type PickableProduct, type ProductLine } from "./product-lines";
import {
  UNLOTTED,
  addMonths,
  UNLOTTED_LABEL,
  expiryStatus,
  issuableLots,
  lotValue,
  recommendedLot,
  shortDate,
  type LotOption,
} from "./lots";
import { DateInput } from "@/components/ui/date-input";
import { BarcodeScanButton, findByBarcode, type ScanFeedback } from "./barcode-scanner";

export type { PickableProduct, ProductLine };

const cellClassName =
  "w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none";

const isBlank = (l: ProductLine) => !l.productId && !l.quantity.trim() && !l.lot.trim() && !l.expiry;
const lotKey = (s: string) => s.trim().toUpperCase();
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });

/**
 * Product + quantity rows for production orders and stock in/out. Products are
 * picked from a dropdown (without lot columns a product can only be picked
 * once); the rows are submitted as JSON in one hidden input (`name`):
 * [{ product_id, quantity, lot_number, expiry_date }].
 *
 *  - `withLot`   (รับเข้า): Lot + expiry are typed. A lot-tracked product needs
 *    a Lot; an existing lot is offered as you type and fills in its expiry.
 *  - `pickLot`   (เบิกออก): a lot-tracked product picks one of its lots (the
 *    one expiring first is preselected) and can't exceed that lot's balance.
 *    `lots` is the product_lot_stock data both modes read.
 */
export function ProductLinesEditor({
  products,
  initialLines,
  name = "lines",
  withLot = false,
  pickLot = false,
  lots = [],
  today = "",
  showOnHand = false,
  minQuantity = {},
}: {
  products: PickableProduct[];
  initialLines?: ProductLine[];
  name?: string;
  withLot?: boolean;
  pickLot?: boolean;
  lots?: LotOption[];
  /** YYYY-MM-DD, for the expiry badges */
  today?: string;
  showOnHand?: boolean;
  /** per product id: the lowest quantity allowed, and the row can't be removed (already received) */
  minQuantity?: Record<string, number>;
}) {
  const showLot = withLot || pickLot;

  const defaultLot = (productId: string) => {
    if (!pickLot || !products.find((p) => p.id === productId)?.track_lot) return "";
    const first = recommendedLot(issuableLots(lots, productId), today);
    return first ? lotValue(first) : "";
  };

  // รับเข้า: the expiry a product's shelf life suggests (receipt date + อายุสินค้า)
  const shelfExpiry = (productId: string) => {
    const months = products.find((p) => p.id === productId)?.shelf_life_months;
    return withLot && months && today ? addMonths(today, months) : "";
  };

  const [lines, setLines] = useState<ProductLine[]>(() => {
    const start = initialLines?.length ? initialLines : [emptyLine()];
    return start.map((l) => {
      if (!l.productId) return l;
      const auto = !l.expiry ? shelfExpiry(l.productId) : "";
      return { ...l, lot: l.lot || defaultLot(l.productId), ...(auto ? { expiry: auto, expiryAuto: true } : {}) };
    });
  });

  const update = (i: number, patch: Partial<ProductLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  // Two scans can land before React re-renders, so the scan handler works on a ref.
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  });

  // The most a row may hold: เบิกออก of a lot-tracked product is capped by the picked lot's balance.
  const maxFor = (l: ProductLine) =>
    pickLot && products.find((p) => p.id === l.productId)?.track_lot
      ? issuableLots(lots, l.productId).find((o) => lotValue(o) === l.lot)?.on_hand
      : undefined;

  /** Each scan adds 1 to the product's row (a new row the first time it is scanned). */
  const handleScan = (code: string): ScanFeedback => {
    const product = findByBarcode(products, code);
    if (!product) return { ok: false, message: "ไม่พบสินค้าที่ตรงกับบาร์โค้ดนี้ — ตรวจช่องบาร์โค้ดในข้อมูลสินค้า" };

    const current = linesRef.current;
    const at = current.map((l) => l.productId).lastIndexOf(product.id);
    let next: ProductLine[];
    let qty: number;

    if (at >= 0) {
      qty = (Number(current[at].quantity) || 0) + 1;
      const max = maxFor(current[at]);
      if (max !== undefined && qty > max) {
        return { ok: false, message: `${labelOf(product)} — เกินยอดคงเหลือของล็อตนี้ (${fmt(max)} ${product.unit})` };
      }
      next = current.map((l, idx) => (idx === at ? { ...l, quantity: String(qty) } : l));
    } else {
      qty = 1;
      const auto = shelfExpiry(product.id);
      const line: ProductLine = {
        productId: product.id,
        quantity: "1",
        lot: defaultLot(product.id),
        expiry: auto,
        expiryAuto: !!auto,
      };
      const max = maxFor(line);
      if (max !== undefined && qty > max) {
        return { ok: false, message: `${labelOf(product)} — ไม่มียอดคงเหลือให้เบิก` };
      }
      const blank = current.findIndex(isBlank);
      next = blank >= 0 ? current.map((l, idx) => (idx === blank ? line : l)) : [...current, line];
    }

    linesRef.current = next;
    setLines(next);
    return { ok: true, message: `${labelOf(product)} · ${fmt(qty)} ${product.unit}` };
  };

  const payload = lines
    .filter((l) => !isBlank(l))
    .map((l) => ({
      product_id: l.productId,
      quantity: Number(l.quantity) || 0,
      lot_number: pickLot ? (l.lot && l.lot !== UNLOTTED ? l.lot : null) : l.lot.trim() || null,
      expiry_date: withLot ? l.expiry || null : null,
    }));

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(payload)} />

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <BarcodeScanButton onScan={handleScan} />
        <span className="text-xs text-teal-600">สแกนด้วยกล้องมือถือ — สแกนซ้ำเพื่อเพิ่มจำนวนทีละ 1</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-teal-100 bg-white">
        <table className={`stack-table w-full text-sm ${showLot ? "md:min-w-[820px]" : "md:min-w-[520px]"}`}>
          <thead>
            <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="w-10 px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">สินค้า</th>
              <th className="w-32 px-3 py-2 text-right">จำนวน</th>
              {showLot && <th className={pickLot ? "w-[26rem] px-3 py-2" : "w-40 px-3 py-2"}>Lot</th>}
              {showLot && <th className={pickLot ? "w-44 px-3 py-2" : "w-40 px-3 py-2"}>วันหมดอายุ</th>}
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const product = products.find((p) => p.id === l.productId);
              const min = minQuantity[l.productId];
              const tracked = !!product?.track_lot;

              // รับเข้า: the lot being typed, if it already exists
              const typedLot = withLot && tracked && l.lot.trim()
                ? lots.find((x) => x.product_id === l.productId && x.lot_number === lotKey(l.lot))
                : undefined;
              // เบิกออก: the lot picked
              const options = pickLot && tracked ? issuableLots(lots, l.productId) : [];
              const recommended = recommendedLot(options, today);
              const picked = options.find((o) => lotValue(o) === l.lot);
              const maxQty = pickLot ? (tracked ? picked?.on_hand : undefined) : undefined;

              return (
                <tr key={i} className="border-t border-teal-100 align-top">
                  <td className="px-3 py-2.5 text-center text-teal-500 max-md:hidden!">{i + 1}</td>
                  <td data-label="สินค้า" data-stack="block" className="px-2 py-1.5">
                    <select
                      value={l.productId}
                      onChange={(e) => {
                        const auto = shelfExpiry(e.target.value);
                        update(i, { productId: e.target.value, lot: defaultLot(e.target.value), expiry: auto, expiryAuto: !!auto });
                      }}
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
                          disabled={!showLot && p.id !== l.productId && lines.some((x) => x.productId === p.id)}
                        >
                          {labelOf(p)}
                          {p.track_lot ? " (ล็อต)" : ""}
                        </option>
                      ))}
                    </select>
                    {product && (
                      <p className="mt-0.5 text-xs text-teal-500">
                        หน่วย: {product.unit}
                        {showOnHand && product.on_hand !== undefined && ` · คงเหลือรวม ${fmt(product.on_hand)}`}
                        {min !== undefined && ` · รับแล้ว ${fmt(min)}`}
                        {tracked && " · ติดตามเป็นล็อต"}
                      </p>
                    )}
                  </td>
                  <td data-label="จำนวน" data-stack="block" className="px-2 py-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={min || "0.001"}
                      max={maxQty}
                      step="any"
                      value={l.quantity}
                      onChange={(e) => update(i, { quantity: e.target.value })}
                      required={!isBlank(l)}
                      aria-label="จำนวน"
                      className={`${cellClassName} text-right`}
                    />
                  </td>

                  {withLot && (
                    <td data-label="Lot" data-stack="block" className="px-2 py-1.5">
                      <input
                        value={l.lot}
                        list={tracked ? `lot-list-${i}` : undefined}
                        onChange={(e) => {
                          const match = lots.find((x) => x.product_id === l.productId && x.lot_number === lotKey(e.target.value));
                          update(i, {
                            lot: e.target.value,
                            ...(match?.expiry_date && (!l.expiry || l.expiryAuto) ? { expiry: match.expiry_date, expiryAuto: false } : {}),
                          });
                        }}
                        required={tracked && !isBlank(l)}
                        placeholder={tracked ? "ระบุเลข Lot *" : "(ไม่บังคับ)"}
                        aria-label="Lot"
                        autoComplete="off"
                        className={cellClassName}
                      />
                      {tracked && (
                        <datalist id={`lot-list-${i}`}>
                          {lots
                            .filter((x) => x.product_id === l.productId && x.lot_number)
                            .map((x) => (
                              <option key={x.lot_number} value={x.lot_number!}>
                                คงเหลือ {fmt(x.on_hand)}
                                {x.expiry_date ? ` · หมด ${shortDate(x.expiry_date)}` : ""}
                              </option>
                            ))}
                        </datalist>
                      )}
                      {typedLot && (
                        <p className="mt-0.5 text-xs text-teal-500">ล็อตเดิม · คงเหลือ {fmt(typedLot.on_hand)}</p>
                      )}
                    </td>
                  )}
                  {withLot && (
                    <td data-label="วันหมดอายุ" data-stack="block" className="px-2 py-1.5">
                      <DateInput
                        value={l.expiry}
                        onChange={(e) => update(i, { expiry: e.target.value, expiryAuto: false })}
                        aria-label="วันหมดอายุ"
                        className={cellClassName}
                      />
                      {l.expiryAuto && l.expiry && (
                        <p className="mt-0.5 text-xs text-teal-500">
                          จากอายุสินค้า {product?.shelf_life_months} เดือน — แก้ได้
                        </p>
                      )}
                      {typedLot?.expiry_date && l.expiry && l.expiry !== typedLot.expiry_date && (
                        <p className="mt-0.5 text-xs text-orange-600">
                          ล็อตนี้มีวันหมดอายุ {shortDate(typedLot.expiry_date)} อยู่แล้ว
                        </p>
                      )}
                    </td>
                  )}

                  {pickLot && (
                    <td data-label="Lot" data-stack="block" className="px-2 py-1.5">
                      {tracked ? (
                        <>
                          <select
                            value={l.lot}
                            onChange={(e) => update(i, { lot: e.target.value })}
                            required={!isBlank(l)}
                            disabled={options.length === 0}
                            aria-label="Lot"
                            className={`${cellClassName} bg-white disabled:bg-teal-50`}
                          >
                            <option value="">— เลือกล็อต —</option>
                            {options.map((o) => (
                              <option key={lotValue(o)} value={lotValue(o)}>
                                {options.length > 1 && o === recommended ? "★ " : ""}
                                {o.lot_number ?? UNLOTTED_LABEL}
                                {o.expiry_date ? ` · หมด ${shortDate(o.expiry_date)}` : ""} · เหลือ {fmt(o.on_hand)}
                              </option>
                            ))}
                          </select>
                          {l.productId && options.length === 0 && (
                            <p className="mt-0.5 text-xs text-orange-600">ไม่มีสต๊อกของสินค้านี้ให้เบิก</p>
                          )}
                          {options.length > 1 && (
                            <p className="mt-0.5 text-xs text-teal-500">★ = แนะนำ (หมดอายุก่อน และยังไม่หมดอายุ)</p>
                          )}
                        </>
                      ) : (
                        <span className="block py-1.5 text-teal-300">—</span>
                      )}
                    </td>
                  )}
                  {pickLot && (
                    <td data-label="วันหมดอายุ" data-stack="block" className="px-2 py-1.5">
                      {picked?.expiry_date ? (
                        <div className="py-1">
                          <span className="text-teal-800">{shortDate(picked.expiry_date)}</span>
                          {today && (
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${expiryStatus(picked.expiry_date, today).className}`}
                            >
                              {expiryStatus(picked.expiry_date, today).label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="block py-1.5 text-teal-300">—</span>
                      )}
                    </td>
                  )}

                  <td className="px-2 py-1.5 text-right max-md:mt-2 max-md:justify-end max-md:border-t max-md:border-teal-100 max-md:pt-2">
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
