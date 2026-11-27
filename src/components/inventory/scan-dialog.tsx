"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/components/ui/date-input";
import { UNLOTTED_LABEL, expiryStatus, issuableLots, lotValue, recommendedLot, shortDate, type LotOption } from "./lots";
import type { PickableProduct } from "./product-lines";

export type ScanMode = "in" | "out" | "produce";
export type ScanResult = { quantity: number; lot: string; expiry: string; expiryAuto: boolean };

const inputClass =
  "mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });

const TEXT: Record<ScanMode, { title: string; qty: string }> = {
  in: { title: "รับสินค้าเข้า", qty: "จำนวนที่รับเข้า" },
  out: { title: "เบิกสินค้าออก", qty: "จำนวนที่เบิก" },
  produce: { title: "สั่งผลิตสินค้า", qty: "จำนวนที่สั่งผลิต" },
};

/**
 * The popup shown after a scan: which product it is, how much is in stock now,
 * and a box for the quantity -- so a pallet is entered as one number instead of
 * one scan per item.
 *
 *  - `in`      (รับเข้า): a lot-tracked product also asks for its Lot (an existing
 *    lot is offered and fills in its expiry) and expiry date.
 *  - `out`     (เบิกออก): a lot-tracked product picks one of its lots (the one
 *    expiring first is preselected); the quantity can't exceed what is left in it.
 *  - `produce` (ใบผลิต): just the quantity.
 *
 * Rendered in a portal: it is opened from inside a <form>, and its boxes must
 * neither be submitted with it nor let Enter submit it.
 */
