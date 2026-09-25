import { createClient } from "@/lib/supabase/server";
import { getCurrentEmployee } from "@/lib/current-employee";
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

// Public page: anyone can view it without signing in (see src/lib/supabase/middleware.ts).
export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; year?: string; month?: string; date?: string; team?: string; type?: string; months?: string; from?: string; to?: string; lm?: string }>;
}) {
  const params = await searchParams;
  const { view, year, month, date, type, months, range, listMonth, fetchFrom, fetchTo } =
    parseHolidayParams(params);
  const theme = HOLIDAY_THEMES.portal;

  const supabase = await createClient();
  const employee = await getCurrentEmployee();
  const [{ data: holidays }, { data: teams }, { data: me }] = await Promise.all([
    supabase
      .from("company_holidays")
      .select("*")
      .gte("holiday_date", fetchFrom)
      .lte("holiday_date", fetchTo)
      .order("holiday_date", { ascending: true }),
    supabase.from("teams").select("id, name").order("name"),
    employee
      ? supabase.from("employees").select("team_id").eq("id", employee.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // ?team=<id> → company-wide days + that team; ?team=all → every team.
  // No choice yet: a signed-in employee sees their own team, visitors see every team.
  const myTeamId = me?.team_id ?? null;
  const chosen = params.team === "all" || teams?.some((t) => t.id === params.team) ? params.team! : undefined;
  const team = chosen ?? (myTeamId && teams?.some((t) => t.id === myTeamId) ? myTeamId : "all");
  const visible = (holidays ?? [])
    .filter((h) => team === "all" || h.team_id === null || h.team_id === team)
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

  return (
    <div className="space-y-5">
      <HolidayToolbar
        title="ปฏิทินวันหยุด"
        subtitle="ดูวันหยุดบริษัทและวัน WFH ของแต่ละทีม และวางแผนล่วงหน้า"
        basePath="/holidays"
        view={view}
        year={year}
        month={month}
        theme={theme}
        type={type}
        months={months}
        range={range}
        listMonth={listMonth}
        team={chosen}
        filter={
          <TeamFilter
            basePath="/holidays"
            view={view}
            year={year}
            month={month}
            type={type}
            months={months}
            range={range}
            listMonth={listMonth}
            teams={teams ?? []}
            value={team}
            allValue="all"
            myTeamId={myTeamId}
            selectClassName={theme.select}
          />
        }
      />
      {view === "calendar" ? (
        <HolidayCalendar
          basePath="/holidays"
          linkParams={{ team: chosen, type }}
          year={year}
          month={month}
          months={months}
          range={range}
          holidays={visible}
          teams={teams ?? []}
          theme={theme}
          selectedDate={date}
          tip="คลิกวันที่ในปฏิทินเพื่อดูรายละเอียด เลือกทีมด้านบนเพื่อดูวัน WFH ของทีมนั้น"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <HolidayMonthChips
              basePath="/holidays"
              year={year}
              listMonth={listMonth}
              entries={yearEntries}
              keepParams={{
                view: "list",
                year,
                month,
                ...(range ? range : { months: months !== 1 ? months : undefined }),
                team: chosen,
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
          />
        </div>
      )}
    </div>
  );
}
