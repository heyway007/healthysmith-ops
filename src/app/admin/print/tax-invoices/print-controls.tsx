"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faXmark } from "@fortawesome/free-solid-svg-icons";
import { startNavigationProgress } from "@/components/ui/navigation-progress";

export type Copies = "both" | "original" | "copy";

const selectClassName =
  "rounded-lg border border-teal-200 bg-white py-1.5 pl-3 pr-8 text-sm text-teal-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

/** Settings bar above the printout (hidden when printing). */
export function TaxInvoicePrintControls({
  copies,
  invoiceCount,
  sheetCount,
}: {
  copies: Copies;
  invoiceCount: number;
  sheetCount: number;
}) {
  const router = useRouter();

  const setCopies = (value: Copies) => {
    const q = new URLSearchParams(window.location.search);
    if (value === "both") q.delete("copies");
    else q.set("copies", value);
    startNavigationProgress();
    router.replace(`${window.location.pathname}?${q}`);
  };

  return (
    <div className="sticky top-0 z-10 border-b border-teal-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur print:hidden sm:px-8">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => window.close()}
          className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-800"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
          ปิด
        </button>
        <span className="text-sm text-teal-800">
          {invoiceCount.toLocaleString()} ใบ · {sheetCount.toLocaleString()} หน้า
        </span>
        <label className="flex items-center gap-2 text-sm text-teal-800">
          พิมพ์
          <select value={copies} onChange={(e) => setCopies(e.target.value as Copies)} className={selectClassName}>
            <option value="both">ต้นฉบับ + สำเนา</option>
            <option value="original">ต้นฉบับอย่างเดียว</option>
            <option value="copy">สำเนาอย่างเดียว</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={sheetCount === 0}
          className="ml-auto flex items-center gap-2 rounded-lg border border-orange-600/40 bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPrint} />
          พิมพ์ / บันทึก PDF
        </button>
      </div>
    </div>
  );
}
