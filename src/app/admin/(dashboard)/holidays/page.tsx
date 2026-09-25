import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouseLaptop, faPen, faPlus } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { holidayListUrl } from "@/lib/holiday-types";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import {
  HOLIDAY_THEMES,
  HolidayCalendar,
  HolidayList,
  HolidayToolbar,
  parseHolidayParams,
} from "@/components/holidays/holiday-views";
import { TeamFilter } from "@/components/holidays/team-filter";
import { deleteHoliday } from "./actions";

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
  }>;
}) {
  const params = await searchParams;
  const { view, year, month, date } = parseHolidayParams(params);
  const theme = HOLIDAY_THEMES.admin;

  const supabase = await createClient();
  const [{ data: holidays }, { data: teams }] = await Promise.all([
    supabase
      .from("company_holidays")
      .select("*")
      .gte("holiday_date", `${year}-01-01`)
      .lte("holiday_date", `${year}-12-31`)
      .order("holiday_date", { ascending: true }),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  // Team filter: none = every team; a team = company-wide days + that team's WFH.
  const team = teams?.some((t) => t.id === params.team) ? params.team : undefined;
  const visible = (holidays ?? []).filter((h) => !team || h.team_id === null || h.team_id === team);

  // Carried through the edit/new pages so saving lands back on the same view.
  const back = `view=${view}`;
  const smallButton = "flex items-center gap-2 px-3! py-1.5!";
  const returnTo = (d: string) => `${holidayListUrl("calendar", d)}${team ? `&team=${team}` : ""}`;

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
        team={team}
        filter={
          <TeamFilter
            basePath="/admin/holidays"
            view={view}
            year={year}
            month={month}
            teams={teams ?? []}
            value={team ?? ""}
            selectClassName={theme.select}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2">
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
          year={year}
          month={month}
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
          addAction={(selected) => (
            <Link
              href={`/admin/holidays/new?date=${selected}&${back}${team ? `&team=${team}` : ""}`}
              className={`${submitButtonClassName} ${smallButton}`}
            >
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              เพิ่มวันหยุด / WFH
            </Link>
          )}
        />
      ) : (
        <HolidayList
          holidays={visible}
          teams={teams ?? []}
          theme={theme}
          dateHref={(h) => `/admin/holidays/${h.id}?${back}`}
          actions={(h) => (
            <DeleteButton action={deleteHoliday.bind(null, h.id)} confirmMessage={`ลบ "${h.name}"?`} />
          )}
        />
      )}
    </div>
  );
}
