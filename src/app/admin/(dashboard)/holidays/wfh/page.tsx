import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { Field } from "@/components/ui/field";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { createClient } from "@/lib/supabase/server";
import {
  dangerButtonClassName,
  formCardClassName,
  selectClassName,
  submitButtonClassName,
} from "@/lib/ui-classes";
import { createRecurringWfh, deleteRecurringWfh, moveRecurringWfh } from "../wfh-actions";
import { ConfirmSubmit } from "./confirm-submit";
import { PeriodFields } from "./period-fields";
import { TeamPicker } from "./team-picker";
import { WORKDAYS, WeekdayCheckboxes } from "./weekday-checkboxes";

const TABS = [
  { key: "create", label: "ตั้งวัน WFH ประจำสัปดาห์" },
  { key: "move", label: "ย้ายวัน WFH" },
  { key: "delete", label: "ยกเลิกวัน WFH" },
] as const;

export default async function RecurringWfhPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; team?: string; error?: string }>;
}) {
  const { tab: tabParam, team: teamParam = "", error } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "create";
  const today = bangkokToday();
  const year = Number(today.slice(0, 4));
  const yearEnd = `${year}-12-31`;

  const supabase = await createClient();
  const { data: teams } = await supabase.from("teams").select("id, name").order("name");

  // "company" = whole company (team_id NULL); otherwise a team id; "" = not chosen yet.
  const team = teamParam === "company" || teams?.some((t) => t.id === teamParam) ? teamParam : "";
  const teamId = team === "company" ? null : team;
  const teamName = team === "company" ? "ทั้งบริษัท" : teams?.find((t) => t.id === team)?.name;

  // This year's WFH for the chosen team, counted per weekday, so HR can see what's already set.
  let summary: { label: string; count: number }[] = [];
  if (team) {
    const base = supabase
      .from("company_holidays")
      .select("holiday_date")
      .eq("type", "wfh")
      .gte("holiday_date", `${year}-01-01`)
      .lte("holiday_date", yearEnd);
    const { data } = await (teamId ? base.eq("team_id", teamId) : base.is("team_id", null));
    summary = WORKDAYS.map((d) => ({
      label: d.label,
      count: (data ?? []).filter((r) => new Date(`${r.holiday_date}T00:00:00Z`).getUTCDay() === d.value).length,
    })).filter((s) => s.count > 0);
  }

  const teamField = <input type="hidden" name="team_id" value={teamId ?? ""} />;
  const period = <PeriodFields year={year} start={today} end={yearEnd} />;

  return (
    <div>
      <BackLink href="/admin/holidays?view=calendar" label="กลับไปหน้าวันหยุดบริษัท" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">วัน WFH ประจำสัปดาห์</h2>
      <p className="mt-1 text-sm text-teal-700">
        แต่ละทีมมีวัน WFH ต่างกันได้ ระบบจะสร้างวัน WFH ให้ทุกสัปดาห์ แต่ละวันยังแก้ไข ย้าย หรือลบทีละวันได้จากปฏิทิน
      </p>

      <div className={`mt-5 max-w-xl ${formCardClassName}`}>
        <label htmlFor="team" className="block text-sm font-semibold text-teal-900">
          1. เลือกทีม
        </label>
        <div className="mt-2">
          <TeamPicker teams={teams ?? []} value={team} tab={tab} />
        </div>
        {(teams ?? []).length === 0 && (
          <p className="mt-2 text-xs text-teal-600">
            ยังไม่มีทีม —{" "}
            <Link href="/admin/hr/teams" className="font-medium underline">
              สร้างทีม
            </Link>{" "}
            ก่อน หรือเลือก &quot;ทั้งบริษัท&quot;
          </p>
        )}
        {team && (
          <p className="mt-3 text-sm text-teal-800">
            WFH ปี {year + 543} ของ <b>{teamName}</b>:{" "}
            {summary.length ? summary.map((s) => `${s.label} ${s.count} วัน`).join(" · ") : "ยังไม่มี"}
          </p>
        )}
      </div>

      {!team ? (
        <p className="mt-4 max-w-xl rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          เลือกทีมก่อน แล้วจึงตั้ง ย้าย หรือยกเลิกวัน WFH ของทีมนั้น
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm font-semibold text-teal-900">2. เลือกสิ่งที่ต้องการทำ</p>
          <nav className="mt-2 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 sm:w-fit">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/admin/holidays/wfh?${new URLSearchParams({ tab: t.key, team })}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-white text-teal-800 shadow-sm" : "text-teal-600 hover:bg-white"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          <div className={`mt-4 max-w-xl ${formCardClassName}`}>
            {error && <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}

            {tab === "create" && (
              <form action={createRecurringWfh} className="space-y-5">
                {teamField}
                <WeekdayCheckboxes label={`${teamName} WFH ทุกวัน (เลือกได้หลายวัน)`} />
                {period}
                <Field label="ชื่อที่แสดงในปฏิทิน" name="name" defaultValue="Work From Home" />
                <Field label="หมายเหตุ (ถ้ามี)" name="note" />
                <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  วันหยุดบริษัท หรือวันที่ทีมนี้มี WFH อยู่แล้ว จะถูกข้ามให้อัตโนมัติ
                </p>
                <button type="submit" className={submitButtonClassName}>
                  สร้างวัน WFH
                </button>
              </form>
            )}

            {tab === "move" && (
              <form action={moveRecurringWfh} className="space-y-5">
                {teamField}
                <div className="grid gap-4 sm:grid-cols-2">
                  <WeekdaySelect label="ย้ายจากทุกวัน" name="from_weekday" defaultValue={2} />
                  <WeekdaySelect label="ไปเป็นวัน (สัปดาห์เดียวกัน)" name="to_weekday" defaultValue={3} />
                </div>
                {period}
                <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  ย้ายเฉพาะวัน WFH ของ {teamName} ถ้าวันปลายทางเป็นวันหยุดหรือมี WFH อยู่แล้ว วันนั้นจะไม่ถูกย้าย
                  ถ้าจะย้ายแค่วันเดียว ให้คลิกวันนั้นในปฏิทินแล้วแก้วันที่
                </p>
                <button type="submit" className={submitButtonClassName}>
                  ย้ายวัน WFH
                </button>
              </form>
            )}

            {tab === "delete" && (
              <form action={deleteRecurringWfh} className="space-y-5">
                {teamField}
                <WeekdayCheckboxes label={`ยกเลิก WFH ของ ${teamName} ทุกวัน`} tone="orange" />
                {period}
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
                  ลบเฉพาะวัน WFH ของ {teamName} วันหยุดบริษัทและ WFH ของทีมอื่นจะไม่ถูกลบ
                </p>
                <ConfirmSubmit
                  message={`ยืนยันการลบวัน WFH ของ ${teamName} ตามที่เลือก?`}
                  className={dangerButtonClassName}
                >
                  ลบวัน WFH
                </ConfirmSubmit>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function WeekdaySelect({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-teal-800" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} defaultValue={defaultValue} className={selectClassName}>
        {WORKDAYS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );
}
