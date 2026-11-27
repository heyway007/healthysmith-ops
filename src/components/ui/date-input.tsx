"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleLeft,
  faAngleRight,
  faAnglesLeft,
  faAnglesRight,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";

/** "2026-11-11" -> "11/11/2026" ("" when not a full ISO date). */
function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** "11/11/2026" -> "2026-11-11"; "" when incomplete or not a real calendar date. */
function displayToIso(text: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  const ok =
    d.getUTCFullYear() === Number(yyyy) && d.getUTCMonth() === Number(mm) - 1 && d.getUTCDate() === Number(dd);
  return ok ? `${yyyy}-${mm}-${dd}` : "";
}

/** Keep only digits and re-insert the slashes as the user types: 11112026 -> 11/11/2026. */
function maskTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const pad = (n: number) => String(n).padStart(2, "0");
/** month is 0-based */
const toIso = (y: number, month: number, d: number) => `${y}-${pad(month + 1)}-${pad(d)}`;
const todayIso = () => {
  const n = new Date();
  return toIso(n.getFullYear(), n.getMonth(), n.getDate());
};

const POPUP_HEIGHT = 372; // for deciding whether it fits below the field

/**
 * Our own calendar (many mobile browsers refuse to open the native date picker
 * from a script). Rendered in a portal with fixed positioning so it isn't
 * clipped by scrolling tables.
 */
function CalendarPopup({
  anchorRef,
  value,
  min,
  max,
  onPick,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  value: string;
  min?: string;
  max?: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso();
    return { y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 };
  });
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(296, window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const fitsBelow = r.bottom + 4 + POPUP_HEIGHT <= window.innerHeight;
      const top = fitsBelow || r.top - POPUP_HEIGHT - 4 < 8 ? r.bottom + 4 : r.top - POPUP_HEIGHT - 4;
      setPos({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popupRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  const shift = (months: number) =>
    setView((v) => {
      const t = v.y * 12 + v.m + months;
      return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
    });

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = todayIso();
  const outOfRange = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const navBtn = "flex h-9 w-9 items-center justify-center rounded-md text-teal-700 hover:bg-teal-50";

  return createPortal(
    <div
      ref={popupRef}
      role="dialog"
      aria-label="เลือกวันที่"
      style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: "hidden" }}
      className="fixed z-[1000] rounded-xl border border-teal-200 bg-white p-2 shadow-lg"
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex">
          <button type="button" onClick={() => shift(-12)} aria-label="ปีก่อนหน้า" className={navBtn}>
            <FontAwesomeIcon icon={faAnglesLeft} className="text-xs" />
          </button>
          <button type="button" onClick={() => shift(-1)} aria-label="เดือนก่อนหน้า" className={navBtn}>
            <FontAwesomeIcon icon={faAngleLeft} className="text-xs" />
          </button>
        </div>
        <div className="text-sm font-medium text-teal-900">
          {MONTHS[view.m]} {view.y}
        </div>
        <div className="flex">
          <button type="button" onClick={() => shift(1)} aria-label="เดือนถัดไป" className={navBtn}>
            <FontAwesomeIcon icon={faAngleRight} className="text-xs" />
          </button>
          <button type="button" onClick={() => shift(12)} aria-label="ปีถัดไป" className={navBtn}>
            <FontAwesomeIcon icon={faAnglesRight} className="text-xs" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-teal-600">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const iso = toIso(view.y, view.m, d);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={outOfRange(iso)}
              onClick={() => onPick(iso)}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${
                selected
                  ? "bg-teal-600 font-medium text-white"
                  : iso === today
                    ? "border border-teal-400 text-teal-800 hover:bg-teal-50"
                    : "text-gray-800 hover:bg-teal-50"
              } disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent`}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-teal-100 pt-1.5 text-sm">
        <button type="button" onClick={() => onPick("")} className="rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-50">
          ล้างค่า
        </button>
        <button
          type="button"
          disabled={outOfRange(today)}
          onClick={() => onPick(today)}
          className="rounded-md px-3 py-1.5 font-medium text-teal-700 hover:bg-teal-50 disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          วันนี้
        </button>
      </div>
    </div>,
    document.body,
  );
}

type DateInputProps = {
  id?: string;
  name?: string;
  /** controlled value, ISO yyyy-mm-dd */
  value?: string;
  /** uncontrolled initial value, ISO yyyy-mm-dd */
  defaultValue?: string | null;
  /** called with an event whose `target.value` is the ISO date ("" when cleared / incomplete) */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Drop-in replacement for <input type="date"> that always shows and accepts
 * วัน / เดือน / ปี (dd/mm/yyyy) regardless of the browser's locale. The form
 * still receives an ISO yyyy-mm-dd value (via a hidden input), so server code is
 * unchanged. The calendar button opens a built-in calendar.
 */
export function DateInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  min,
  max,
  className = "",
  "aria-label": ariaLabel,
}: DateInputProps) {
  const controlled = value !== undefined;
  const [text, setText] = useState(() => isoToDisplay((controlled ? value : defaultValue) ?? ""));
  const iso = displayToIso(text);
  const textRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Follow external changes of a controlled value (but don't fight the user's partial typing).
  const [prevValue, setPrevValue] = useState(value);
  if (controlled && value !== prevValue) {
    setPrevValue(value);
    if (value !== iso) setText(isoToDisplay(value));
  }

  // Native validity so `required` and half-typed dates block form submission with a clear message.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    if (text && !iso) el.setCustomValidity("กรอกวันที่ให้ถูกต้อง รูปแบบ วว/ดด/ปปปป");
    else if (min && iso && iso < min) el.setCustomValidity(`วันที่ต้องไม่ก่อน ${isoToDisplay(min)}`);
    else if (max && iso && iso > max) el.setCustomValidity(`วันที่ต้องไม่เกิน ${isoToDisplay(max)}`);
    else el.setCustomValidity("");
  }, [text, iso, min, max]);

  function emit(nextIso: string) {
    onChange?.({ target: { id, name, value: nextIso }, currentTarget: { id, name, value: nextIso } } as unknown as React.ChangeEvent<HTMLInputElement>);
  }

  function handleText(e: React.ChangeEvent<HTMLInputElement>) {
    const next = maskTyping(e.target.value);
    setText(next);
    emit(displayToIso(next));
  }

  function handlePick(picked: string) {
    setText(isoToDisplay(picked));
    emit(picked);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={textRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="วว/ดด/ปปปป"
        maxLength={10}
        value={text}
        onChange={handleText}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`${className} pr-9`}
      />
      {name && <input type="hidden" name={name} value={iso} disabled={disabled} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        tabIndex={-1}
        aria-label="เลือกวันที่จากปฏิทิน"
        aria-expanded={open}
        className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-teal-500 hover:text-teal-700 disabled:opacity-40"
      >
        <FontAwesomeIcon icon={faCalendarDays} className="text-sm" />
      </button>
      {open && (
        <CalendarPopup
          anchorRef={wrapRef}
          value={iso}
          min={min}
          max={max}
          onPick={handlePick}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
