import { createClient } from "@/lib/supabase/server";
import { HOLIDAY_TYPES } from "@/lib/holiday-types";
import {
  TYPE_COLORS,
  bangkokToday,
  formatThaiDate,
  type Holiday,
  type TypeStyle,
} from "@/components/holidays/holiday-views";
import { PrintControls, type PrintOptions } from "./print-controls";

// Printable holiday calendar (A4): whole year or one month, as a table or as
// calendars, filtered by team and type. Opened from /admin/holidays.

const WEEKDAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const FALLBACK: TypeStyle = { cell: "", dot: "bg-gray-400", label: "text-gray-700", badge: "bg-gray-100 text-gray-700" };
const colors = (type: string) => TYPE_COLORS[type] ?? FALLBACK;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const monthName = (y: number, m: number) => formatThaiDate(iso(y, m, 1), { month: "long" });
const SHORT_LABEL: Record<string, string> = { holiday: "วันหยุด", wfh: "WFH" };

/** "name (team)" for team entries -- unless the name already mentions the team. */
function withTeam(h: Holiday, teamName: (id: string | null) => string) {
  if (!h.team_id) return h.name;
  const team = teamName(h.team_id);
  return h.name.includes(team) ? h.name : `${h.name} (${team})`;
}

export default async function PrintHolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; scope?: string; layout?: string; team?: string; type?: string }>;
}) {
  const params = await searchParams;
  const [todayYear, todayMonth] = bangkokToday().split("-").map(Number);
  const m = Number(params.month);

  const supabase = await createClient();
  const { data: teams } = await supabase.from("teams").select("id, name").order("name");

  const options: PrintOptions = {
    year: Number(params.year) || todayYear,
    month: m >= 1 && m <= 12 ? m : todayMonth,
    scope: params.scope === "month" ? "month" : "year",
    layout: params.layout === "calendar" ? "calendar" : "list",
    team: teams?.some((t) => t.id === params.team) ? params.team! : "",
    type: params.type === "holiday" || params.type === "wfh" ? params.type : "",
  };
  const { year, month, scope, layout, team, type } = options;

  const [from, to] =
    scope === "month"
      ? [iso(year, month, 1), iso(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate())]
      : [`${year}-01-01`, `${year}-12-31`];
  const { data } = await supabase
    .from("company_holidays")
    .select("*")
    .gte("holiday_date", from)
    .lte("holiday_date", to)
    .order("holiday_date");

  const holidays = (data ?? [])
    .filter((h) => !team || h.team_id === null || h.team_id === team)
    .filter((h) => !type || h.type === type)
    // Same day: company-wide first, public holiday before WFH.
    .sort(
      (a, b) =>
        a.holiday_date.localeCompare(b.holiday_date) ||
        Number(a.team_id !== null) - Number(b.team_id !== null) ||
        Number(a.type !== "holiday") - Number(b.type !== "holiday"),
    );

  const teamById = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const teamName = (id: string | null) => (id ? (teamById.get(id) ?? "-") : "ทั้งบริษัท");
  const months = scope === "month" ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
  const inMonth = (mm: number) => holidays.filter((h) => h.holiday_date.startsWith(`${year}-${pad(mm)}-`));

  const title = scope === "month" ? `${monthName(year, month)} ${year + 543}` : `ปี พ.ศ. ${year + 543}`;
  const filterText = [
    `ทีม: ${team ? teamName(team) : "ทุกทีม"}`,
    `ประเภท: ${type ? HOLIDAY_TYPES[type].label : "วันหยุดและ WFH"}`,
  ].join(" · ");
  const countOf = (t: string) => holidays.filter((h) => h.type === t).length;
  const printedOn = formatThaiDate(bangkokToday(), { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PrintControls options={options} teams={teams ?? []} />

      {/* The "paper": A4-wide preview on screen, plain page when printed. */}
      <article className="mx-auto my-6 max-w-[210mm] bg-white p-[12mm] text-gray-900 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-gray-900 pb-3">
          <div>
            <h1 className="text-2xl font-bold">ปฏิทินวันหยุดบริษัท</h1>
            <p className="text-lg">{title}</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>{filterText}</p>
            <p>พิมพ์เมื่อ {printedOn}</p>
          </div>
        </header>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {(!type || type === "holiday") && (
            <Legend type="holiday" text={`วันหยุด ${countOf("holiday")} วัน`} />
          )}
          {(!type || type === "wfh") && <Legend type="wfh" text={`WFH ${countOf("wfh")} วัน`} />}
        </div>

        {holidays.length === 0 ? (
          <p className="mt-8 text-center text-gray-500">ไม่มีวันหยุดหรือวัน WFH ในช่วงที่เลือก</p>
        ) : layout === "list" ? (
          <ListLayout months={months} year={year} inMonth={inMonth} teamName={teamName} />
        ) : scope === "month" ? (
          <MonthCalendar year={year} month={month} entries={inMonth(month)} teamName={teamName} large />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 print:grid-cols-3">
            {months.map((mm) => (
              <MonthCalendar key={mm} year={year} month={mm} entries={inMonth(mm)} teamName={teamName} />
            ))}
          </div>
        )}
      </article>
    </>
  );
}

function Legend({ type, text }: { type: string; text: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-sm ${colors(type).dot}`} />
      {text}
    </span>
  );
}

function ListLayout({
  months,
  year,
  inMonth,
  teamName,
}: {
  months: number[];
  year: number;
  inMonth: (m: number) => Holiday[];
  teamName: (id: string | null) => string;
}) {
  return (
    <div className="mt-4 space-y-5">
      {months
        .filter((m) => inMonth(m).length > 0)
        .map((m) => (
          <section key={m} className="print-avoid-break">
            <h2 className="mb-1 text-base font-semibold">
              {monthName(year, m)} {year + 543}
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-gray-300 bg-gray-50 text-left text-xs text-gray-600">
                  <th className="w-24 px-2 py-1.5 font-medium">วันที่</th>
                  <th className="w-20 px-2 py-1.5 font-medium">วัน</th>
                  <th className="px-2 py-1.5 font-medium">รายการ</th>
                  <th className="w-32 px-2 py-1.5 font-medium">ทีม</th>
                  <th className="w-20 px-2 py-1.5 font-medium">ประเภท</th>
                </tr>
              </thead>
              <tbody>
                {inMonth(m).map((h) => (
                  <tr key={h.id} className="border-b border-gray-200 align-top">
                    <td className="px-2 py-1.5 tabular-nums">
                      {formatThaiDate(h.holiday_date, { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-2 py-1.5">{formatThaiDate(h.holiday_date, { weekday: "short" })}</td>
                    <td className="px-2 py-1.5">
                      {h.name}
                      {h.note && <span className="block text-xs text-gray-500">{h.note}</span>}
                    </td>
                    <td className="px-2 py-1.5">{teamName(h.team_id)}</td>
                    <td className="px-2 py-1.5">
                      <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${colors(h.type).badge}`}>
                        {SHORT_LABEL[h.type] ?? h.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
    </div>
  );
}

/** One month grid (Mon-first). `large` = single-month printout with names in the cells. */
function MonthCalendar({
  year,
  month,
  entries,
  teamName,
  large = false,
}: {
  year: number;
  month: number;
  entries: Holiday[];
  teamName: (id: string | null) => string;
  large?: boolean;
}) {
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const byDay = new Map<number, Holiday[]>();
  for (const h of entries) {
    const d = Number(h.holiday_date.slice(8));
    byDay.set(d, [...(byDay.get(d) ?? []), h]);
  }
  const label = (h: Holiday) => withTeam(h, teamName);

  return (
    <section className={`print-avoid-break ${large ? "mt-4" : ""}`}>
      <h2 className={`font-semibold ${large ? "mb-2 text-lg" : "mb-1 text-sm"}`}>
        {monthName(year, month)} {large ? year + 543 : ""}
      </h2>
      <div className="grid grid-cols-7 border-l border-t border-gray-300 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className={`border-b border-r border-gray-300 bg-gray-50 py-0.5 text-gray-600 ${large ? "text-xs" : "text-[9px]"}`}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const list = d ? (byDay.get(d) ?? []) : [];
          const main = list.find((h) => h.type === "holiday") ?? list[0];
          const weekend = i % 7 >= 5;
          return (
            <div
              key={i}
              className={`border-b border-r border-gray-300 ${large ? "min-h-[22mm] p-1 text-left" : "py-0.5 text-[10px]"} ${
                main ? colors(main.type).cell : weekend && d ? "bg-gray-50" : ""
              }`}
            >
              {d && (
                <>
                  <span className={`${main ? `font-semibold ${colors(main.type).label}` : weekend ? "text-gray-400" : ""} ${large ? "text-xs" : ""}`}>
                    {d}
                  </span>
                  {large &&
                    list.map((h) => (
                      <span key={h.id} className={`mt-0.5 block text-[10px] leading-tight ${colors(h.type).label}`}>
                        {label(h)}
                      </span>
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>
      {!large && entries.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[9px] leading-tight text-gray-700">
          {entries.map((h) => (
            <li key={h.id} className="flex gap-1">
              <span className="w-4 shrink-0 text-right font-semibold tabular-nums">{Number(h.holiday_date.slice(8))}</span>
              <span className={colors(h.type).label}>{label(h)}</span>
            </li>
          ))}
        </ul>
      )}
      {large && entries.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {entries.map((h) => (
            <li key={h.id} className="flex gap-3">
              <span className="w-24 shrink-0 tabular-nums">
                {formatThaiDate(h.holiday_date, { weekday: "short", day: "numeric", month: "short" })}
              </span>
              <span className={colors(h.type).label}>{label(h)}</span>
              {h.note && <span className="text-gray-500">— {h.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
