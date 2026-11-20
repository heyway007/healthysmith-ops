"use client";

import { useTransition } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { DisabledIconButton } from "@/components/ui/row-actions";

export function DeleteButton({
  action,
  confirmMessage,
  disabledReason,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  /** when set, the button can't be pressed and this is its tooltip */
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  if (disabledReason) return <DisabledIconButton icon={faTrash} label={disabledReason} />;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(confirmMessage)) {
          startTransition(() => action());
        }
      }}
      className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-orange-200 text-orange-500 transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-wait disabled:opacity-50"
      title={pending ? "กำลังลบ..." : "ลบ"}
      aria-label="ลบ"
      aria-busy={pending}
    >
      <FontAwesomeIcon icon={pending ? faSpinner : faTrash} spin={pending} />
    </button>
  );
}
