import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faList,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { HOLIDAY_TYPES } from "@/lib/holiday-types";
import type { Database } from "@/types/database.types";
import { DateRangePicker } from "./date-range-picker";
import { DayButton, DaySelection, SelectDateButton, SelectedPanel } from "./day-selection";

// Shared list / month-calendar views for company holidays, used by both the
// employee portal (read-only, mist grey) and the HR back office (editable, teal).

export type Holiday = Database["public"]["Tables"]["company_holidays"]["Row"];
export type HolidayView = "calendar" | "list";
/** How many months the calendar view shows at once (12 = the whole year, starting in January). */
export type MonthSpan = 1 | 2 | 3 | 4 | 12;
const MONTH_SPANS: MonthSpan[] = [1, 2, 3, 4, 12];
const spanName = (n: MonthSpan) => (n === 12 ? "ทั้งปี" : `${n} เดือน`);

/** List/calendar type filter: only public holidays (default), only WFH, or all. */
export type HolidayTypeFilter = "holiday" | "wfh" | "all";

/** Default type filter (no ?type= in the URL): public holidays only. */
export const DEFAULT_TYPE: HolidayTypeFilter = "holiday";

/** Does an entry pass the type filter? */
export const matchesType = (entryType: string, filter: HolidayTypeFilter) => filter === "all" || entryType === filter;

export type HolidayTheme = {
  card: string;
  headerRow: string;
  divider: string;
  text: string;
  muted: string;
  navBox: string;
  navButton: string;
  select: string;
  /** Segmented button groups (view / type): the frame, the selected and the idle button. */
  toggleGroup: string;
  toggleActive: string;
  toggleIdle: string;
  /** "Today" ring colour (black outline circle around the date) and its hover fill. */
  today: string;
  selected: string;
  cellHover: string;
  panel: string;
  icon: string;
  /** Badge for company-wide entries / for a team's entries. */
  companyTag: string;
  teamTag: string;
  /** Colours per entry type (holiday / wfh): cell tint, dot, label text, badge. */
  types: Record<string, TypeStyle>;
};

export type TypeStyle = { cell: string; dot: string; label: string; badge: string };

/** Entry-type colours, identical in the front and back office: holidays red, WFH blue. */
export const TYPE_COLORS: Record<string, TypeStyle> = {
  holiday: { cell: "bg-red-100", dot: "bg-red-500", label: "text-red-700", badge: "bg-red-50 text-red-700" },
  wfh: { cell: "bg-sky-50", dot: "bg-sky-500", label: "text-sky-700", badge: "bg-sky-50 text-sky-700" },
};

export const HOLIDAY_THEMES = {
  // Palette A "mist grey" -- colours registered in globals.css.
  portal: {
    card: "rounded-2xl border border-mist-200 bg-white shadow-sm",
    headerRow: "bg-mist-150 text-mist-500",
    divider: "border-mist-200",
    text: "text-mist-900",
    muted: "text-mist-500",
    navBox: "border-mist-200 bg-white",
    navButton: "text-mist-700 hover:bg-mist-150",
    select:
      "rounded-lg border border-mist-300 bg-white py-2 pl-3 pr-8 text-sm text-mist-900 shadow-sm focus:border-mist-500 focus:outline-none focus:ring-2 focus:ring-mist-200",
    toggleGroup: "border border-mist-300 bg-white shadow-sm",
    toggleActive: "bg-mist-800 text-white",
    toggleIdle: "text-mist-600 hover:bg-mist-150 hover:text-mist-900",
    today: "border-mist-900 group-hover:bg-mist-900 group-hover:text-white",
    selected: "ring-2 ring-inset ring-mist-800 bg-mist-50",
    cellHover: "hover:bg-mist-50",
    panel: "bg-mist-150",
    icon: "text-mist-700",
    companyTag: "bg-mist-150 text-mist-500",
    teamTag: "border border-mist-200 bg-white text-mist-700",
    types: TYPE_COLORS,
  },
  admin: {
    card: "rounded-2xl border border-teal-100 bg-white shadow-sm",
    headerRow: "bg-teal-50/70 text-teal-900",
    divider: "border-teal-100",
    text: "text-teal-950",
    muted: "text-teal-600",
    navBox: "border-teal-100 bg-white",
    navButton: "text-teal-700 hover:bg-teal-50",
    select:
      "rounded-lg border border-teal-200 bg-white py-2 pl-3 pr-8 text-sm text-teal-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100",
    toggleGroup: "border border-teal-200 bg-white shadow-sm",
    toggleActive: "bg-teal-600 text-white",
    toggleIdle: "text-teal-700 hover:bg-teal-50",
    today: "border-gray-900 group-hover:bg-gray-900 group-hover:text-white",
    selected: "ring-2 ring-inset ring-teal-500 bg-teal-50/60",
    cellHover: "hover:bg-teal-50/60",
    panel: "bg-teal-50/70",
    icon: "text-teal-600",
    companyTag: "bg-gray-100 text-gray-600",
    teamTag: "bg-violet-100 text-violet-700",
    types: TYPE_COLORS,
  },
} satisfies Record<string, HolidayTheme>;

const FALLBACK_STYLE: TypeStyle = {
  cell: "",
  dot: "bg-gray-400",
  label: "text-gray-700",
  badge: "bg-gray-100 text-gray-700",
};
const typeStyle = (theme: HolidayTheme, type: string) => theme.types[type] ?? FALLBACK_STYLE;
/** StatusBadge config using the theme's badge colours and the shared labels. */
const badgeConfig = (theme: HolidayTheme) =>
  Object.fromEntries(
    Object.entries(HOLIDAY_TYPES).map(([type, cfg]) => [
      type,
      { label: cfg.label, className: typeStyle(theme, type).badge },
    ]),
  );

