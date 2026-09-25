"use client";

import { SubmitButton } from "@/components/ui/submit-button";

/** Submit button that asks for confirmation first, then shows a spinner while the action runs. */
export function ConfirmSubmit({
  message,
  className,
  pendingLabel = "กำลังลบ...",
  children,
}: {
  message: string;
  className: string;
  pendingLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <SubmitButton
      className={className}
      pendingLabel={pendingLabel}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </SubmitButton>
  );
}
