"use client";

import { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan } from "@fortawesome/free-solid-svg-icons";
import { dangerButtonClassName, secondaryButtonClassName } from "@/lib/ui-classes";
import { SubmitButton } from "@/components/ui/submit-button";
import { cancelStockDocument } from "@/app/admin/(dashboard)/inventory/movements/actions";

/**
 * Round icon button (same size as the other row actions) that opens a dialog
 * asking for the reason, then cancels the whole IN / OUT document.
 */
export function CancelStockDocumentButton({
  docNumber,
  returnTo,
  showLabel,
  disabledReason,
}: {
  docNumber: string;
  returnTo: string;
  /** a labelled button instead of the round icon */
  showLabel?: boolean;
  /** when set, the button is shown greyed out (this is the tooltip) and can't be pressed */
  disabledReason?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (disabledReason) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        aria-label={disabledReason}
        className="flex h-[30px] w-[30px] cursor-not-allowed items-center justify-center rounded-full border border-gray-200 text-gray-300"
      >
        <FontAwesomeIcon icon={faBan} />
      </button>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        title={`ยกเลิกเอกสาร ${docNumber}`}
        aria-label={`ยกเลิกเอกสาร ${docNumber}`}
        className={
          showLabel
            ? `flex items-center gap-2 ${dangerButtonClassName}`
            : "flex h-[30px] w-[30px] items-center justify-center rounded-full border border-rose-200 text-rose-500 transition-colors hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700"
        }
      >
        <FontAwesomeIcon icon={faBan} />
        {showLabel && "ยกเลิกเอกสาร"}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-rose-100 bg-white p-0 text-left shadow-xl backdrop:bg-black/40"
      >
        <form action={cancelStockDocument.bind(null, docNumber, returnTo)} className="flex flex-col gap-3 p-5">
          <h3 className="text-base font-semibold text-teal-950">ยกเลิกเอกสาร {docNumber}</h3>
          <p className="text-sm text-teal-700">ยกเลิกทั้งใบ ระบบจะบันทึกรายการกลับสต๊อกให้ และใบเดิมยังเก็บไว้เป็นประวัติ</p>
          <label className="flex flex-col gap-1 text-sm font-medium text-teal-900">
            เหตุผลที่ยกเลิก
            <input
              name="reason"
              required
              autoFocus
              placeholder="เช่น บันทึกซ้ำ"
              className="rounded-lg border border-teal-300 px-3 py-2 font-normal focus:border-teal-600 focus:outline-none"
            />
          </label>
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className={secondaryButtonClassName}>
              ไม่ยกเลิก
            </button>
            <SubmitButton className={dangerButtonClassName} pendingLabel="กำลังยกเลิก...">
              ยืนยันยกเลิกทั้งใบ
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