const TYPE_OPTIONS: { value: HolidayTypeFilter; label: string }[] = [
  { value: "holiday", label: "วันหยุด" },
  { value: "wfh", label: "WFH" },
  { value: "all", label: "ทั้งหมด" },
];

// Monday-first, like the printed Thai office calendar.
const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

/** "Today": an outline circle (transparent inside) around the date number; add a border colour. */
const TODAY_RING = "inline-flex items-center justify-center rounded-full border-2 transition-colors";

/** Hover tooltip for a day cell: "วันนี้" first when it's today, then the day's entries. */
const dayTitle = (isToday: boolean, labels: string[]) => [...(isToday ? ["วันนี้"] : []), ...labels].join("\n") || undefined;

// ---------------------------------------------------------------------------
// Date helpers -- holiday_date is a plain YYYY-MM-DD string, so everything is
// done in UTC to avoid the server's timezone shifting the day.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Longest custom date range the calendar shows (in months). */
const MAX_RANGE_MONTHS = 12;

export function parseHolidayParams(params: {
  view?: string;
  year?: string;
  month?: string;
  date?: string;
  type?: string;
  months?: string;
  from?: string;
  to?: string;
  lm?: string;
}) {
  const [todayYear, todayMonth] = bangkokToday().split("-").map(Number);
  const view: HolidayView = params.view === "list" ? "list" : "calendar";
  const date = params.date && DATE_RE.test(params.date) ? params.date : undefined;
  const type: HolidayTypeFilter = params.type === "wfh" || params.type === "all" ? params.type : DEFAULT_TYPE;

  // The period shown (same for calendar and list): a custom date range
  // (?from=&to=), otherwise ?months= (1/2/3/4/12) starting at year/month.
  let range: { from: string; to: string } | undefined;
  let year: number;
  let month: number;
  let months: number;
  if (params.from && params.to && DATE_RE.test(params.from) && DATE_RE.test(params.to)) {
    const [from, to] = params.from <= params.to ? [params.from, params.to] : [params.to, params.from];
    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    const span = (ty - fy) * 12 + (tm - fm) + 1;
    if (span <= MAX_RANGE_MONTHS) {
      range = { from, to };
      year = fy;
      month = fm;
      months = span;
    }
  }
  if (!range) {
    const n = Number(params.months);
    months = MONTH_SPANS.includes(n as MonthSpan) ? (n as MonthSpan) : 1;
    year = Number(params.year) || todayYear;
    const m = Number(params.month);
    month = months === 12 ? 1 : m >= 1 && m <= 12 ? m : params.year ? 1 : todayMonth;
  }

  // Dates to load: the whole year (year totals), extended when the period
  // runs into the next year.
  const last = shiftMonth(year!, month!, months! - 1);
  const fetchTo =
    last.year > year!
      ? isoDate(last.year, last.month, new Date(Date.UTC(last.year, last.month, 0)).getUTCDate())
      : `${year!}-12-31`;
  // List view: no period (?months / ?from–to are calendar-only). Month buttons:
  // ?lm=YYYY-MM[,YYYY-MM…] = those months of the year; ?lm=all or none = the whole year.
  // ?lm = months picked in the list; the calendar shows exactly those months too,
  // so switching views keeps the same selection.
  let listMonth: string | undefined;
  if (params.lm) {
    if (params.lm === "all") listMonth = "all";
    else {
      const picked = [...new Set(params.lm.split(","))]
        .filter((ym) => /^\d{4}-\d{2}$/.test(ym) && ym.startsWith(`${year!}-`))
        .sort();
      listMonth = picked.length ? picked.join(",") : undefined;
    }
  }
  let monthList: string[] | undefined;
  if (view === "list") {
    range = undefined;
    months = 1;
  } else if (listMonth === "all") {
    // Calendar showing "ทั้งหมด" from the list = the whole year.
    range = undefined;
    months = 12;
    month = 1;
    listMonth = undefined;
  } else if (listMonth) {
    monthList = listMonth.split(",");
    range = undefined;
    month = Number(monthList[0].slice(5, 7));
    months = monthList.length;
  }
  return {
    view,
    year: year!,
    month: month!,
    date,
    type,
    months: months!,
    range,
    listMonth,
    monthList,
    fetchFrom: `${year!}-01-01`,
    fetchTo,
  };
}

export function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const utcDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function formatThaiDate(iso: string, options: Intl.DateTimeFormatOptions) {
  return utcDate(iso).toLocaleDateString("th-TH", {
    ...options,
    timeZone: "UTC",
  });
}

const longThaiDate = (iso: string) => formatThaiDate(iso, { day: "numeric", month: "long", year: "numeric" });

function thaiMonthName(year: number, month: number) {
  return formatThaiDate(isoDate(year, month, 1), { month: "long" });
}

/** "ต.ค. – ธ.ค. 2569" for a multi-month span, or the full month name when the span is 1. */
function spanLabel(year: number, month: number, months: number) {
  if (months === 1) return `${thaiMonthName(year, month)} ${year + 543}`;
  const end = shiftMonth(year, month, months - 1);
  const short = (y: number, m: number) => formatThaiDate(isoDate(y, m, 1), { month: "short" });
  return end.year === year
    ? `${short(year, month)} – ${short(end.year, end.month)} ${year + 543}`
    : `${short(year, month)} ${year + 543} – ${short(end.year, end.month)} ${end.year + 543}`;
}

type Period = { year: number; month: number; months: number; range?: { from: string; to: string } };

