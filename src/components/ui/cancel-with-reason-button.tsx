"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan } from "@fortawesome/free-solid-svg-icons";
import { dangerButtonClassName, secondaryButtonClassName } from "@/lib/ui-classes";
import { SubmitButton } from "@/components/ui/submit-button";
import { DisabledIconButton } from "@/components/ui/row-actions";

/**
 * Round "ยกเลิก" icon button for list rows: opens a dialog that asks for the
 * reason, then runs `action` (a server action that reads the reason from the
 * form field `reasonName`). With `disabledReason` it is shown greyed out.
 * The dialog is rendered into <body> (portal): the button often sits inside
 * another <form> (e.g. the "print selected" form of the document lists) and a
 * <form> can't be nested in a <form>.
 */
export function CancelWithReasonButton({
  action,
  title,
  description,
  label,
  submitLabel = "ยืนยันยกเลิก",
  reasonName = "reason",
  reasonPlaceholder = "เช่น บันทึกผิด",
  disabledReason,
  showLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** dialog heading, e.g. "ยกเลิกเอกสาร IN26-0001" */
  title: string;
  description?: string;
  /** tooltip / accessible name of the icon */
  label: string;
  submitLabel?: string;
  reasonName?: string;
  reasonPlaceholder?: string;
  /** when set, the button can't be pressed and this is its tooltip */
  disabledReason?: string;
  /** a labelled button instead of the round icon */
  showLabel?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);
  if (disabledReason) return <DisabledIconButton icon={faBan} label={disabledReason} />;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className={
          showLabel
            ? `flex items-center gap-2 ${dangerButtonClassName}`
            : "flex h-[30px] w-[30px] items-center justify-center rounded-full border border-rose-200 text-rose-500 transition-colors hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700"
        }
      >
        <FontAwesomeIcon icon={faBan} />
        {showLabel && label}
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            onClose={() => setOpen(false)}
            className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-rose-100 bg-white p-0 text-left shadow-xl backdrop:bg-black/40"
          >
            <form action={action} className="flex flex-col gap-3 p-5">
              <h3 className="text-base font-semibold text-teal-950">{title}</h3>
              {description && <p className="text-sm text-teal-700">{description}</p>}
              <label className="flex flex-col gap-1 text-sm font-medium text-teal-900">
                เหตุผลที่ยกเลิก
                <input
                  name={reasonName}
                  required
                  autoFocus
                  placeholder={reasonPlaceholder}
                  className="rounded-lg border border-teal-300 px-3 py-2 font-normal focus:border-teal-600 focus:outline-none"
                />
              </label>
              <div className="mt-1 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className={secondaryButtonClassName}>
                  ไม่ยกเลิก
                </button>
                <SubmitButton className={dangerButtonClassName} pendingLabel="กำลังยกเลิก...">
                  {submitLabel}
                </SubmitButton>
              </div>
            </form>
          </dialog>,
          document.body,
        )}
    </>
  );
}
