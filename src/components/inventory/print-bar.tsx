"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faXmark } from "@fortawesome/free-solid-svg-icons";

/** Bar above an inventory printout (hidden when printing). `children` = extra options. */
export function PrintBar({
  summary,
  canPrint,
  children,
}: {
  summary: string;
  canPrint: boolean;
  children?: React.ReactNode;
}) {
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
        <span className="text-sm text-teal-800">{summary}</span>
        {children}
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!canPrint}
          className="ml-auto flex items-center gap-2 rounded-lg border border-orange-600/40 bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPrint} />
          พิมพ์ / บันทึก PDF
        </button>
      </div>
    </div>
  );
}