export function ScanDialog({
  mode,
  product,
  lots,
  today,
  shelfExpiry,
  listedQty,
  onConfirm,
  onCancel,
}: {
  mode: ScanMode;
  product: PickableProduct;
  lots: LotOption[];
  /** YYYY-MM-DD, for the expiry badges */
  today: string;
  /** the expiry the product's shelf life suggests ("" = none) -- รับเข้า only */
  shelfExpiry: string;
  /** quantity of this product already on the form being filled in: in that lot, or (null) in all of its rows */
  listedQty: (lot: string | null) => number;
  onConfirm: (r: ScanResult) => void;
  onCancel: () => void;
}) {
  const tracked = !!product.track_lot;
  const text = TEXT[mode];

  const options = mode === "out" && tracked ? issuableLots(lots, product.id) : [];
  const recommended = recommendedLot(options, today);

  const [qty, setQty] = useState("");
  const [lot, setLot] = useState(() => (recommended ? lotValue(recommended) : ""));
  const [expiry, setExpiry] = useState(mode === "in" ? shelfExpiry : "");
  const [expiryAuto, setExpiryAuto] = useState(mode === "in" && !!shelfExpiry);

  const productLots = lots.filter((l) => l.product_id === product.id && l.lot_number);
  const typedLot = mode === "in" && tracked && lot.trim() ? productLots.find((l) => l.lot_number === lot.trim().toUpperCase()) : undefined;
  const pickedLot = mode === "out" ? options.find((o) => lotValue(o) === lot) : undefined;

  const listedTotal = listedQty(null);
  // เบิกออก of a lot-tracked product: what is left of the picked lot after what is already on the form
  const max = pickedLot ? pickedLot.on_hand - listedQty(lot) : undefined;

  const quantity = Number(qty);
  const overMax = max !== undefined && quantity > max;
  const lotMissing = mode === "in" ? tracked && !lot.trim() : mode === "out" ? tracked && !pickedLot : false;
  const valid = quantity > 0 && !overMax && !lotMissing;
  const confirm = () => valid && onConfirm({ quantity, lot: mode === "in" ? lot.trim() : lot, expiry, expiryAuto });

  // keep the latest handler for the Esc listener
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancelRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    confirm();
  };

  // focus the first box that needs typing: the Lot (รับเข้า) or the quantity
  const lotFirst = mode === "in" && tracked;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={text.title}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <p className="text-xs font-medium text-teal-600">{text.title}</p>
        <h3 className="mt-0.5 text-lg font-semibold text-teal-950">{product.name}</h3>
        <p className="text-sm text-teal-700">
          รหัสสินค้า <span className="font-medium text-teal-900">{product.sku}</span>
          {tracked && <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">ติดตามเป็นล็อต</span>}
        </p>

        <div className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          มีในสต๊อก{" "}
          <span className="text-base font-semibold text-teal-950">
            {product.on_hand === undefined ? "-" : fmt(product.on_hand)}
          </span>{" "}
          {product.unit}
          {listedTotal > 0 && (
            <p className="mt-0.5 text-xs text-teal-600">
              ในใบนี้มีสินค้านี้แล้ว {fmt(listedTotal)} {product.unit}
              {mode === "produce" ? " — จะบวกเพิ่มให้" : " — ถ้าล็อตเดียวกันจะบวกเพิ่มให้"}
            </p>
          )}
        </div>

        {mode === "in" && tracked && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-teal-800" htmlFor="scan-lot">
                Lot <span className="text-orange-500">*</span>
              </label>
              <input
                id="scan-lot"
                value={lot}
                list="scan-lot-options"
                autoFocus
                autoComplete="off"
                onKeyDown={onEnter}
                onChange={(e) => {
                  setLot(e.target.value);
                  const m = productLots.find((l) => l.lot_number === e.target.value.trim().toUpperCase());
                  if (m?.expiry_date && (!expiry || expiryAuto)) {
                    setExpiry(m.expiry_date);
                    setExpiryAuto(false);
                  }
                }}
                className={inputClass}
              />
              <datalist id="scan-lot-options">
                {productLots.map((l) => (
                  <option key={l.lot_number} value={l.lot_number as string}>
                    คงเหลือ {fmt(l.on_hand)}
                    {l.expiry_date ? ` · หมด ${shortDate(l.expiry_date)}` : ""}
                  </option>
                ))}
              </datalist>
              {typedLot && <p className="mt-0.5 text-xs text-teal-500">ล็อตเดิม · คงเหลือ {fmt(typedLot.on_hand)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-teal-800">วันหมดอายุ</label>
              <div className="mt-1">
                <DateInput
                  value={expiry}
                  onChange={(e) => {
                    setExpiry(e.target.value);
                    setExpiryAuto(false);
                  }}
                  aria-label="วันหมดอายุ"
                  className="w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
              {typedLot?.expiry_date && expiry && expiry !== typedLot.expiry_date && (
                <p className="mt-0.5 text-xs text-orange-600">ล็อตนี้มีวันหมดอายุ {shortDate(typedLot.expiry_date)} อยู่แล้ว</p>
              )}
            </div>
          </div>
        )}

        {mode === "out" && tracked && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-teal-800" htmlFor="scan-pick-lot">
              เลือกล็อตที่เบิก <span className="text-orange-500">*</span>
            </label>
            {options.length === 0 ? (
              <p className="mt-1 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">ไม่มีสต๊อกของสินค้านี้ให้เบิก</p>
            ) : (
              <>
                <select
                  id="scan-pick-lot"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  {options.map((o) => (
                    <option key={lotValue(o)} value={lotValue(o)}>
                      {options.length > 1 && o === recommended ? "★ " : ""}
                      {o.lot_number ?? UNLOTTED_LABEL}
                      {o.expiry_date ? ` · หมด ${shortDate(o.expiry_date)}` : ""} · เหลือ {fmt(o.on_hand)}
                    </option>
                  ))}
                </select>
                {pickedLot?.expiry_date && today && (
                  <p className="mt-1 text-xs text-teal-600">
                    หมดอายุ {shortDate(pickedLot.expiry_date)}{" "}
                    <span className={`rounded-full px-1.5 py-0.5 font-medium ${expiryStatus(pickedLot.expiry_date, today).className}`}>
                      {expiryStatus(pickedLot.expiry_date, today).label}
                    </span>
                  </p>
                )}
                {options.length > 1 && <p className="mt-0.5 text-xs text-teal-500">★ = แนะนำ (หมดอายุก่อน และยังไม่หมดอายุ)</p>}
              </>
            )}
          </div>
        )}

        <div className="mt-3">
          <label className="block text-sm font-medium text-teal-800" htmlFor="scan-qty">
            {text.qty} ({product.unit})
          </label>
          <input
            id="scan-qty"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={qty}
            autoFocus={!lotFirst}
            onKeyDown={onEnter}
            onChange={(e) => setQty(e.target.value)}
            className={`${inputClass} text-right text-base`}
          />
          {max !== undefined && (
            <p className={`mt-0.5 text-xs ${overMax ? "font-medium text-orange-600" : "text-teal-500"}`}>
              {overMax ? "เกินยอดคงเหลือของล็อตนี้ — " : ""}เบิกได้อีกไม่เกิน {fmt(Math.max(max, 0))} {product.unit}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-teal-300 bg-white py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!valid}
            className="flex-1 rounded-lg border border-orange-600/40 bg-linear-to-r from-orange-500 to-orange-600 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
