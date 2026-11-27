"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { faEye, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { DeleteButton } from "@/components/ui/delete-button";
import { IconLinkButton } from "@/components/ui/icon-link-button";
import { filterInputClassName } from "@/components/ui/list-filter";
import { Pagination } from "@/components/ui/pagination";
import { expiryStatus, shortDate } from "@/components/inventory/lots";
import { secondaryButtonClassName, selectClassName } from "@/lib/ui-classes";
import { PRODUCT_TYPES, formatQty } from "../labels";

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  product_type: string;
  unit: string;
  sale_price: number;
  on_hand: number;
  is_active: boolean;
  track_lot: boolean;
  /** soonest expiry among lots with stock + number of lots (lot-tracked products only) */
  expiry: { next: string | null; count: number } | null;
};

const labelClassName = "block text-xs font-medium text-teal-700";

/**
 * Product list with its filter bar. Everything is filtered and paged in the
 * browser (the page hands over all products), so typing never reloads or
 * changes the URL. A dropdown suggests matching products while typing.
 */
export function ProductList({
  products,
  today,
  pageSize,
  deleteProduct,
}: {
  products: ProductRow[];
  today: string;
  pageSize: number;
  deleteProduct: (id: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [type, setType] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  const q = text.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (showInactive || p.is_active) &&
          (!type || p.product_type === type) &&
          (!q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q)),
      ),
    [products, q, type, showInactive],
  );
  const suggestions = q ? filtered.slice(0, 8) : [];
  const showList = open && suggestions.length > 0;

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * size, current * size);
  const active = !!(q || type || showInactive);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (p: ProductRow) => {
    setText(p.sku);
    setPage(1);
    setOpen(false);
    setHighlight(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && highlight >= 0) pick(suggestions[highlight]);
      else setOpen(false);
    }
  };

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div ref={box} className="relative sm:min-w-64 sm:flex-1">
          <label className={labelClassName} htmlFor="q">
            ค้นหา
          </label>
          <input
            id="q"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPage(1);
              setOpen(true);
              setHighlight(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="รหัส / ชื่อสินค้า / บาร์โค้ด"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls="product-suggestions"
            aria-autocomplete="list"
            className={`${filterInputClassName} w-full`}
          />
          {showList && (
            <ul
              id="product-suggestions"
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-teal-200 bg-white py-1 shadow-lg"
            >
              {suggestions.map((s, i) => (
                <li key={s.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    // mousedown (not click) so it fires before the input loses focus
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(s);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${i === highlight ? "bg-teal-50" : ""} ${s.is_active ? "" : "opacity-50"}`}
                  >
                    <span className="font-medium text-teal-900">
                      {s.sku}
                      {!s.is_active && <span className="ml-2 text-xs font-normal text-teal-500">(ปิดใช้งาน)</span>}
                    </span>
                    <span className="text-teal-700">{s.name}</span>
                    {s.barcode && <span className="text-xs text-teal-500">{s.barcode}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sm:min-w-44">
          <label className={labelClassName} htmlFor="type">
            ประเภทสินค้า
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className={selectClassName}
          >
            <option value="">ทุกประเภท</option>
            {Object.entries(PRODUCT_TYPES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-teal-700 sm:pb-2">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(1);
            }}
            className="accent-teal-600"
          />
          แสดงสินค้าที่ปิดใช้งาน
        </label>

        {active && (
          <button
            type="button"
            onClick={() => {
              setText("");
              setType("");
              setShowInactive(false);
              setPage(1);
            }}
            className={`${secondaryButtonClassName} self-start sm:self-auto`}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อสินค้า</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">หน่วย</th>
              <th className="px-4 py-3 text-right">ราคาขาย</th>
              <th className="px-4 py-3 text-right">คงเหลือ</th>
              <th className="px-4 py-3">วันหมดอายุ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={`border-t border-teal-100 hover:bg-teal-50 ${p.is_active ? "" : "opacity-50"}`}>
                <td data-label="รหัส" className="whitespace-nowrap px-4 py-3">
                  <Link href={`/admin/inventory/products/${p.id}`} className="font-medium text-teal-800 hover:text-orange-600">
                    {p.sku}
                  </Link>
                </td>
                <td data-label="ชื่อสินค้า" className="px-4 py-3 text-teal-950">
                  <Link href={`/admin/inventory/products/${p.id}`} className="hover:text-orange-600">
                    {p.name}
                  </Link>
                  {!p.is_active && <span className="ml-2 text-xs text-teal-500">(ปิดใช้งาน)</span>}
                </td>
                <td data-label="ประเภท" className="px-4 py-3 text-teal-700">{PRODUCT_TYPES[p.product_type] ?? p.product_type}</td>
                <td data-label="หน่วย" className="px-4 py-3 text-teal-700">{p.unit}</td>
                <td data-label="ราคาขาย" className="px-4 py-3 text-right text-teal-700">{p.sale_price.toLocaleString()}</td>
                <td data-label="คงเหลือ" className="px-4 py-3 text-right font-medium text-teal-950">
                  {p.product_type === "service" ? (
                    "-"
                  ) : (
                    <Link href={`/admin/inventory/stock/${p.id}`} className="hover:text-orange-600">
                      {formatQty(p.on_hand)}
                    </Link>
                  )}
                </td>
                <td data-label="วันหมดอายุ" className="px-4 py-3 text-teal-700">
                  {p.expiry ? (
                    p.expiry.count === 0 ? (
                      <span className="text-teal-300">ไม่มีสต๊อก</span>
                    ) : !p.expiry.next ? (
                      <span className="text-teal-400">ไม่ระบุวันหมดอายุ · {p.expiry.count} ล็อต</span>
                    ) : (
                      <>
                        <span className="whitespace-nowrap">{shortDate(p.expiry.next)}</span>{" "}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${expiryStatus(p.expiry.next, today).className}`}>
                          {expiryStatus(p.expiry.next, today).label}
                        </span>
                        <span className="block text-xs text-teal-500">ล็อตที่หมดอายุก่อน · มี {p.expiry.count} ล็อต</span>
                      </>
                    )
                  ) : (
                    <span className="text-teal-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <IconLinkButton href={`/admin/inventory/stock/${p.id}`} icon={faEye} label={`ดูรายละเอียด ${p.name}`} />
                    <IconLinkButton href={`/admin/inventory/products/${p.id}`} icon={faPenToSquare} label={`แก้ไข ${p.name}`} />
                    <DeleteButton
                      action={deleteProduct.bind(null, p.id)}
                      confirmMessage={`ลบสินค้า "${p.name}"? (ถ้ามีประวัติแล้วจะปิดใช้งานแทน)`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-teal-400">
                  {active ? "ไม่พบสินค้าตามเงื่อนไขนี้" : "ยังไม่มีสินค้า — กด \"เพิ่มสินค้า\" เพื่อเริ่ม"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        total={filtered.length}
        page={current}
        size={size}
        onChange={(c) => {
          if (c.size !== undefined) setSize(c.size);
          setPage(c.page ?? 1);
        }}
      />
    </>
  );
}
