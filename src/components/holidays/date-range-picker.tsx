"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { startNavigationProgress } from "@/components/ui/navigation-progress";

// The period label in the calendar toolbar doubles as a date-range picker:
// click it, pick a start day and an end day in the popover, then apply. The
// page then shows every month the range covers (up to 12).

const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const MAX_MONTHS = 12;
const POPOVER_WIDTH = 640; // matches w-[min(40rem,…)] below

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const thai = (date: string, o: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("th-TH", { ...o, timeZone: "UTC" });
const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const monthsBetween = (a: string, b: string) =>
  (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7))) + 1;

export type RangePickerTheme = {
  text: string;
  muted: string;
  button: string; // trigger + small nav buttons
  panel: string; // popover card
  endpoint: string; // start / end day
  between: string; // days inside the range
  primary: string; // apply button
  secondary: string; // presets / clear
};

export function DateRangePicker({
  view: currentView,
  basePath,
  label,
  range,
  initialYear,
  initialMonth,
  keepParams,
  theme,
}: {
  /** Calendar or list -- kept when applying a range. */
  view: string;
  basePath: string;
  label: string;
  range?: { from: string; to: string };
  initialYear: number;
  initialMonth: number;
  /** Other filters (team / type) kept when applying. */
  keepParams: Record<string, string | undefined>;
  theme: RangePickerTheme;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: initialYear, month: initialMonth });
  const [start, setStart] = useState<string | undefined>(range?.from);
  const [end, setEnd] = useState<string | undefined>(range?.to);
  const [hover, setHover] = useState<string>();
  // Popover left offset (px, relative to the trigger) so it always fits on screen.
  const [popLeft, setPopLeft] = useState(0);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      // Reopen on what the page is showing.
      setView({ year: initialYear, month: initialMonth });
      setStart(range?.from);
      setEnd(range?.to);
      // Centre under the trigger, but slide left/right to stay 16px inside the viewport
      // (the trigger sits at the far right of the toolbar on wide screens).
      if (box.current) {
        const rect = box.current.getBoundingClientRect();
        const margin = 16;
        const width = Math.min(POPOVER_WIDTH, window.innerWidth - margin * 2);
        const centred = rect.left + rect.width / 2 - width / 2;
        const clamped = Math.min(Math.max(centred, margin), window.innerWidth - margin - width);
        setPopLeft(clamped - rect.left);
      }
    }
    setOpen(!open);
  };

  const pick = (date: string) => {
    if (!start || end) {
      setStart(date);
      setEnd(undefined);
    } else if (date < start) {
      setEnd(start);
      setStart(date);
    } else {
      setEnd(date);
    }
  };

  const apply = (from: string, to: string) => {
    const q = new URLSearchParams({ view: currentView, from, to });
    for (const [k, v] of Object.entries(keepParams)) if (v) q.set(k, v);
    setOpen(false);
    startNavigationProgress();
    router.push(`${basePath}?${q}`);
  };

  const today = bangkokToday();
  const [ty, tm] = today.split("-").map(Number);
  const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const shift = (y: number, m: number, d: number) => {
    const i = y * 12 + (m - 1) + d;
    return { year: Math.floor(i / 12), month: (i % 12) + 1 };
  };
  const presets = [
    { label: "เดือนนี้", from: iso(ty, tm, 1), to: iso(ty, tm, lastDay(ty, tm)) },
    (() => {
      const e = shift(ty, tm, 2);
      return { label: "3 เดือน", from: iso(ty, tm, 1), to: iso(e.year, e.month, lastDay(e.year, e.month)) };
    })(),
    { label: "ปีนี้", from: `${ty}-01-01`, to: `${ty}-12-31` },
  ];

  // Two months side by side: the viewed month on the left, the next on the right.
  const { year, month } = view;
  const second = shift(year, month, 1);
  const previewEnd = end ?? (start && hover && hover > start ? hover : undefined);
  const tooLong = !!(start && end && monthsBetween(start, end) > MAX_MONTHS);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="เลือกช่วงวันที่"
        className={`flex min-w-40 items-center justify-center gap-2 rounded-lg px-2 py-1 text-lg font-semibold ${theme.text} ${theme.button}`}
      >
        {label}
        <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5 opacity-50" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกช่วงวันที่"
          style={{ left: popLeft }}
          className={`absolute top-full z-40 mt-2 w-[min(40rem,calc(100vw-2rem))] p-4 shadow-lg ${theme.panel}`}
        >
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => apply(p.from, p.to)} className={theme.secondary}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative mt-3 grid gap-6 sm:grid-cols-2" onMouseLeave={() => setHover(undefined)}>
            {[view, second].map((mv, idx) => (
              <MonthGrid
                key={`${mv.year}-${mv.month}`}
                year={mv.year}
                month={mv.month}
                start={start}
                end={end}
                previewEnd={previewEnd}
                today={today}
                theme={theme}
                onPick={pick}
                onHover={setHover}
                prev={idx === 0 ? () => setView(shift(year, month, -1)) : undefined}
                next={idx === 1 ? () => setView(shift(year, month, 1)) : undefined}
              />
            ))}
          </div>

          <div className={`mt-3 border-t pt-3 text-sm ${theme.muted}`}>
            <p>
              <span className="inline-block w-14">เริ่ม</span>
              <span className={theme.text}>{start ? thai(start, { day: "numeric", month: "short", year: "numeric" }) : "— เลือกวันแรก"}</span>
            </p>
            <p>
              <span className="inline-block w-14">สิ้นสุด</span>
              <span className={theme.text}>{end ? thai(end, { day: "numeric", month: "short", year: "numeric" }) : start ? "— เลือกวันสุดท้าย" : "—"}</span>
            </p>
            {tooLong && <p className="mt-1 text-xs text-red-600">เลือกได้ไม่เกิน {MAX_MONTHS} เดือน</p>}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setStart(undefined);
                setEnd(undefined);
              }}
              className={theme.secondary}
            >
              ล้าง
            </button>
            <button
              type="button"
              disabled={!start || tooLong}
              onClick={() => start && apply(start, end ?? start)}
              className={`${theme.primary} disabled:opacity-40`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** One month of the picker; the left one carries the "previous" arrow, the right one "next". */
function MonthGrid({
  year,
  month,
  start,
  end,
  previewEnd,
  today,
  theme,
  onPick,
  onHover,
  prev,
  next,
}: {
  year: number;
  month: number;
  start?: string;
  end?: string;
  previewEnd?: string;
  today: string;
  theme: RangePickerTheme;
  onPick: (date: string) => void;
  onHover: (date: string) => void;
  prev?: () => void;
  next?: () => void;
}) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const navClass = `flex h-8 w-8 items-center justify-center rounded-lg ${theme.button}`;

  return (
    <div>
      <div className="flex h-8 items-center justify-between">
        {prev ? (
          <button type="button" onClick={prev} className={navClass} aria-label="เดือนก่อนหน้า">
            <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
          </button>
        ) : (
          <span className="w-8" />
        )}
        <span className={`font-semibold ${theme.text}`}>
          {thai(iso(year, month, 1), { month: "long" })} {year + 543}
        </span>
        {next ? (
          <button type="button" onClick={next} className={navClass} aria-label="เดือนถัดไป">
            <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      <div className={`mt-2 grid grid-cols-7 text-center text-xs ${theme.muted}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="h-9" />;
          const date = iso(year, month, d);
          const isEndpoint = date === start || date === end;
          const between = !!(start && previewEnd && date > start && date < previewEnd);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              onMouseEnter={() => onHover(date)}
              className={`h-9 text-sm transition-colors ${
                isEndpoint
                  ? `rounded-lg font-semibold ${theme.endpoint}`
                  : between
                    ? `${theme.between} ${theme.text}`
                    : `rounded-lg ${theme.text} ${theme.button}`
              } ${date === today && !isEndpoint ? "font-bold underline underline-offset-4" : ""}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
