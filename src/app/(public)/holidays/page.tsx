import { createClient } from "@/lib/supabase/server";
import { getCurrentEmployee } from "@/lib/current-employee";
import {
  HOLIDAY_THEMES,
  HolidayCalendar,
  HolidayList,
  HolidayMonthChips,
  HolidayPeriodSummary,
  HolidayToolbar,
  listMonthSet,
  listMonthsLabel,
  matchesType,
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
  const { view, year, month, date, type, months, range, listMonth, monthList, fetchFrom, fetchTo } =
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
    .filter((h) => matchesType(h.type, type));
  const yearEntries = visible.filter((h) => h.holiday_date.startsWith(`${year}-`));
  const pickedMonths = listMonthSet(listMonth);
  // List view: picked months, or the whole year when none are picked.
  const listEntries = pickedMonths.length
    ? visible.filter((h) => pickedMonths.includes(h.holiday_date.slice(0, 7)))
    : yearEntries;
  const listLabel = pickedMonths.length ? listMonthsLabel(pickedMonths) : `ทั้งปี ${year + 543}`;

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
        monthList={monthList}
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
          monthList={monthList}
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
