"use client";

import { useEffect, useRef } from "react";
import { BarcodeScanButton, findByBarcode, type ScanFeedback } from "@/components/inventory/barcode-scanner";
import { formatQty } from "../labels";

type ScanProduct = { id: string; sku: string; name: string; unit: string; barcode: string | null };

/**
 * "สแกนบาร์โค้ด" for the stock-count sheet: every scan adds 1 to the "นับได้จริง"
 * box of that product, so counting = pointing the camera at each item. The boxes
 * are the plain inputs rendered by the page (`data-count-product`); a
 * lot-tracked product has one box per lot, so tap the lot's box first -- scans of
 * that product then keep going to the box last touched (the first lot otherwise).
 */
export function CountScanner({ products }: { products: ScanProduct[] }) {
  const lastBox = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target;
      if (el instanceof HTMLInputElement && el.dataset.countProduct) lastBox.current.set(el.dataset.countProduct, el);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  const handleScan = (code: string): ScanFeedback => {
    const product = findByBarcode(products, code);
    if (!product) return { ok: false, message: "ไม่อยู่ในรายการนับ — ตรวจบาร์โค้ดสินค้า หรือตัวกรองค้นหา/ประเภทที่เลือกอยู่" };

    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-count-product="${product.id}"]`));
    const remembered = lastBox.current.get(product.id);
    const box = remembered && boxes.includes(remembered) ? remembered : boxes[0];
    if (!box) return { ok: false, message: `${product.sku} — ไม่มีช่องนับของสินค้านี้` };

    const qty = (Number(box.value) || 0) + 1;
    box.value = String(qty);
    lastBox.current.set(product.id, box);
    box.scrollIntoView({ block: "center", behavior: "smooth" });
    box.classList.add("bg-emerald-100");
    setTimeout(() => box.classList.remove("bg-emerald-100"), 600);

    const lot = box.dataset.countLot;
    const hint = boxes.length > 1 && !remembered ? " · มีหลายล็อต — แตะช่องของล็อตที่ต้องการก่อนสแกน" : "";
    return {
      ok: true,
      message: `${product.sku} ${product.name}${lot ? ` ล็อต ${lot}` : ""} · นับได้ ${formatQty(qty)} ${product.unit}${hint}`,
    };
  };

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <BarcodeScanButton onScan={handleScan} />
      <span className="text-xs text-teal-600">สแกนด้วยกล้องมือถือ — สแกนทีละชิ้น ระบบบวกจำนวนที่นับได้ให้ทีละ 1 (แก้ตัวเลขเองได้)</span>
    </div>
  );
}
