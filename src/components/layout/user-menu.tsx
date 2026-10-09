"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import { logout } from "@/app/login/actions";
import type { CurrentEmployee } from "@/lib/current-employee";

const itemClassName =
  "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-mist-700 transition-colors hover:bg-mist-100 hover:text-mist-900";

/** Signed-in account menu on the right of the portal header: name → profile + sign out. */
export function UserMenu({ employee }: { employee: CurrentEmployee | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const fullName = employee
    ? `${employee.prefix_name ?? ""}${employee.first_name} ${employee.last_name}`
    : "บัญชีของฉัน";
  const initial = employee?.first_name.charAt(0) ?? "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-mist-200 bg-white py-1 pl-1 pr-3 text-sm text-mist-700 transition-colors hover:border-mist-400 hover:text-mist-900"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-800 text-xs font-semibold text-white">
          {initial || <FontAwesomeIcon icon={faUser} />}
        </span>
        <span className="hidden max-w-48 truncate md:inline">{fullName}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-xs text-mist-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-mist-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-mist-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-mist-900">{fullName}</p>
            {employee && <p className="mt-0.5 text-xs text-mist-500">รหัสพนักงาน {employee.employee_code}</p>}
          </div>
          <Link href="/profile" role="menuitem" onClick={() => setOpen(false)} className={itemClassName}>
            <FontAwesomeIcon icon={faUser} className="w-4 text-mist-500" />
            โปรไฟล์ของฉัน
          </Link>
          <form action={logout} className="border-t border-mist-100">
            <button type="submit" role="menuitem" className={`${itemClassName} hover:text-red-600`}>
              <FontAwesomeIcon icon={faRightFromBracket} className="w-4 text-mist-500" />
              ออกจากระบบ
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
