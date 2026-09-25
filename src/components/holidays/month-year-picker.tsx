"use client";

import { useRouter } from "next/navigation";

const THAI_MONTHS = [
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

/** Jump straight to a month/year -- navigates as soon as a select changes. */
export function MonthYearPicker({
  basePath,
  year,
  month,
  team,
  showMonth = true,
  selectClassName,
}: {
  basePath: string;
  year: number;
  month: number;
  /** Team filter to keep when jumping (back office). */
  team?: string;
  showMonth?: boolean;
  selectClassName: string;
}) {
  const router = useRouter();
  const go = (y: number, m: number) => {
    const q = new URLSearchParams({ view: showMonth ? "calendar" : "list", year: String(y), month: String(m) });
    if (team) q.set("team", team);
    router.push(`${basePath}?${q}`);
  };

  const years = Array.from({ length: 11 }, (_, i) => year - 5 + i);

  return (
    <div className="flex items-center gap-2">
      {showMonth && (
        <select
          aria-label="เลือกเดือน"
          value={month}
          onChange={(e) => go(year, Number(e.target.value))}
          className={selectClassName}
        >
          {THAI_MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="เลือกปี"
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        className={selectClassName}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y + 543}
          </option>
        ))}
      </select>
    </div>
  );
}
