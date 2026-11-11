"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";

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
 * unchanged. The calendar button opens the browser's native picker.
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
  const pickerRef = useRef<HTMLInputElement>(null);

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

  function handlePicker(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.value; // ISO or ""
    setText(isoToDisplay(picked));
    emit(picked);
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el || disabled) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  }

  return (
    <div className="relative">
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
        onClick={openPicker}
        disabled={disabled}
        tabIndex={-1}
        aria-label="เลือกวันที่จากปฏิทิน"
        className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-teal-500 hover:text-teal-700 disabled:opacity-40"
      >
        <FontAwesomeIcon icon={faCalendarDays} className="text-sm" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={iso}
        min={min}
        max={max}
        onChange={handlePicker}
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