/** Months picked with the list's month buttons ([] for "all" / none). */
export function listMonthSet(listMonth?: string) {
  return listMonth && listMonth !== "all" ? listMonth.split(",") : [];
}

/** "ตุลาคม 2569" for one month, "ม.ค., มี.ค. 2569" for several. */
export function listMonthsLabel(months: string[]) {
  if (months.length === 1) {
    const [y, m] = [Number(months[0].slice(0, 4)), Number(months[0].slice(5, 7))];
    return `${thaiMonthName(y, m)} ${y + 543}`;
  }
  const names = months.map((ym) => formatThaiDate(`${ym}-01`, { month: "short" })).join(", ");
  return `${names} ${Number(months[0].slice(0, 4)) + 543}`;
}

/** Are these "YYYY-MM" months consecutive? */
function isConsecutive(months: string[]) {
  return months.every((ym, i) => {
    if (i === 0) return true;
    const n = shiftMonth(Number(months[i - 1].slice(0, 4)), Number(months[i - 1].slice(5, 7)), 1);
    return ym === `${n.year}-${pad(n.month)}`;
  });
}

/** Label for months picked in the list: "ก.ย. – ธ.ค. 2569" when consecutive, else "ม.ค., มี.ค. 2569". */
export function monthListLabel(months: string[]) {
  if (months.length > 1 && isConsecutive(months)) {
    return spanLabel(Number(months[0].slice(0, 4)), Number(months[0].slice(5, 7)), months.length);
  }
  return listMonthsLabel(months);
}

/** First and last date of the period shown by the calendar / list. */
export function periodBounds({ year, month, months, range }: Period) {
  if (range) return { start: range.from, end: range.to };
  const last = shiftMonth(year, month, months - 1);
  return {
    start: isoDate(year, month, 1),
    end: isoDate(last.year, last.month, new Date(Date.UTC(last.year, last.month, 0)).getUTCDate()),
  };
}

/** Human label of the period: a date range, "ปี 2569", or month(s). */
export function periodLabel({ year, month, months, range }: Period) {
  if (range) return rangeLabel(range.from, range.to);
  if (months === 12) return `ปี ${year + 543}`;
  return spanLabel(year, month, months);
}

