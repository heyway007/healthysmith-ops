"use client";

import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

/**
 * Submit button that shows a spinner and disables itself while its form's
 * server action runs -- so slow saves are visible and can't be double-sent.
 */
export function SubmitButton({
  className,
  pendingLabel = "กำลังบันทึก...",
  onClick,
  children,
}: {
  className: string;
  pendingLabel?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
      className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        <>
          <FontAwesomeIcon icon={faSpinner} spin />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <FontAwesomeIcon icon={faSpinner} spin className={className} />;
}
