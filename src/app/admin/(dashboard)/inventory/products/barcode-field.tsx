"use client";

import { useRef } from "react";
import { BarcodeScanButton } from "@/components/inventory/barcode-scanner";

/**
 * The product's barcode box with a "สแกน" button: point the phone camera at the
 * barcode printed on the package and the number is filled in. (A barcode names the
 * product only -- the Lot / expiry date are not in it; those are entered on รับเข้า.)
 */
export function BarcodeField({ defaultValue }: { defaultValue?: string | null }) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm font-medium text-teal-800" htmlFor="barcode">
        บาร์โค้ด (ถ้ามี)
      </label>
      <div className="mt-1 flex gap-2">
        <input
          ref={input}
          id="barcode"
          name="barcode"
          defaultValue={defaultValue ?? undefined}
          autoComplete="off"
          inputMode="numeric"
          className="w-full min-w-0 rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
        <BarcodeScanButton
          once
          label="สแกน"
          onScan={(code) => {
            if (input.current) input.current.value = code.trim();
            return { ok: true, message: "ใส่บาร์โค้ดในฟอร์มแล้ว" };
          }}
        />
      </div>
    </div>
  );
}