/** "5 ต.ค. – 20 ธ.ค. 2569" (years shown per side when they differ). */
function rangeLabel(from: string, to: string) {
  const d = (iso: string) => formatThaiDate(iso, { day: "numeric", month: "short" });
  const y = (iso: string) => Number(iso.slice(0, 4)) + 543;
  return from.slice(0, 4) === to.slice(0, 4)
    ? `${d(from)} – ${d(to)} ${y(to)}`
    : `${d(from)} ${y(from)} – ${d(to)} ${y(to)}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

const buildHref = (basePath: string, q: Record<string, string | number | undefined>) =>
  `${basePath}?${new URLSearchParams(
    Object.entries(q).flatMap(([k, v]) =>
      v === undefined || v === "" || (k === "type" && v === DEFAULT_TYPE) ? [] : [[k, String(v)]],
    ),
  )}`;

export type Team = { id: string; name: string };

/** Company-wide entries first, public holidays before WFH, then by team name. */
function sortEntries(entries: Holiday[], teamName: (id: string | null) => string) {
  return [...entries].sort(
    (a, b) =>
      Number(a.team_id !== null) - Number(b.team_id !== null) ||
      Number(a.type !== "holiday") - Number(b.type !== "holiday") ||
      teamName(a.team_id).localeCompare(teamName(b.team_id), "th"),
  );
}

/** "name · team" for a team's entry -- unless the name already mentions the team. */
function labelWithTeam(h: Holiday, teamName: (id: string | null) => string) {
  if (!h.team_id) return h.name;
  const team = teamName(h.team_id);
  return h.name.includes(team) ? h.name : `${h.name} · ${team}`;
}

/** Entries grouped by month ("YYYY-MM"), in date order -- for month sections in tables. */
function groupByMonth(entries: Holiday[]) {
  const groups: { ym: string; label: string; entries: Holiday[] }[] = [];
  for (const h of [...entries].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))) {
    const ym = h.holiday_date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.ym !== ym) {
      const [y, m] = [Number(ym.slice(0, 4)), Number(ym.slice(5, 7))];
      g = { ym, label: `${thaiMonthName(y, m)} ${y + 543}`, entries: [] };
      groups.push(g);
    }
    g.entries.push(h);
  }
  return groups;
}

/**
 * Entries as one small table per month -- same layout as the printed list:
 * month heading, then วันที่ | วัน | รายการ (+ note) | ทีม | ประเภท.
 */
function MonthTables({
  entries,
  teamName,
  theme,
  renderDate,
  actions,
}: {
  entries: Holiday[];
  teamName: (id: string | null) => string;
  theme: HolidayTheme;
  /** Wraps the date cell (e.g. a button that selects the day in the calendar). */
  renderDate?: (h: Holiday, label: string) => React.ReactNode;
  /** Back office: buttons at the end of each row. */
  actions?: (h: Holiday) => React.ReactNode;
}) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">ไม่มีวันหยุดหรือวัน WFH ในช่วงนี้</p>;
  }
  return (
    <div className="space-y-6">
      {groupByMonth(entries).map((g) => (
        <section key={g.ym}>
          <h3 className={`mb-1.5 text-base font-semibold ${theme.text}`}>{g.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={`border-y text-left text-xs ${theme.divider} ${theme.headerRow}`}>
                  <th className="w-24 px-3 py-2 font-medium">วันที่</th>
                  <th className="w-20 px-3 py-2 font-medium">วัน</th>
                  <th className="px-3 py-2 font-medium">รายการ</th>
                  <th className="w-40 px-3 py-2 font-medium">ทีม</th>
                  <th className="w-28 px-3 py-2 font-medium">ประเภท</th>
                  {actions && <th className="w-24 px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {g.entries.map((h) => {
                  const date = formatThaiDate(h.holiday_date, { day: "numeric", month: "short" });
                  return (
                    <tr key={h.id} className={`border-b align-top ${theme.divider} ${theme.cellHover}`}>
                      <td className={`whitespace-nowrap px-3 py-2.5 tabular-nums ${theme.text}`}>
                        {renderDate ? renderDate(h, date) : date}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2.5 ${theme.text}`}>
                        {formatThaiDate(h.holiday_date, { weekday: "short" })}
                      </td>
                      <td className={`px-3 py-2.5 ${theme.text}`}>
                        {h.name}
                        {h.note && <span className="block text-xs text-gray-500">{h.note}</span>}
                      </td>
                      <td className={`px-3 py-2.5 ${theme.text}`}>{teamName(h.team_id)}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={h.type} config={badgeConfig(theme)} />
                      </td>
                      {actions && <td className="px-3 py-2.5 text-right">{actions(h)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function makeTeamName(teams: Team[]) {
  const byId = new Map(teams.map((t) => [t.id, t.name]));
  return (id: string | null) => (id ? (byId.get(id) ?? "ทีมที่ถูกลบ") : "ทั้งบริษัท");
}

function TeamTag({ name, companyWide, theme }: { name: string; companyWide: boolean; theme: HolidayTheme }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        companyWide ? theme.companyTag : theme.teamTag
      }`}
    >
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------

export function HolidayToolbar({
  title,
  subtitle,
  basePath,
  view,
  year,
  month,
  theme,
  team,
  type,
  months = 1,
  range,
  listMonth,
  monthList,
  filter,
  actions,
}: {
  title: string;
  subtitle: string;
  basePath: string;
  view: HolidayView;
  year: number;
  month: number;
  theme: HolidayTheme;
  /** Team filter carried through navigation links (back office). */
  team?: string;
  /** Holiday / WFH filter, kept across navigation. */
  type?: HolidayTypeFilter;
  /** Months in the period (calendar and list). */
  months?: number;
  /** Custom date range picked in the popover, kept across navigation and views. */
  range?: { from: string; to: string };
  /** Months picked in the list ("all" or YYYY-MM,…); kept by the type filter. */
  listMonth?: string;
  /** Calendar showing exactly the months picked in the list. */
  monthList?: string[];
  /** Team filter control / "your team" chip, shown next to the view toggle. */
  filter?: React.ReactNode;
  /** Extra buttons shown on the right of the second row (back office). */
  actions?: React.ReactNode;
}) {
  // Same period in both views: ‹ › step by the span (by year for the whole year).
  const step = months !== 12 ? months : 0;
  const prev = step ? shiftMonth(year, month, -step) : { year: year - 1, month };
  const next = step ? shiftMonth(year, month, step) : { year: year + 1, month };
  // Kept in every link: the custom range, or the month span when it isn't 1.
  // Kept in links: the calendar's period (custom range, picked months or span); the list has none.
  const keep: Record<string, string | number | undefined> =
    view === "list"
      ? {}
      : range
        ? { from: range.from, to: range.to }
        : monthList
          ? { lm: monthList.join(",") }
          : { months: months !== 1 ? months : undefined };
  // Calendar → list: pick the months the calendar shows (within its year); whole year = ทั้งหมด.
  const { start: pStart, end: pEnd } = periodBounds({ year, month, months, range });
  const periodMonths: string[] = [];
  for (let ym = pStart.slice(0, 7); ym <= pEnd.slice(0, 7) && ym.startsWith(`${year}-`); ) {
    periodMonths.push(ym);
    const n = shiftMonth(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 1);
    ym = `${n.year}-${pad(n.month)}`;
  }
  const listLm =
    view === "list"
      ? listMonth
      : monthList
        ? monthList.join(",")
        : periodMonths.length && periodMonths.length < 12
          ? periodMonths.join(",")
          : "all";
  // List → calendar: show the same months (ทั้งหมด = the whole year).
  const calendarLinkParams: Record<string, string | number | undefined> =
    view === "list"
      ? listMonth && listMonth !== "all"
        ? { lm: listMonth }
        : { months: 12, month: 1 }
      : { month, ...keep };
  // A custom range or picked months replace ‹ › with a clear (×) button.
  const custom = !!range || !!monthList;
  const label = monthList ? monthListLabel(monthList) : periodLabel({ year, month, months, range });
  // Leaving the whole-year view: start from this month when viewing this year, else January.
  const [todayYear, todayMonth] = bangkokToday().split("-").map(Number);
  const spanStart = months === 12 ? (year === todayYear ? todayMonth : 1) : month;
  // In a custom range / picked months the cycle button starts over at 1 month.
  const currentSpan = custom ? undefined : (months as MonthSpan);
  const nextSpan = currentSpan ? MONTH_SPANS[(MONTH_SPANS.indexOf(currentSpan) + 1) % MONTH_SPANS.length] : 1;
  const toggleClass = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? theme.toggleActive : theme.toggleIdle
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="mr-auto">
          <h1 className={`text-3xl font-bold sm:text-4xl ${theme.text}`}>{title}</h1>
          <p className={`mt-1 ${theme.muted}`}>{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex gap-1 rounded-lg p-1 ${theme.toggleGroup}`} role="group" aria-label="รูปแบบการแสดงผล">
            <Link
              href={buildHref(basePath, {
                view: "calendar",
                year,
                ...calendarLinkParams,
                team,
                type,
              })}
              className={toggleClass(view === "calendar")}
            >
              <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5" />
              ปฏิทิน
            </Link>
            <Link
              href={buildHref(basePath, { view: "list", year, lm: listLm, team, type })}
              className={toggleClass(view === "list")}
            >
              <FontAwesomeIcon icon={faList} className="h-3.5 w-3.5" />
              รายการ
            </Link>
          </div>
          {/* Cycle (toggle) button: each click moves to the next span, and the icon shows
              the current one -- 1 → 2 → 3 → 4 months → whole year → 1. Calendar view only. */}
          {view === "calendar" && (
            <Link
              href={buildHref(basePath, {
                view,
                year,
                month: nextSpan === 12 ? 1 : spanStart,
                months: nextSpan === 1 ? undefined : nextSpan,
                team,
                type,
              })}
              title={`คลิกเพื่อเปลี่ยนเป็น ${spanName(nextSpan)}`}
              aria-label={`กำลังแสดง ${currentSpan ? spanName(currentSpan) : "ช่วงที่เลือก"} — คลิกเพื่อเปลี่ยนเป็น ${spanName(nextSpan)}`}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${theme.toggleGroup} ${theme.text} ${theme.cellHover}`}
            >
              {currentSpan ? (
                <SpanIcon months={currentSpan} />
              ) : (
                <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4" />
              )}
              {currentSpan ? spanName(currentSpan) : "ช่วงที่เลือก"}
            </Link>
          )}
          <div className={`flex gap-1 rounded-lg p-1 ${theme.toggleGroup}`} role="group" aria-label="ประเภท">
            {TYPE_OPTIONS.map((o) => (
              <Link
                key={o.label}
                href={buildHref(basePath, view === "list" ? { view, year, lm: listMonth, team, type: o.value } : { view, year, month, ...keep, team, type: o.value })}
                aria-current={type === o.value ? "true" : undefined}
                className={toggleClass(type === o.value)}
              >
                {o.value !== "all" && <span className={`h-2.5 w-2.5 rounded-full ${typeStyle(theme, o.value).dot}`} />}
                {o.label}
              </Link>
            ))}
          </div>
          {filter}
        </div>
        {actions}
      </div>

      {/* Period navigation (‹ label ›, date-range picker) -- calendar view only; it sits
          where the list view shows its month buttons. */}
      {view === "calendar" && (
        <div
          className={`relative flex w-fit items-center gap-1 rounded-xl border px-2 py-1.5 shadow-sm ${theme.navBox}`}
        >
          {!custom && (
            <Link
              href={buildHref(basePath, { view, ...prev, ...keep, team, type })}
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.navButton}`}
              aria-label="ก่อนหน้า"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
            </Link>
          )}
          <DateRangePicker
            view={view}
            basePath={basePath}
            label={label}
            range={range}
            initialYear={year}
            initialMonth={month}
            keepParams={{ team, type }}
            theme={{
              text: theme.text,
              muted: theme.muted,
              button: theme.navButton,
              panel: theme.card,
              endpoint: theme.toggleActive,
              between: theme.panel,
              primary: `${theme.toggleActive} rounded-lg px-3 py-1.5 text-sm font-medium`,
              secondary: `${theme.toggleGroup} rounded-lg px-3 py-1.5 text-sm font-medium ${theme.text}`,
            }}
          />
          {custom ? (
            <Link
              href={buildHref(basePath, { view, year, month, team, type })}
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.navButton}`}
              aria-label={monthList ? "ล้างเดือนที่เลือก" : "ล้างช่วงวันที่"}
              title={monthList ? "ล้างเดือนที่เลือก" : "ล้างช่วงวันที่"}
            >
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href={buildHref(basePath, { view, ...next, ...keep, team, type })}
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.navButton}`}
              aria-label="ถัดไป"
            >
              <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Tiny layout glyph for the span cycle button: 1, 2, 3, 4 boxes, or a 3×4 grid for the year. */
