import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faList,
} from "@fortawesome/free-solid-svg-icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { HOLIDAY_TYPES } from "@/lib/holiday-types";
import type { Database } from "@/types/database.types";
import { DayButton, DaySelection, SelectDateButton, SelectedPanel } from "./day-selection";
import { MonthYearPicker } from "./month-year-picker";

// Shared list / month-calendar views for company holidays, used by both the
// employee portal (read-only, indigo) and the HR back office (editable, teal).

export type Holiday = Database["public"]["Tables"]["company_holidays"]["Row"];
export type HolidayView = "calendar" | "list";

export type HolidayTheme = {
  card: string;
  headerRow: string;
  divider: string;
  text: string;
  muted: string;
  navBox: string;
  navButton: string;
  select: string;
  toggleActive: string;
  today: string;
  selected: string;
  cellHover: string;
  panel: string;
  icon: string;
};

export const HOLIDAY_THEMES = {
  portal: {
    card: "rounded-2xl border border-indigo-100 bg-white shadow-sm",
    headerRow: "bg-indigo-50/70 text-indigo-900",
    divider: "border-indigo-100",
    text: "text-indigo-950",
    muted: "text-indigo-500",
    navBox: "border-indigo-100 bg-white",
    navButton: "text-indigo-700 hover:bg-indigo-50",
    select:
      "rounded-lg border border-indigo-200 bg-white py-2 pl-3 pr-8 text-sm text-indigo-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100",
    toggleActive: "bg-white text-indigo-700 shadow-sm",
    today: "font-bold text-amber-600",
    selected: "ring-2 ring-inset ring-indigo-500 bg-indigo-50/60",
    cellHover: "hover:bg-indigo-50/60",
    panel: "bg-indigo-50/70",
    icon: "text-indigo-600",
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
    toggleActive: "bg-white text-teal-700 shadow-sm",
    today: "font-bold text-orange-600",
    selected: "ring-2 ring-inset ring-teal-500 bg-teal-50/60",
    cellHover: "hover:bg-teal-50/60",
    panel: "bg-teal-50/70",
    icon: "text-teal-600",
  },
} satisfies Record<string, HolidayTheme>;

const TYPE_STYLES: Record<string, { cell: string; dot: string; label: string }> = {
  holiday: { cell: "bg-rose-50", dot: "bg-rose-400", label: "text-rose-700" },
  wfh: { cell: "bg-sky-50", dot: "bg-sky-400", label: "text-sky-700" },
};
const FALLBACK_STYLE = { cell: "", dot: "bg-gray-400", label: "text-gray-700" };
const typeStyle = (type: string) => TYPE_STYLES[type] ?? FALLBACK_STYLE;

// Monday-first, like the printed Thai office calendar.
const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

// ---------------------------------------------------------------------------
// Date helpers -- holiday_date is a plain YYYY-MM-DD string, so everything is
// done in UTC to avoid the server's timezone shifting the day.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseHolidayParams(params: { view?: string; year?: string; month?: string; date?: string }) {
  const [todayYear, todayMonth] = bangkokToday().split("-").map(Number);
  const view: HolidayView = params.view === "list" ? "list" : "calendar";
  const year = Number(params.year) || todayYear;
  const m = Number(params.month);
  const month = m >= 1 && m <= 12 ? m : params.year ? 1 : todayMonth;
  const date = params.date && DATE_RE.test(params.date) ? params.date : undefined;
  return { view, year, month, date };
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

