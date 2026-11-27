"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faSpinner, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import type { SaveResult } from "./actions";

/**
 * The <form> of the employee form plus its save / cancel row. Submits through
 * the server action by hand (instead of <form action>) so that:
 *  - the button shows a spinner while saving,
 *  - a failed save pops up an alert and keeps everything the user typed
 *    (a form action would reset the fields),
 *  - a successful save stays on the page and shows a green "saved" message
 *    (creating redirects to the new employee's page with `notice`).
 */
export function EmployeeFormShell({
  action,
  submitLabel,
  notice,
  children,
}: {
  action: (formData: FormData) => Promise<SaveResult>;
  submitLabel: string;
  /** success message carried over from a redirect (e.g. right after creating) */
  notice?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(notice ?? null);

  // The success message fades away on its own; errors stay until closed.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(null), 5000);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <>
      {saved && (
        <div
          role="status"
          className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg"
        >
          <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">บันทึกสำเร็จ</p>
            <p className="mt-0.5 break-words">{saved}</p>
          </div>
          <button
            type="button"
            onClick={() => setSaved(null)}
            aria-label="ปิด"
            className="shrink-0 text-emerald-400 hover:text-emerald-700"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-lg"
        >
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">บันทึกไม่สำเร็จ</p>
            <p className="mt-0.5 break-words">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="ปิด"
            className="shrink-0 text-rose-400 hover:text-rose-700"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const data = new FormData(e.currentTarget);
          setError(null);
          setSaved(null);
          startTransition(async () => {
            try {
              // Creating redirects (and never returns); editing returns a message or an error.
              const res = await action(data);
              if (res?.error) setError(res.error);
              else if (res?.message) setSaved(res.message);
            } catch {
              setError("เชื่อมต่อไม่ได้ ลองบันทึกอีกครั้ง");
            }
          });
        }}
      >
        {children}

        <div className="flex flex-wrap items-center gap-4 border-t border-teal-100 pt-5">
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={`${submitButtonClassName} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70`}
          >
            {pending ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                กำลังบันทึก...
              </>
            ) : (
              submitLabel
            )}
          </button>
          <Link href="/admin/hr" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </>
  );
}