function SpanIcon({ months }: { months: MonthSpan }) {
  const boxes: [number, number, number, number][] =
    months === 12
      ? Array.from({ length: 12 }, (_, i) => [1 + (i % 4) * 4.5, 2 + Math.floor(i / 4) * 4.5, 3.5, 3.5])
      : months === 4
        ? [
            [1, 1, 7.5, 7.5],
            [10.5, 1, 7.5, 7.5],
            [1, 10.5, 7.5, 7.5],
            [10.5, 10.5, 7.5, 7.5],
          ]
        : Array.from({ length: months }, (_, i) => {
            const w = (18 - (months - 1) * 2) / months;
            return [1 + i * (w + 2), 3, w, 13];
          });
  return (
    <svg viewBox="0 0 19 19" className="h-4 w-4" aria-hidden="true">
      {boxes.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="1.2" fill="currentColor" />
      ))}
    </svg>
  );
}

// Month grids inside the left column when several months are shown (the
// details panel keeps the right column, as in the single-month view).
const miniGrid = (months: number) =>
  months === 2 || months === 4
    ? "sm:grid-cols-2"
    : months === 3
      ? "sm:grid-cols-2 2xl:grid-cols-3"
      : "sm:grid-cols-2 xl:grid-cols-3";

/**
 * Calendar view for any span: one full month, or 2 / 3 / 4 months / the whole
 * year as compact month grids. Same layout either way -- calendars on the
 * left, the selected day's details on the right, the entries table below.
 * Picking a day is instant (client-side); only days with entries get a
 * server-rendered panel, so a whole year stays light.
 */