function shiftMonth(year: number, month: number, delta: number) {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

const buildHref = (basePath: string, q: Record<string, string | number | undefined>) =>
  `${basePath}?${new URLSearchParams(
    Object.entries(q).flatMap(([k, v]) => (v === undefined || v === "" ? [] : [[k, String(v)]])),
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

function makeTeamName(teams: Team[]) {
  const byId = new Map(teams.map((t) => [t.id, t.name]));
  return (id: string | null) => (id ? (byId.get(id) ?? "ทีมที่ถูกลบ") : "ทั้งบริษัท");
}

function TeamTag({ name, companyWide }: { name: string; companyWide: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        companyWide ? "bg-gray-100 text-gray-600" : "bg-violet-100 text-violet-700"
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
  /** Team filter control / "your team" chip, shown next to the view toggle. */
  filter?: React.ReactNode;
  /** Extra buttons shown on the right of the second row (back office). */
  actions?: React.ReactNode;
}) {
  const prev = view === "calendar" ? shiftMonth(year, month, -1) : { year: year - 1, month };
  const next = view === "calendar" ? shiftMonth(year, month, 1) : { year: year + 1, month };
  const toggleClass = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? theme.toggleActive : `${theme.muted} hover:bg-white`
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="mr-auto">
          <h1 className={`text-3xl font-bold sm:text-4xl ${theme.text}`}>{title}</h1>
          <p className={`mt-1 ${theme.muted}`}>{subtitle}</p>
        </div>

        <div className={`flex items-center gap-1 rounded-xl border px-2 py-1.5 shadow-sm ${theme.navBox}`}>
          <Link
            href={buildHref(basePath, { view, ...prev, team })}
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.navButton}`}
            aria-label="ก่อนหน้า"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
          </Link>
          <span className={`min-w-40 text-center text-lg font-semibold ${theme.text}`}>
            {view === "calendar" ? `${thaiMonthName(year, month)} ${year + 543}` : `ปี ${year + 543}`}
          </span>
          <Link
            href={buildHref(basePath, { view, ...next, team })}
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${theme.navButton}`}
            aria-label="ถัดไป"
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
          </Link>
        </div>

        <MonthYearPicker
          basePath={basePath}
          year={year}
          month={month}
          team={team}
          showMonth={view === "calendar"}
          selectClassName={theme.select}
        />

        <HolidayLegend />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="รูปแบบการแสดงผล">
            <Link
              href={buildHref(basePath, {
                view: "calendar",
                year,
                month,
                team,
              })}
              className={toggleClass(view === "calendar")}
            >
              <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5" />
              ปฏิทิน
            </Link>
            <Link
              href={buildHref(basePath, { view: "list", year, month, team })}
              className={toggleClass(view === "list")}
            >
              <FontAwesomeIcon icon={faList} className="h-3.5 w-3.5" />
              รายการทั้งปี
            </Link>
          </div>
          {filter}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function HolidayLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(HOLIDAY_TYPES).map(([type, cfg]) => (
        <span
          key={type}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm"
        >
          <span className={`h-3 w-3 rounded-full ${typeStyle(type).dot}`} />
          {cfg.label}
        </span>
      ))}
    </div>
  );
}

export function HolidayCalendar({
  year,
  month,
  holidays,
  teams,
  theme,
  selectedDate,
  entryActions,
  addAction,
  tip,
}: {
  year: number;
  month: number;
  holidays: Holiday[];
  teams: Team[];
  theme: HolidayTheme;
  selectedDate?: string;
  /** Back office: edit / delete buttons under each entry of the selected day. */
  entryActions?: (holiday: Holiday, date: string) => React.ReactNode;
  /** Back office: "add" button for the selected day. */
  addAction?: (date: string) => React.ReactNode;
  tip: string;
}) {
  const teamName = makeTeamName(teams);
  const byDate = new Map<string, Holiday[]>();
  for (const h of holidays) byDate.set(h.holiday_date, [...(byDate.get(h.holiday_date) ?? []), h]);
  for (const [d, list] of byDate) byDate.set(d, sortEntries(list, teamName));

  const today = bangkokToday();
  const monthPrefix = `${year}-${pad(month)}-`;
  const monthHolidays = sortEntries(
    holidays.filter((h) => h.holiday_date.startsWith(monthPrefix)),
    teamName,
  ).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));

  // Selected day: explicit ?date= in this month, else today, else first holiday, else the 1st.
  const selected =
    (selectedDate?.startsWith(monthPrefix) && selectedDate) ||
    (today.startsWith(monthPrefix) && today) ||
    monthHolidays[0]?.holiday_date ||
    isoDate(year, month, 1);

  const leading = (utcDate(isoDate(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const cells: { day: number; current: boolean }[] = [
    ...Array.from({ length: leading }, (_, i) => ({
      day: prevMonthDays - leading + 1 + i,
      current: false,
    })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      current: true,
    })),
  ];
  for (let d = 1; cells.length % 7 !== 0; d++) cells.push({ day: d, current: false });

  const entryLabel = (h: Holiday) => (h.team_id ? `${h.name} · ${teamName(h.team_id)}` : h.name);

  // Every day's detail panel is rendered here on the server (so back-office
  // action buttons work); the client just shows the selected one.
  const renderPanel = (date: string) => {
    const entries = byDate.get(date) ?? [];
    const weekday = (utcDate(date).getUTCDay() + 6) % 7;
    return (
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

        {entries.length === 0 ? (
          <div className={`mt-4 border-t pt-4 ${theme.divider}`}>
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
              {weekday >= 5 ? "วันหยุดสุดสัปดาห์" : "วันทำงานปกติ"}
            </span>
            <p className="mt-2 text-sm text-gray-600">ไม่มีวันหยุดหรือ WFH ในวันนี้</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map((h) => (
              <li key={h.id} className={`border-t pt-3 ${theme.divider}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={h.type} config={HOLIDAY_TYPES} />
                  <TeamTag name={teamName(h.team_id)} companyWide={h.team_id === null} />
                </div>
                <p className={`mt-2 font-medium ${theme.text}`}>{h.name}</p>
                {h.note && <p className="mt-0.5 text-sm text-gray-600">{h.note}</p>}
                {entryActions && <div className="mt-2 flex flex-wrap gap-2">{entryActions(h, date)}</div>}
              </li>
            ))}
          </ul>
        )}
        {addAction && <div className={`mt-4 border-t pt-4 ${theme.divider}`}>{addAction(date)}</div>}
      </>
    );
  };
  const panels = Object.fromEntries(
    Array.from({ length: daysInMonth }, (_, i) => {
      const date = isoDate(year, month, i + 1);
      return [date, renderPanel(date)];
    }),
  );

  return (
    <DaySelection key={`${year}-${month}`} initial={selected}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
              {cells.map(({ day, current }, i) => {
                const edge = `${i < cells.length - 7 ? "border-b" : ""} ${i % 7 !== 6 ? "border-r" : ""} ${theme.divider}`;
                if (!current) {
                  return (
                    <div key={`x-${i}`} className={`min-h-14 p-1.5 text-sm text-gray-300 sm:min-h-24 sm:p-2.5 ${edge}`}>
                      {day}
                    </div>
                  );
                }
                const date = isoDate(year, month, day);
                const entries = byDate.get(date) ?? [];
                const cellType = entries.some((h) => h.type === "holiday") ? "holiday" : entries[0]?.type;
                const shown = entries.slice(0, 2);
                return (
                  <DayButton
                    key={date}
                    date={date}
                    title={entries.map(entryLabel).join("\n") || undefined}
                    className={`relative flex min-h-14 cursor-pointer flex-col items-start gap-1 p-1.5 text-left text-sm transition-colors sm:min-h-24 sm:p-2.5 ${edge}`}
                    selectedClassName={theme.selected}
                    idleClassName={`${cellType ? typeStyle(cellType).cell : "bg-white"} ${theme.cellHover}`}
                  >
                    <span className={date === today ? theme.today : `font-medium ${theme.text}`}>{day}</span>
                    {shown.map((h) => {
                      const style = typeStyle(h.type);
                      return (
                        <span key={h.id} className={`flex items-center gap-1.5 text-xs leading-snug ${style.label}`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                          <span className="hidden sm:line-clamp-1">{entryLabel(h)}</span>
                        </span>
                      );
                    })}
                    {entries.length > shown.length && (
                      <span className="hidden text-xs text-gray-500 sm:block">
                        +{entries.length - shown.length} รายการ
                      </span>
                    )}
                  </DayButton>
                );
              })}
            </div>
          </div>

          <aside className={`flex flex-col p-5 ${theme.card}`}>
            <h2 className={`text-lg font-semibold ${theme.text}`}>รายละเอียดวันหยุด</h2>
            <div className={`mt-4 rounded-xl p-4 ${theme.panel}`}>
              <SelectedPanel panels={panels} />
            </div>

            <div className={`mt-auto flex items-center gap-3 border-t pt-4 text-sm ${theme.divider} ${theme.muted}`}>
              <FontAwesomeIcon icon={faCalendarDays} className={`shrink-0 text-2xl ${theme.icon}`} />
              <span>{tip}</span>
            </div>
          </aside>
        </div>

        <div className={`p-5 ${theme.card}`}>
          <h2 className={`text-lg font-semibold ${theme.text}`}>วันหยุดในเดือนนี้</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${theme.headerRow}`}>
                  <th className="rounded-l-lg px-3 py-2 font-medium">วันที่</th>
                  <th className="px-3 py-2 font-medium">รายการ</th>
                  <th className="px-3 py-2 font-medium">ทีม</th>
                  <th className="rounded-r-lg px-3 py-2 font-medium">ประเภท</th>
                </tr>
              </thead>
              <tbody>
                {monthHolidays.map((h) => (
                  <tr key={h.id} className={`border-b last:border-b-0 ${theme.divider}`}>
                    <td className={`whitespace-nowrap px-3 py-3 ${theme.text}`}>
                      <SelectDateButton date={h.holiday_date}>{longThaiDate(h.holiday_date)}</SelectDateButton>
                    </td>
                    <td className={`px-3 py-3 ${theme.text}`}>
                      {h.name}
                      {h.note && <span className="block text-xs text-gray-500">{h.note}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <TeamTag name={teamName(h.team_id)} companyWide={h.team_id === null} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={h.type} config={HOLIDAY_TYPES} />
                    </td>
                  </tr>
                ))}
                {monthHolidays.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                      ไม่มีวันหยุดหรือวัน WFH ในเดือนนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DaySelection>
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
  const teamName = makeTeamName(teams);
  const colCount = actions ? 6 : 5;
  return (
    <div className={`overflow-x-auto ${theme.card}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b text-left text-xs font-medium uppercase ${theme.divider} ${theme.headerRow}`}>
            <th className="px-4 py-3">วันที่</th>
            <th className="px-4 py-3">ชื่อวันหยุด</th>
            <th className="px-4 py-3">ทีม</th>
            <th className="px-4 py-3">ประเภท</th>
            <th className="px-4 py-3">หมายเหตุ</th>
            {actions && <th className="px-4 py-3"></th>}
          </tr>
        </thead>
        <tbody>
          {holidays.map((h) => {
            const dateLabel = formatThaiDate(h.holiday_date, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <tr key={h.id} className={`border-t ${theme.divider} ${theme.cellHover}`}>
                <td className={`whitespace-nowrap px-4 py-3 font-medium ${theme.text}`}>
                  {dateHref ? (
                    <Link href={dateHref(h)} className="hover:underline">
                      {dateLabel}
                    </Link>
                  ) : (
                    dateLabel
                  )}
                </td>
                <td className={`px-4 py-3 ${theme.text}`}>{h.name}</td>
                <td className="px-4 py-3">
                  <TeamTag name={teamName(h.team_id)} companyWide={h.team_id === null} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={h.type} config={HOLIDAY_TYPES} />
                </td>
                <td className={`px-4 py-3 ${theme.muted}`}>{h.note ?? "-"}</td>
                {actions && <td className="px-4 py-3 text-right">{actions(h)}</td>}
              </tr>
            );
          })}
          {holidays.length === 0 && (
            <tr>
              <td colSpan={colCount} className={`px-4 py-6 text-center ${theme.muted}`}>
                ยังไม่มีข้อมูลวันหยุดในปีนี้
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
