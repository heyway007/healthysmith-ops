"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const inputClassName =
  "mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

const thaiDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Adding: a single "วันที่". Editing: "จากวันที่" (current, read-only) →
 * "เป็นวันที่" (new date), so moving a holiday reads as a move.
 */
export function HolidayDateFields({ defaultDate, originalDate }: { defaultDate?: string; originalDate?: string }) {
  const [date, setDate] = useState(originalDate ?? defaultDate ?? "");

  if (!originalDate) {
    return (
      <div>
        <label className="block text-sm font-medium text-teal-800" htmlFor="holiday_date">
          วันที่
        </label>
        <input
          id="holiday_date"
          name="holiday_date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClassName}
        />
      </div>
    );
  }

  const moved = !!date && date !== originalDate;

  return (
    <div>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <span className="block text-sm font-medium text-teal-800">จากวันที่</span>
          <p className="mt-1 rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm text-teal-900">
            {thaiDate(originalDate)}
          </p>
        </div>
        <FontAwesomeIcon icon={faArrowRight} className="hidden pb-3 text-teal-400 sm:block" />
        <div>
          <label className="block text-sm font-medium text-teal-800" htmlFor="holiday_date">
            เป็นวันที่
          </label>
          <input
            id="holiday_date"
            name="holiday_date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClassName} ${moved ? "border-orange-400 bg-orange-50" : ""}`}
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-teal-600">
        {moved
          ? `จะย้ายจาก ${thaiDate(originalDate)} เป็น ${thaiDate(date)}`
          : "ต้องการย้ายวัน ให้เลือกวันที่ใหม่ในช่อง \"เป็นวันที่\""}
      </p>
    </div>
  );
}