export function HolidayCalendar({
  basePath,
  linkParams,
  year,
  month,
  months = 1,
  range,
  monthList,
  holidays,
  teams,
  theme,
  selectedDate,
  entryActions,
  addHref,
  addButtonClassName,
  tip,
}: {
  basePath: string;
  /** Filters (team / type) kept when jumping to another month. */
  linkParams?: Record<string, string | undefined>;
  year: number;
  month: number;
  months?: number;
  /** Custom date range: days outside it are faded and the table lists only entries inside it. */
  range?: { from: string; to: string };
  /** Exactly these months ("YYYY-MM"), e.g. picked in the list view (may skip months). */
  monthList?: string[];
  holidays: Holiday[];
  teams: Team[];
  theme: HolidayTheme;
  selectedDate?: string;
  /** Back office: edit / delete buttons under each entry of the selected day. */
  entryActions?: (holiday: Holiday, date: string) => React.ReactNode;
  /** Back office: link for adding a holiday / WFH on a day. */
  addHref?: (date: string) => string;
  addButtonClassName?: string;
  tip: string;
}) {
  const teamName = makeTeamName(teams);
  const entryLabel = (h: Holiday) => labelWithTeam(h, teamName);
  const byDate = new Map<string, Holiday[]>();
  for (const h of holidays) byDate.set(h.holiday_date, [...(byDate.get(h.holiday_date) ?? []), h]);
  for (const [d, list] of byDate) byDate.set(d, sortEntries(list, teamName));

  const today = bangkokToday();
  const shownMonths = monthList
    ? monthList.map((ym) => ({ year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)) }))
    : Array.from({ length: months }, (_, i) => shiftMonth(year, month, i));
  const last = shownMonths[shownMonths.length - 1];
  const rangeStart = range?.from ?? isoDate(year, month, 1);
  const rangeEnd =
    range?.to ?? isoDate(last.year, last.month, new Date(Date.UTC(last.year, last.month, 0)).getUTCDate());
  const inRange = (d: string) =>
    monthList ? monthList.includes(d.slice(0, 7)) : d >= rangeStart && d <= rangeEnd;
  const rangeEntries = sortEntries(
    holidays.filter((h) => inRange(h.holiday_date)),
    teamName,
  ).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));

  // Selected day: explicit ?date= in range, else today, else first entry, else the first day.
  const selected =
    (selectedDate && inRange(selectedDate) && selectedDate) ||
    (inRange(today) && today) ||
    rangeEntries[0]?.holiday_date ||
    rangeStart;

  const panels = Object.fromEntries(
    [...byDate.keys()].filter(inRange).map((date) => [
      date,
      <>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-xl font-semibold ${theme.text}`}>{longThaiDate(date)}</p>
            <p className={`text-sm ${theme.muted}`}>
              วัน{formatThaiDate(date, { weekday: "long" }).replace(/^วัน/, "")}
            </p>
          </div>
          <FontAwesomeIcon icon={faCalendarCheck} className={`text-3xl ${theme.icon}`} />
        </div>
        <ul className="mt-4 space-y-3">
          {(byDate.get(date) ?? []).map((h) => (
            <li key={h.id} className={`border-t pt-3 ${theme.divider}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={h.type} config={badgeConfig(theme)} />
                <TeamTag name={teamName(h.team_id)} companyWide={h.team_id === null} theme={theme} />
              </div>
              <p className={`mt-2 font-medium ${theme.text}`}>{h.name}</p>
              {h.note && <p className="mt-0.5 text-sm text-gray-600">{h.note}</p>}
              {entryActions && <div className="mt-2 flex flex-wrap gap-2">{entryActions(h, date)}</div>}
            </li>
          ))}
        </ul>
        {addHref && (
          <div className={`mt-4 border-t pt-4 ${theme.divider}`}>
            <Link href={addHref(date)} className={addButtonClassName}>
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              เพิ่มวันหยุด / WFH
            </Link>
          </div>
        )}
      </>,
    ]),
  );

  const monthHref = (y: number, m: number, date?: string) =>
    buildHref(basePath, { view: "calendar", year: y, month: m, date, ...linkParams });

  return (
    <DaySelection key={`${rangeStart}-${rangeEnd}-${monthList?.join(",") ?? ""}`} initial={selected}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {months === 1 ? (
            <FullMonth
              year={year}
              month={month}
              inRange={inRange}
              byDate={byDate}
              today={today}
              theme={theme}
              entryLabel={entryLabel}
              monthHref={monthHref}
            />
          ) : (
            <div className={`grid h-fit grid-cols-1 gap-4 ${miniGrid(months)}`}>
              {shownMonths.map(({ year: y, month: m }) => (
                <MiniMonth
                  key={`${y}-${m}`}
                  year={y}
                  month={m}
                  inRange={inRange}
                  byDate={byDate}
                  today={today}
                  theme={theme}
                  entryLabel={entryLabel}
                  titleHref={monthHref(y, m)}
                />
              ))}
            </div>
          )}

          <aside className={`flex h-fit flex-col p-5 lg:sticky lg:top-20 ${theme.card}`}>
            <h2 className={`text-lg font-semibold ${theme.text}`}>รายละเอียดวันหยุด</h2>
            <div className={`mt-4 rounded-xl p-4 ${theme.panel}`}>
              <SelectedPanel
                panels={panels}
                empty={{
                  text: theme.text,
                  muted: theme.muted,
                  icon: theme.icon,
                  divider: theme.divider,
                  addHref: addHref?.("__DATE__"),
                  addClassName: addButtonClassName,
                }}
              />
            </div>
            <div className={`mt-5 flex items-center gap-3 border-t pt-4 text-sm ${theme.divider} ${theme.muted}`}>
              <FontAwesomeIcon icon={faCalendarDays} className={`shrink-0 text-2xl ${theme.icon}`} />
              <span>{tip}</span>
            </div>
          </aside>
        </div>

        <div className={`p-5 ${theme.card}`}>
          <h2 className={`text-lg font-semibold ${theme.text}`}>
            {months === 1 && !range ? "วันหยุดในเดือนนี้" : `วันหยุดในช่วงนี้ (${rangeEntries.length} รายการ)`}
          </h2>
          <div className="mt-4">
            <MonthTables
              entries={rangeEntries}
              teamName={teamName}
              theme={theme}
              renderDate={(h, label) => <SelectDateButton date={h.holiday_date}>{label}</SelectDateButton>}
            />
          </div>
        </div>
      </div>
    </DaySelection>
  );
}

