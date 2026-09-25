"use client";

import { useTransition } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";

export function DeleteButton({
  action,
  confirmMessage,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
}) {
  const [pending, startTransition] = useTransition();

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
      className="rounded-full border border-orange-200 p-1.5 text-orange-500 transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-wait disabled:opacity-50"
      title={pending ? "กำลังลบ..." : "ลบ"}
      aria-busy={pending}
    >
      <FontAwesomeIcon icon={pending ? faSpinner : faTrash} spin={pending} />
    </button>
  );
}
