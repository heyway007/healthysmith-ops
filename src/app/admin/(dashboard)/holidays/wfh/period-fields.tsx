"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { selectClassName } from "@/lib/ui-classes";

/**
 * "ทั้งปี" (default) applies to Jan 1 – Dec 31 of the chosen year; unticking
 * it reveals a custom start/end date range instead.
 */
export function PeriodFields({ year, start, end }: { year: number; start: string; end: string }) {
  const [wholeYear, setWholeYear] = useState(true);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-teal-800 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50">
          <input
            type="checkbox"
            name="whole_year"
            checked={wholeYear}
            onChange={(e) => setWholeYear(e.target.checked)}
            className="accent-teal-600"
          />
          ทั้งปี
        </label>
        {wholeYear && (
          <select name="year" defaultValue={year} aria-label="ปี" className={`mt-0! w-32 ${selectClassName}`}>
            {[year - 1, year, year + 1, year + 2].map((y) => (
              <option key={y} value={y}>
                พ.ศ. {y + 543}
              </option>
            ))}
          </select>
        )}
      </div>

      {wholeYear ? (
        <p className="text-xs text-teal-600">ใช้ตั้งแต่ 1 ม.ค. ถึง 31 ธ.ค. ของปีที่เลือก — ไม่ต้องเลือกวันที่</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ตั้งแต่วันที่" name="start_date" type="date" required defaultValue={start} />
          <Field label="ถึงวันที่" name="end_date" type="date" required defaultValue={end} />
        </div>
      )}
    </div>
  );
}
