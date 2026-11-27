// Fingerprint-scanner log (.txt exported from the time-clock software) ->
// per-employee daily timesheet. Pure functions, no I/O -- the page parses the
// file in the browser, nothing is uploaded or stored.
//
// A log line looks like:   "   1	     18	             2026-10-26 8:25:49  1 T"
//                           no.   user id  date time

export type Scan = { id: number; date: string; sec: number };

export type ParsedLog = {
  scans: Scan[];
  /** log lines that could not be read */
  skipped: number;
  /** exact repeats (same person, same second) that were dropped */
  duplicates: number;
};

export type DayRecord = {
  /** first scan before noon, seconds since midnight */
  in: number | null;
  /** last scan from noon on, seconds since midnight */
  out: number | null;
  /** every scan of the day, ascending */
  scans: number[];
};

export type EmployeeMonth = {
  id: number;
  /** day of month (1-31) -> record */
  days: Map<number, DayRecord>;
};

export type MonthSheet = {
  month: string; // YYYY-MM
  year: number;
  monthIndex: number; // 0-11
  daysInMonth: number;
  /** days (1-31) on which at least one person scanned */
  activeDays: Set<number>;
  employees: EmployeeMonth[];
};

/** Scans before this time of day count as "in", from it on as "out". */
export const NOON = 12 * 3600;

const LINE = /^\s*\d+\s+(\d+)\s+(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/;

export function parseFingerScan(text: string): ParsedLog {
  const scans: Scan[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let duplicates = 0;

  for (const line of text.split(/\r?\n/)) {
    // Only rows that start with the running number are log entries; the
    // header / footer lines ("Device No.1 Log = 528 ...") are ignored.
    if (!/^\s*\d+\s+\d+\s+\d{4}-/.test(line)) {
      if (/^\s*\d+\s+\d+\s/.test(line)) skipped++;
      continue;
    }
    const m = LINE.exec(line);
    if (!m) {
      skipped++;
      continue;
    }
    let year = Number(m[2]);
    if (year > 2400) year -= 543; // Buddhist-era export
    const month = Number(m[3]);
    const day = Number(m[4]);
    const h = Number(m[5]);
    const mi = Number(m[6]);
    const s = Number(m[7]);
    if (month < 1 || month > 12 || day < 1 || day > 31 || h > 23 || mi > 59 || s > 59) {
      skipped++;
      continue;
    }
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const sec = h * 3600 + mi * 60 + s;
    const id = Number(m[1]);
    const key = `${id}|${date}|${sec}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    scans.push({ id, date, sec });
  }
  return { scans, skipped, duplicates };
}

/** Months (YYYY-MM) present in the log, ascending. */
export function monthsOf(scans: Scan[]): string[] {
  return [...new Set(scans.map((s) => s.date.slice(0, 7)))].sort();
}

export function buildMonth(scans: Scan[], month: string): MonthSheet {
  const [year, mm] = month.split("-").map(Number);
  const monthIndex = mm - 1;
  const daysInMonth = new Date(year, mm, 0).getDate();

  const byEmployee = new Map<number, Map<number, number[]>>();
  const activeDays = new Set<number>();
  for (const s of scans) {
    if (!s.date.startsWith(month)) continue;
    const day = Number(s.date.slice(8, 10));
    activeDays.add(day);
    let days = byEmployee.get(s.id);
    if (!days) byEmployee.set(s.id, (days = new Map()));
    const list = days.get(day);
    if (list) list.push(s.sec);
    else days.set(day, [s.sec]);
  }

  const employees: EmployeeMonth[] = [...byEmployee.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, days]) => {
      const rec = new Map<number, DayRecord>();
      for (const [day, list] of days) {
        list.sort((a, b) => a - b);
        const mornings = list.filter((t) => t < NOON);
        const afternoons = list.filter((t) => t >= NOON);
        rec.set(day, {
          in: mornings.length ? mornings[0] : null,
          out: afternoons.length ? afternoons[afternoons.length - 1] : null,
          scans: list,
        });
      }
      return { id, days: rec };
    });

  return { month, year, monthIndex, daysInMonth, activeDays, employees };
}

export function weekdayOf(sheet: Pick<MonthSheet, "year" | "monthIndex">, day: number) {
  return new Date(sheet.year, sheet.monthIndex, day).getDay(); // 0 = Sunday
}

export const WEEKDAY_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

/** 30349 -> "08:25" */
export function fmtTime(sec: number | null | undefined) {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 30600 seconds -> "8:30" (hours:minutes) */
export function fmtDuration(sec: number) {
  const totalMin = Math.round(sec / 60);
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

/** "09:00" -> 32400 */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60;
}

/** Whole minutes after the start time (seconds are ignored: 9:06:58 is 6 min late; 9:00:xx is on time). */
export function lateMinutes(inSec: number | null, startSec: number | null): number {
  if (inSec == null || startSec == null) return 0;
  return Math.max(0, Math.floor(inSec / 60) - Math.floor(startSec / 60));
}

/** "2026-11-02" -> "2/11/26" -- day/month/2-digit year, the way the HR sheet writes it. */
export function fmtShortDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d}/${m}/${String(y).slice(2)}`;
}

export type DayRow = {
  id: number;
  in: number | null;
  out: number | null;
  late: number; // minutes
};

export type DayBlock = {
  date: string; // YYYY-MM-DD
  weekday: number;
  /** people who scanned, earliest first */
  rows: DayRow[];
  /** people seen elsewhere in the file with no scan on this day */
  absent: number[];
};

/** The month laid out like the HR sheet: one block per day that has scans. */
export function buildDayBlocks(sheet: MonthSheet, allIds: number[], startSec: number | null): DayBlock[] {
  const blocks: DayBlock[] = [];
  for (let day = 1; day <= sheet.daysInMonth; day++) {
    if (!sheet.activeDays.has(day)) continue;
    const rows: DayRow[] = [];
    const present = new Set<number>();
    for (const emp of sheet.employees) {
      const rec = emp.days.get(day);
      if (!rec) continue;
      present.add(emp.id);
      rows.push({ id: emp.id, in: rec.in, out: rec.out, late: lateMinutes(rec.in, startSec) });
    }
    rows.sort((a, b) => (a.in ?? a.out ?? 0) - (b.in ?? b.out ?? 0) || a.id - b.id);
    blocks.push({
      date: `${sheet.month}-${String(day).padStart(2, "0")}`,
      weekday: weekdayOf(sheet, day),
      rows,
      absent: allIds.filter((id) => !present.has(id)),
    });
  }
  return blocks;
}

export type EmployeeTotals = {
  id: number;
  daysPresent: number;
  /** days missing the in or the out scan */
  incomplete: number;
  lateDays: number;
  lateMinutes: number;
  /** summed (out - in) over complete days, seconds */
  workedSec: number;
};

export function totalsOf(emp: EmployeeMonth, startSec: number | null): EmployeeTotals {
  const t: EmployeeTotals = { id: emp.id, daysPresent: 0, incomplete: 0, lateDays: 0, lateMinutes: 0, workedSec: 0 };
  for (const rec of emp.days.values()) {
    t.daysPresent++;
    if (rec.in == null || rec.out == null) t.incomplete++;
    else t.workedSec += Math.max(0, rec.out - rec.in);
    const late = lateMinutes(rec.in, startSec);
    if (late > 0) {
      t.lateDays++;
      t.lateMinutes += late;
    }
  }
  return t;
}
