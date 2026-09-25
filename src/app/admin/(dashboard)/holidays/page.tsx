import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouseLaptop, faPen, faPlus, faPrint } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import {
  HOLIDAY_THEMES,
  HolidayCalendar,
  HolidayList,
  HolidayMonthChips,
  HolidayPeriodSummary,
  periodBounds,
  periodLabel,
  HolidayToolbar,
  parseHolidayParams,
} from "@/components/holidays/holiday-views";
import { TeamFilter } from "@/components/holidays/team-filter";
import { deleteHoliday } from "./actions";
import { ResetPanel } from "./reset-panel";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    view?: string;
    year?: string;
    month?: string;
    date?: string;
    team?: string;
    type?: string;
    months?: string;
    from?: string;
    to?: string;
    lm?: string;
  }>;
}) {
  const params = await searchParams;
  const { view, year, month, date, type, months, range, listMonth, fetchFrom, fetchTo } =
    parseHolidayParams(params);
  const theme = HOLIDAY_THEMES.admin;

  const supabase = await createClient();
  const [{ data: holidays }, { data: teams }, { count: wfhAllYears }] = await Promise.all([
    supabase
      .from("company_holidays")
      .select("*")
      .gte("holiday_date", fetchFrom)
      .lte("holiday_date", fetchTo)
      .order("holiday_date", { ascending: true }),
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("company_holidays").select("id", { count: "exact", head: true }).eq("type", "wfh"),
  ]);

  // Team filter: none = every team; a team = company-wide days + that team's WFH.
  const team = teams?.some((t) => t.id === params.team) ? params.team : undefined;
  const visible = (holidays ?? [])
    .filter((h) => !team || h.team_id === null || h.team_id === team)
    .filter((h) => !type || h.type === type);
  // List view: the entries in the same period the calendar shows.
  const period = { year, month, months, range };
  const { start: periodStart, end: periodEnd } = periodBounds(period);
  const periodEntries = visible.filter((h) => h.holiday_date >= periodStart && h.holiday_date <= periodEnd);
  // Month buttons are separate from the period: a chosen month shows that whole month.
  const yearEntries = visible.filter((h) => h.holiday_date.startsWith(`${year}-`));
  const listEntries =
    listMonth === "all"
      ? yearEntries
      : listMonth
        ? visible.filter((h) => h.holiday_date.startsWith(`${listMonth}-`))
        : periodEntries;
  const listLabel =
    listMonth === "all"
      ? `ทั้งปี ${year + 543}`
      : listMonth
        ? periodLabel({ year: Number(listMonth.slice(0, 4)), month: Number(listMonth.slice(5, 7)), months: 1 })
        : periodLabel(period);

  // Carried through the edit/new pages so saving lands back on the same view.
  const back = `view=${view}`;
  const smallButton = "flex items-center gap-2 px-3! py-1.5!";
  const oneMonth = listMonth && listMonth !== "all" ? listMonth : undefined;
  // Print page opens with what's on screen: calendar view → that month, list view → the year.
  const printQuery = new URLSearchParams({
    year: String(year),
    month: oneMonth ? String(Number(oneMonth.slice(5, 7))) : String(month),
    scope: listMonth === "all" ? "year" : oneMonth || (months === 1 && !range) ? "month" : "year",
    layout: view === "calendar" ? "calendar" : "list",
  });
  if (team) printQuery.set("team", team);
  if (type) printQuery.set("type", type);
  const returnTo = (d: string) =>
    `/admin/holidays?${new URLSearchParams({
      view: "calendar",
      year: String(year),
      month: String(month),
      date: d,
      ...(range ? range : months > 1 ? { months: String(months) } : {}),
      ...(team ? { team } : {}),
      ...(type ? { type } : {}),
    })}`;

  return (
    <div className="space-y-5">
      <HolidayToolbar
        title="ปฏิทินวันหยุด"
        subtitle="จัดการวันหยุดและวัน Work From Home แยกตามทีม — พนักงานเห็นในหน้าบ้านทันที"
        basePath="/admin/holidays"
        view={view}
        year={year}
        month={month}
        theme={theme}
        type={type}
        months={months}
        range={range}
        listMonth={listMonth}
        team={team}
        filter={
          <TeamFilter
            basePath="/admin/holidays"
            view={view}
            year={year}
            month={month}
            type={type}
            months={months}
            range={range}
            listMonth={listMonth}
            teams={teams ?? []}
            value={team ?? ""}
            selectClassName={theme.select}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <ResetPanel
              year={year}
              month={month}
              wfhThisYear={(holidays ?? []).filter((h) => h.type === "wfh" && h.holiday_date.startsWith(`${year}-`)).length}
              wfhAllYears={wfhAllYears ?? 0}
            />
            <Link
              href={`/admin/print/holidays?${printQuery}`}
              className={`flex items-center gap-2 ${secondaryButtonClassName}`}
            >
              <FontAwesomeIcon icon={faPrint} />
              พิมพ์
            </Link>
            <Link
              href={`/admin/holidays/wfh${team ? `?team=${team}` : ""}`}
              className={`flex items-center gap-2 ${secondaryButtonClassName}`}
            >
              <FontAwesomeIcon icon={faHouseLaptop} />
              วัน WFH ประจำสัปดาห์
            </Link>
            <Link
              href={`/admin/holidays/new?${back}${team ? `&team=${team}` : ""}`}
              className={`flex items-center gap-2 ${submitButtonClassName}`}
            >
              <FontAwesomeIcon icon={faPlus} />
              เพิ่มวันหยุด
            </Link>
          </div>
        }
      />

      {params.notice && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{params.notice}</p>
      )}
      {params.error && <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{params.error}</p>}

      {view === "calendar" ? (
        <HolidayCalendar
          basePath="/admin/holidays"
          linkParams={{ team, type }}
          year={year}
          month={month}
          months={months}
          range={range}
          holidays={visible}
          teams={teams ?? []}
          theme={theme}
          selectedDate={date}
          tip="คลิกวันที่ในปฏิทินเพื่อดูรายละเอียด เพิ่ม แก้ไข หรือย้ายวัน — เลือกทีมด้านบนเพื่อดูเฉพาะทีม"
          entryActions={(holiday, selected) => (
            <>
              <Link
                href={`/admin/holidays/${holiday.id}?${back}`}
                className={`${secondaryButtonClassName} ${smallButton}`}
              >
                <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                แก้ไข / ย้ายวัน
              </Link>
              <DeleteButton
                action={deleteHoliday.bind(null, holiday.id, returnTo(selected))}
                confirmMessage={`ลบ "${holiday.name}"?`}
              />
            </>
          )}
          addHref={(d) => `/admin/holidays/new?date=${d}&${back}${team ? `&team=${team}` : ""}`}
          addButtonClassName={`${submitButtonClassName} ${smallButton}`}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <HolidayMonthChips
              basePath="/admin/holidays"
              year={year}
              listMonth={listMonth}
              entries={yearEntries}
              keepParams={{
                view: "list",
                year,
                month,
                ...(range ? range : { months: months !== 1 ? months : undefined }),
                team: team,
                type,
              }}
              theme={theme}
            />
            <HolidayPeriodSummary label={listLabel} entries={listEntries} theme={theme} />
          </div>
          <HolidayList
            holidays={listEntries}
            teams={teams ?? []}
            theme={theme}
            dateHref={(h) => `/admin/holidays/${h.id}?${back}`}
            actions={(h) => (
              <DeleteButton action={deleteHoliday.bind(null, h.id)} confirmMessage={`ลบ "${h.name}"?`} />
            )}
          />
        </div>
      )}
    </div>
  );
}
