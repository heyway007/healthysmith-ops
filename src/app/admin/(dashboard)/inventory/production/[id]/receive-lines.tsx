"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { DateInput } from "@/components/ui/date-input";
import { addMonths, shortDate } from "@/components/inventory/lots";
import { BarcodeScanButton, findByBarcode, type ScanFeedback } from "@/components/inventory/barcode-scanner";
import { formatQty } from "../../labels";

export type ReceiveItem = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  remaining: number;
  trackLot: boolean;
  /** อายุสินค้า (months): the expiry filled in for each new line = today + this */
  shelfLifeMonths: number | null;
  /** lots that already exist for this product (offered as you type; fill in the expiry) */
  lots: { lot_number: string; expiry_date: string | null; on_hand: number }[];
};

type Row = { key: number; qty: string; lot: string; expiry: string; expiryAuto: boolean };

const cellInput =
  "w-full rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none";

/**
 * The "รับสินค้าเข้าคลัง" lines of a production order. Each product starts with
 * one line; "เพิ่มล็อต" adds another line for a second lot of the same product
 * (own Lot and expiry date). Every line posts item_id / quantity / lot_number /
 * expiry_date as parallel lists; lines with no quantity are skipped.
 */
export function ReceiveLines({ items, lotExample, today }: { items: ReceiveItem[]; lotExample: string; today: string }) {
  const nextKey = useRef(1);
  const shelf = (item: ReceiveItem) => (item.shelfLifeMonths ? addMonths(today, item.shelfLifeMonths) : "");
  const makeRow = (item: ReceiveItem, key: number): Row => ({ key, qty: "", lot: "", expiry: shelf(item), expiryAuto: !!shelf(item) });
  const newRow = (item: ReceiveItem): Row => makeRow(item, nextKey.current++);
  const [rows, setRows] = useState<Record<string, Row[]>>(() => Object.fromEntries(items.map((i) => [i.id, [makeRow(i, 0)]])));

  // two scans can land before React re-renders, so the scan handler works on a ref
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });

  const patch = (itemId: string, key: number, p: Partial<Row>) =>
    setRows((r) => ({ ...r, [itemId]: r[itemId].map((x) => (x.key === key ? { ...x, ...p } : x)) }));

  // Each scan adds 1 to the item's last lot line. The items are the order's own,
  // so a product that isn't on this order (or is fully received) is reported, not added.
  const handleScan = (code: string): ScanFeedback => {
    const item = findByBarcode(items, code);
    if (!item) return { ok: false, message: "สินค้านี้ไม่อยู่ในรายการค้างรับของใบผลิตนี้" };
    const list = rowsRef.current[item.id];
    const last = list[list.length - 1];
    const qty = (Number(last.qty) || 0) + 1;
    const total = list.reduce((s, r) => s + (Number(r.qty) || 0), 0) + 1;
    if (total > item.remaining) {
      return { ok: false, message: `${item.sku} — เกินจำนวนค้างรับ (${formatQty(item.remaining)} ${item.unit})` };
    }
    const next = { ...rowsRef.current, [item.id]: list.map((x) => (x.key === last.key ? { ...x, qty: String(qty) } : x)) };
    rowsRef.current = next;
    setRows(next);
    return { ok: true, message: `${item.sku} ${item.name} · รับรอบนี้ ${formatQty(total)} ${item.unit}` };
  };

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <BarcodeScanButton onScan={handleScan} />
        <span className="text-xs text-teal-600">สแกนด้วยกล้องมือถือ — สแกนซ้ำเพื่อเพิ่มจำนวนทีละ 1 (สินค้าหลายล็อตให้ใส่ Lot ในบรรทัดนั้นเอง)</span>
      </div>
    <div className="overflow-x-auto rounded-lg border border-teal-100 bg-white">
      <table className="stack-table w-full text-sm md:min-w-[760px]">
        <thead>
          <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
            <th className="px-3 py-2">สินค้า</th>
            <th className="px-3 py-2 text-right">ค้างรับ</th>
            <th className="w-36 px-3 py-2 text-right">รับรอบนี้</th>
            <th className="w-44 px-3 py-2">Lot</th>
            <th className="w-40 px-3 py-2">วันหมดอายุ</th>
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        {items.map((item) => {
          const list = rows[item.id];
          const total = list.reduce((s, r) => s + (Number(r.qty) || 0), 0);
          const over = total > item.remaining;
          return (
            <tbody key={item.id} className="border-t border-teal-100">
              {list.map((r, idx) => {
                const typed = item.lots.find((l) => l.lot_number === r.lot.trim().toUpperCase());
                return (
                  <tr key={r.key} className={idx > 0 ? "border-t border-dashed border-teal-100" : undefined}>
                    <td data-label="สินค้า" className="px-3 py-2 text-teal-900">
                      {idx === 0 ? (
                        <>
                          <span className="font-medium">{item.sku}</span> {item.name}
                          {item.trackLot && (
                            <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">ติดตามเป็นล็อต</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-teal-500">↳ ล็อตที่ {idx + 1} ของสินค้านี้</span>
                      )}
                    </td>
                    <td data-label="ค้างรับ" className="px-3 py-2 text-right text-amber-700">
                      {idx === 0 && (
                        <>
                          {formatQty(item.remaining)} <span className="text-xs text-teal-500">{item.unit}</span>
                        </>
                      )}
                    </td>
                    <td data-label="รับรอบนี้" className="px-2 py-1.5">
                      <input type="hidden" name="item_id" value={item.id} />
                      <input
                        name="quantity"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={item.remaining}
                        step="any"
                        value={r.qty}
                        onChange={(e) => patch(item.id, r.key, { qty: e.target.value })}
                        placeholder={idx === 0 && list.length === 1 ? formatQty(item.remaining) : ""}
                        aria-label={`จำนวนรับ ${item.sku} ล็อตที่ ${idx + 1}`}
                        className={`${cellInput} text-right`}
                      />
                    </td>
                    <td data-label="Lot" className="px-2 py-1.5">
                      <input
                        name="lot_number"
                        value={r.lot}
                        list={`recv-lots-${item.id}`}
                        onChange={(e) => {
                          const m = item.lots.find((l) => l.lot_number === e.target.value.trim().toUpperCase());
                          patch(item.id, r.key, {
                            lot: e.target.value,
                            ...(m?.expiry_date && (!r.expiry || r.expiryAuto) ? { expiry: m.expiry_date, expiryAuto: false } : {}),
                          });
                        }}
                        required={item.trackLot && r.qty.trim() !== ""}
                        placeholder={item.trackLot ? `เช่น ${lotExample}-${String.fromCharCode(65 + idx)} *` : "(ไม่บังคับ)"}
                        autoComplete="off"
                        aria-label={`Lot ${item.sku} ล็อตที่ ${idx + 1}`}
                        className={cellInput}
                      />
                      {typed && <p className="mt-0.5 text-xs text-teal-500">ล็อตเดิม · คงเหลือ {formatQty(typed.on_hand)}</p>}
                    </td>
                    <td data-label="วันหมดอายุ" className="px-2 py-1.5">
                      <DateInput
                        name="expiry_date"
                        value={r.expiry}
                        onChange={(e) => patch(item.id, r.key, { expiry: e.target.value, expiryAuto: false })}
                        aria-label={`วันหมดอายุ ${item.sku} ล็อตที่ ${idx + 1}`}
                        className={cellInput}
                      />
                      {r.expiryAuto && r.expiry && (
                        <p className="mt-0.5 text-xs text-teal-500">จากอายุสินค้า {item.shelfLifeMonths} เดือน นับจากวันนี้ — แก้ได้</p>
                      )}
                      {typed?.expiry_date && r.expiry && r.expiry !== typed.expiry_date && (
                        <p className="mt-0.5 text-xs text-orange-600">ล็อตนี้มีวันหมดอายุ {shortDate(typed.expiry_date)} อยู่แล้ว</p>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => setRows((all) => ({ ...all, [item.id]: all[item.id].filter((x) => x.key !== r.key) }))}
                          className="rounded border border-orange-200 p-1.5 text-orange-500 hover:border-orange-400 hover:bg-orange-50"
                          title="ลบล็อตนี้"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={6} className="px-3 pb-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRows((all) => ({ ...all, [item.id]: [...all[item.id], newRow(item)] }))}
                      className="flex items-center gap-1.5 rounded-md border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                      เพิ่มล็อตของสินค้านี้
                    </button>
                    {list.length > 1 && (
                      <span className={`text-xs ${over ? "font-medium text-orange-600" : "text-teal-500"}`}>
                        รวมรอบนี้ {formatQty(total)} / ค้างรับ {formatQty(item.remaining)} {item.unit}
                        {over && " — เกินจำนวนที่สั่งผลิต"}
                      </span>
                    )}
                  </div>
                  {item.lots.length > 0 && (
                    <datalist id={`recv-lots-${item.id}`}>
                      {item.lots.map((l) => (
                        <option key={l.lot_number} value={l.lot_number}>
                          คงเหลือ {formatQty(l.on_hand)}
                          {l.expiry_date ? ` · หมด ${shortDate(l.expiry_date)}` : ""}
                        </option>
                      ))}
                    </datalist>
                  )}
                </td>
              </tr>
            </tbody>
          );
        })}
      </table>
    </div>
    </div>
  );
}
