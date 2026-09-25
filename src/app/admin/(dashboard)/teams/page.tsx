import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouseLaptop, faPen, faPlus } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { submitButtonClassName } from "@/lib/ui-classes";
import { deleteTeam } from "./actions";

const WEEKDAY_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const year = Number(bangkokToday().slice(0, 4));

  const supabase = await createClient();
  const [{ data: teams }, { data: members }, { data: wfh }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("employees").select("team_id, first_name, nickname").not("team_id", "is", null).order("first_name"),
    supabase
      .from("company_holidays")
      .select("team_id, holiday_date")
      .eq("type", "wfh")
      .not("team_id", "is", null)
      .gte("holiday_date", `${year}-01-01`)
      .lte("holiday_date", `${year}-12-31`),
  ]);

  const rows = (teams ?? []).map((t) => {
    const people = (members ?? []).filter((m) => m.team_id === t.id);
    const days = (wfh ?? []).filter((w) => w.team_id === t.id);
    // Weekdays this team works from home on, e.g. "อ. · พฤ."
    const weekdays = [...new Set(days.map((d) => new Date(`${d.holiday_date}T00:00:00Z`).getUTCDay()))]
      .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
      .map((d) => WEEKDAY_NAMES[d]);
    return { ...t, people, wfhDays: days.length, weekdays };
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-teal-950">ทีม</h1>
          <p className="mt-1 text-teal-700">
            ใช้กำหนดวัน WFH แยกตามทีม — กำหนดทีมให้พนักงานได้ที่หน้าแก้ไขพนักงาน
          </p>
        </div>
        <Link href="/admin/teams/new" className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}>
          <FontAwesomeIcon icon={faPlus} />
          เพิ่มทีม
        </Link>
      </div>

      {notice && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">ชื่อทีม</th>
              <th className="px-4 py-3">สมาชิก</th>
              <th className="px-4 py-3">WFH ปี {year + 543}</th>
              <th className="px-4 py-3">WFH ประจำวัน</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/teams/${t.id}`} className="font-medium text-teal-950 hover:text-orange-600">
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-900">
                  {t.people.length === 0 ? (
                    <span className="text-teal-400">ยังไม่มีสมาชิก</span>
                  ) : (
                    <>
                      <span className="font-medium tabular-nums">{t.people.length} คน</span>
                      <span className="ml-2 text-xs text-teal-600">
                        {t.people
                          .slice(0, 3)
                          .map((p) => p.nickname || p.first_name)
                          .join(", ")}
                        {t.people.length > 3 && ` +${t.people.length - 3}`}
                      </span>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {t.wfhDays > 0 ? (
                    <Link href={`/admin/holidays?team=${t.id}&type=wfh`} className="text-sky-700 hover:underline">
                      {t.wfhDays} วัน
                    </Link>
                  ) : (
                    <span className="text-teal-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {t.weekdays.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {t.weekdays.map((d) => (
                        <span key={d} className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                          {d}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-teal-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/holidays/wfh?team=${t.id}`}
                      title="ตั้งวัน WFH ของทีม"
                      className="rounded-full border border-sky-200 p-1.5 text-sky-600 transition-colors hover:bg-sky-50"
                    >
                      <FontAwesomeIcon icon={faHouseLaptop} />
                    </Link>
                    <Link
                      href={`/admin/teams/${t.id}`}
                      title="แก้ไข"
                      className="rounded-full border border-teal-200 p-1.5 text-teal-600 transition-colors hover:bg-teal-50"
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </Link>
                    <DeleteButton
                      action={deleteTeam.bind(null, t.id)}
                      confirmMessage={`ลบทีม "${t.name}"? สมาชิกจะถูกนำออกจากทีม และวัน WFH ของทีมนี้จะถูกลบด้วย`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-teal-400">
                  ยังไม่มีทีม — กด &quot;เพิ่มทีม&quot; เพื่อสร้างทีมแรก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