type GridProps = {
  year: number;
  month: number;
  /** Days outside the shown range (custom date range) render faded and aren't selectable. */
  inRange: (date: string) => boolean;
  byDate: Map<string, Holiday[]>;
  today: string;
  theme: HolidayTheme;
  entryLabel: (h: Holiday) => string;
};

/** Single-month grid with names in the cells; neighbouring-month days link to that month. */
function FullMonth({
  year,
  month,
  inRange,
  byDate,
  today,
  theme,
  entryLabel,
  monthHref,
}: GridProps & { monthHref: (y: number, m: number, date?: string) => string }) {
  const leading = (utcDate(isoDate(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  // offset: -1 = trailing days of the previous month, +1 = leading days of the next.
  const cells: { day: number; current: boolean; offset?: -1 | 1 }[] = [
    ...Array.from({ length: leading }, (_, i) => ({
      day: prevMonthDays - leading + 1 + i,
      current: false,
      offset: -1 as const,
    })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, current: true })),
  ];
  for (let d = 1; cells.length % 7 !== 0; d++) cells.push({ day: d, current: false, offset: 1 });

  return (
    <div className={`overflow-hidden ${theme.card}`}>
      <div
        className={`grid grid-cols-7 border-b text-center text-sm font-semibold ${theme.divider} ${theme.headerRow}`}
      >
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`py-2.5 ${i < 6 ? `border-r ${theme.divider}` : ""}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(({ day, current, offset }, i) => {
          const edge = `${i < cells.length - 7 ? "border-b" : ""} ${i % 7 !== 6 ? "border-r" : ""} ${theme.divider}`;
          if (!current) {
            const target = shiftMonth(year, month, offset ?? 1);
            const date = isoDate(target.year, target.month, day);
            const entries = byDate.get(date) ?? [];
            return (
              <Link
                key={`x-${i}`}
                href={monthHref(target.year, target.month, date)}
                title={`ไปเดือน${thaiMonthName(target.year, target.month)}`}
                className={`flex min-h-14 flex-col gap-1 bg-gray-50/60 p-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:min-h-24 sm:p-2.5 ${edge}`}
              >
                {day}
                {entries.slice(0, 2).map((h) => (
                  <span key={h.id} className="flex items-center gap-1.5 text-xs opacity-60">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${typeStyle(theme, h.type).dot}`} />
                    <span className="hidden sm:line-clamp-1">{entryLabel(h)}</span>
                  </span>
                ))}
              </Link>
            );
          }
          const date = isoDate(year, month, day);
          if (!inRange(date)) {
            return (
              <div
                key={date}
                className={`min-h-14 bg-gray-50/60 p-1.5 text-sm text-gray-300 sm:min-h-24 sm:p-2.5 ${edge}`}
              >
                {day}
              </div>
            );
          }
          const entries = byDate.get(date) ?? [];
          const cellType = entries.some((h) => h.type === "holiday") ? "holiday" : entries[0]?.type;
          const shown = entries.slice(0, 2);
          return (
            <DayButton
              key={date}
              date={date}
              title={dayTitle(date === today, entries.map(entryLabel))}
              className={`group relative flex min-h-14 cursor-pointer flex-col items-start gap-1 p-1.5 text-left text-sm transition-colors sm:min-h-24 sm:p-2.5 ${edge}`}
              selectedClassName={theme.selected}
              idleClassName={`${cellType ? typeStyle(theme, cellType).cell : "bg-white"} ${theme.cellHover}`}
            >
              <span
                className={`font-medium ${theme.text} ${date === today ? `${TODAY_RING} ${theme.today} -m-1 h-8 w-8` : ""}`}
              >
                {day}
              </span>
              {shown.map((h) => {
                const style = typeStyle(theme, h.type);
                return (
                  <span key={h.id} className={`flex items-center gap-1.5 text-xs leading-snug ${style.label}`}>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <span className="hidden sm:line-clamp-1">{entryLabel(h)}</span>
                  </span>
                );
              })}
              {entries.length > shown.length && (
                <span className="hidden text-xs text-gray-500 sm:block">+{entries.length - shown.length} รายการ</span>
              )}
            </DayButton>
          );
        })}
      </div>
    </div>
  );
}

/** Compact month grid for multi-month spans: coloured day cells, counts under the title. */
function MiniMonth({
  year,
  month,
  inRange,
  byDate,
  today,
  theme,
  entryLabel,
  titleHref,
}: GridProps & { titleHref: string }) {
  const leading = (utcDate(isoDate(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const prefix = `${year}-${pad(month)}-`;
  const monthEntries = [...byDate.entries()].filter(([d]) => d.startsWith(prefix)).flatMap(([, list]) => list);
  const count = (t: string) => monthEntries.filter((h) => h.type === t).length;

  return (
    <section className={`p-4 ${theme.card}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <Link href={titleHref} className={`font-semibold hover:underline ${theme.text}`} title="ดูเดือนนี้แบบเต็ม">
          {thaiMonthName(year, month)} {year + 543}
        </Link>
        <span className={`flex gap-2 text-xs ${theme.muted}`}>
          {["holiday", "wfh"].map((t) =>
            count(t) > 0 ? (
              <span key={t} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${typeStyle(theme, t).dot}`} />
                {count(t)}
              </span>
            ) : null,
          )}
        </span>
      </div>
      <div className={`grid grid-cols-7 text-center text-[11px] font-medium ${theme.muted}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="h-9" />;
          const date = isoDate(year, month, d);
          if (!inRange(date)) {
            return (
              <div key={date} className="flex h-9 items-center justify-center text-sm text-gray-300">
                {d}
              </div>
            );
          }
          const entries = byDate.get(date) ?? [];
          const main = entries.find((h) => h.type === "holiday") ?? entries[0];
          const weekend = i % 7 >= 5;
          return (
            <DayButton
              key={date}
              date={date}
              title={dayTitle(date === today, entries.map(entryLabel))}
              className="group flex h-9 cursor-pointer items-center justify-center rounded-md text-sm transition-colors"
              selectedClassName={theme.selected}
              idleClassName={`${
                main
                  ? `${typeStyle(theme, main.type).cell} font-semibold ${typeStyle(theme, main.type).label}`
                  : weekend
                    ? "text-gray-400"
                    : theme.text
              } ${theme.cellHover}`}
            >
              <span className={date === today ? `${TODAY_RING} ${theme.today} h-7 w-7` : ""}>{d}</span>
            </DayButton>
          );
        })}
      </div>
    </section>
  );
}

/**
 * List view month buttons: ทั้งหมด | ม.ค. … ธ.ค. of the year -- a separate
 * filter, not tied to the period chosen above. Several months can be picked
 * (each click toggles one); "ทั้งหมด" = the whole year.
 * Nothing picked = the whole year too.
 */
export function HolidayMonthChips({
  basePath,
  year,
  listMonth,
  entries,
  keepParams,
  theme,
}: {
  basePath: string;
  year: number;
  listMonth?: string;
  /** The year's entries (after team / type filters), for fading empty months. */
  entries: Holiday[];
  /** Period + filters to keep in the links (view, year, month, months / from–to, team, type). */
  keepParams: Record<string, string | number | undefined>;
  theme: HolidayTheme;
}) {
  const chip = (active: boolean, empty: boolean) =>
    `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? theme.toggleActive : `${theme.toggleIdle} ${empty ? "opacity-45" : ""}`
    }`;
  const href = (lm?: string) => buildHref(basePath, { ...keepParams, lm });
  const selected = listMonthSet(listMonth);
  // Clicking a month adds it to / removes it from the selection; none left = ทั้งหมด.
  const toggle = (ym: string) => {
    const next = selected.includes(ym) ? selected.filter((x) => x !== ym) : [...selected, ym].sort();
    return href(next.length ? next.join(",") : "all");
  };

  return (
    <div className="max-w-full overflow-x-auto">
      <div className={`flex w-max gap-1 rounded-lg p-1 ${theme.toggleGroup}`} role="group" aria-label="กรองตามเดือน (เลือกได้หลายเดือน)">
        <Link
          href={href("all")}
          aria-current={!listMonth || listMonth === "all" ? "true" : undefined}
          title={`ทั้งปี ${year + 543} — ${entries.length} รายการ`}
          className={chip(!listMonth || listMonth === "all", false)}
        >
          ทั้งหมด
        </Link>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const ym = `${year}-${pad(m)}`;
          const n = entries.filter((h) => h.holiday_date.startsWith(`${ym}-`)).length;
          return (
            <Link
              key={ym}
              href={toggle(ym)}
              aria-pressed={selected.includes(ym)}
              title={`${thaiMonthName(year, m)} ${year + 543} — ${n} รายการ${selected.includes(ym) ? " (คลิกเพื่อเอาออก)" : ""}`}
              className={chip(selected.includes(ym), n === 0)}
            >
              {formatThaiDate(`${ym}-01`, { month: "short" })}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Count line above the list: the period and how many holidays / WFH days it has. */
export function HolidayPeriodSummary({
  label,
  entries,
  theme,
}: {
  label: string;
  entries: Holiday[];
  theme: HolidayTheme;
}) {
  const count = (t: string) => entries.filter((h) => h.type === t).length;
  return (
    <p
      className={`ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm ${theme.muted}`}
      aria-live="polite"
    >
      <span className={`font-semibold ${theme.text}`}>
        {label} · {entries.length} รายการ
      </span>
      {[
        ["holiday", "วันหยุด"],
        ["wfh", "WFH"],
      ].map(([t, name]) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${typeStyle(theme, t).dot}`} />
          {name} <span className={`font-medium tabular-nums ${theme.text}`}>{count(t)}</span>
        </span>
      ))}
    </p>
  );
}

export function HolidayList({
  holidays,
  teams,
  theme,
  dateHref,
  actions,
}: {
  holidays: Holiday[];
  teams: Team[];
  theme: HolidayTheme;
  dateHref?: (holiday: Holiday) => string;
  actions?: (holiday: Holiday) => React.ReactNode;
}) {
  return (
    <div className={`p-5 ${theme.card}`}>
      <MonthTables
        entries={holidays}
        teamName={makeTeamName(teams)}
        theme={theme}
        actions={actions}
        renderDate={
          dateHref
            ? (h, label) => (
                <Link href={dateHref(h)} className="hover:underline">
                  {label}
                </Link>
              )
            : undefined
        }
      />
    </div>
  );
}
