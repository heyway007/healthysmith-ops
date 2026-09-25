"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";
import { holidayListUrl } from "@/lib/holiday-types";

// Recurring WFH is stored as one company_holidays row per day (not a rule),
// so every generated day can still be edited, moved or deleted on its own.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE = "/admin/holidays/wfh";

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
};

function readRange(formData: FormData) {
  if (formData.get("whole_year")) {
    const year = Number(formData.get("year"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("กรุณาเลือกปี");
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  const start = String(formData.get("start_date") ?? "");
  const end = String(formData.get("end_date") ?? "");
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) throw new Error("กรุณาเลือกช่วงวันที่ให้ครบ");
  if (start > end) throw new Error("วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด");
  if ((toDate(end).getTime() - toDate(start).getTime()) / 86_400_000 > 366 * 2) {
    throw new Error("ช่วงวันที่ยาวเกิน 2 ปี");
  }
  return { start, end };
}

function readWeekday(formData: FormData, name: string) {
  const n = Number(formData.get(name));
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("กรุณาเลือกวันในสัปดาห์");
  return n;
}

function readWeekdays(formData: FormData) {
  const weekdays = formData.getAll("weekdays").map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  if (weekdays.length === 0) throw new Error("กรุณาเลือกอย่างน้อย 1 วันในสัปดาห์");
  return weekdays;
}

function datesOnWeekdays(start: string, end: string, weekdays: number[]) {
  const dates: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (weekdays.includes(toDate(d).getUTCDay())) dates.push(d);
  }
  return dates;
}

/** Calendar month to land on afterwards: today's, if it falls inside the range. */
function focusDate({ start, end }: { start: string; end: string }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  return today >= start && today <= end ? today : start;
}

/** "" = whole company (team_id NULL). */
function readTeam(formData: FormData) {
  return emptyToNull(formData.get("team_id"));
}

type Row = { id: string; holiday_date: string; type: string; team_id: string | null };

/** A date is taken for a team if it has a company-wide entry or that team's own entry. */
const blocks = (row: Row, teamId: string | null) => row.team_id === null || row.team_id === teamId;

function fail(tab: string, teamId: string | null, err: unknown): never {
  const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
  redirect(`${PAGE}?${new URLSearchParams({ tab, team: teamId ?? "company", error: message })}`);
}

function done(notice: string, date: string, teamId: string | null): never {
  revalidatePath("/admin/holidays");
  revalidatePath("/holidays");
  const q = new URLSearchParams({ notice });
  if (teamId) q.set("team", teamId);
  redirect(`${holidayListUrl("calendar", date)}&${q}`);
}

async function rowsInRange(start: string, end: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_holidays")
    .select("id, holiday_date, type, team_id")
    .gte("holiday_date", start)
    .lte("holiday_date", end)
    .order("holiday_date");
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function createRecurringWfh(formData: FormData) {
  const teamId = readTeam(formData);
  let inserted = 0;
  let skipped = 0;
  let first = "";
  try {
    const { start, end } = readRange(formData);
    const weekdays = readWeekdays(formData);
    const name = String(formData.get("name") ?? "").trim() || "Work From Home";
    const note = emptyToNull(formData.get("note"));

    const dates = datesOnWeekdays(start, end, weekdays);
    const taken = new Set((await rowsInRange(start, end)).filter((r) => blocks(r, teamId)).map((r) => r.holiday_date));

    const rows = dates
      .filter((d) => !taken.has(d))
      .map((d) => ({ holiday_date: d, name, type: "wfh", note, team_id: teamId }));
    skipped = dates.length - rows.length;
    if (rows.length === 0) throw new Error("ไม่มีวันที่ต้องเพิ่ม — ทุกวันในช่วงนี้มีรายการอยู่แล้ว");

    const supabase = await createClient();
    const { error } = await supabase.from("company_holidays").insert(rows);
    if (error) throw error;
    inserted = rows.length;
    first = rows[0].holiday_date;
  } catch (err) {
    fail("create", teamId, err);
  }
  done(
    `เพิ่มวัน WFH ${inserted} วัน${skipped ? ` (ข้าม ${skipped} วันที่มีวันหยุด/WFH อยู่แล้ว)` : ""}`,
    first,
    teamId,
  );
}

export async function moveRecurringWfh(formData: FormData) {
  const teamId = readTeam(formData);
  let moved = 0;
  let skipped = 0;
  let start = "";
  try {
    const range = readRange(formData);
    start = focusDate(range);
    const from = readWeekday(formData, "from_weekday");
    const to = readWeekday(formData, "to_weekday");
    if (from === to) throw new Error("วันต้นทางและปลายทางต้องไม่ใช่วันเดียวกัน");

    // Look a week either side so targets just outside the range are checked too.
    const rows = await rowsInRange(addDays(range.start, -7), addDays(range.end, 7));
    const taken = new Set(rows.filter((r) => blocks(r, teamId)).map((r) => r.holiday_date));
    const toMove = rows.filter(
      (r) =>
        r.type === "wfh" &&
        r.team_id === teamId &&
        r.holiday_date >= range.start &&
        r.holiday_date <= range.end &&
        toDate(r.holiday_date).getUTCDay() === from,
    );
    if (toMove.length === 0) throw new Error("ไม่พบวัน WFH ของทีมนี้ในวันที่เลือกในช่วงนี้");

    const supabase = await createClient();
    for (const r of toMove) {
      const target = addDays(r.holiday_date, to - from); // same week, Mon–Fri
      if (taken.has(target)) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("company_holidays").update({ holiday_date: target }).eq("id", r.id);
      if (error) throw error;
      taken.delete(r.holiday_date);
      taken.add(target);
      moved++;
    }
  } catch (err) {
    fail("move", teamId, err);
  }
  done(
    `ย้ายวัน WFH ${moved} วัน${skipped ? ` (ข้าม ${skipped} วันที่วันปลายทางมีรายการอยู่แล้ว)` : ""}`,
    start,
    teamId,
  );
}

export async function deleteRecurringWfh(formData: FormData) {
  const teamId = readTeam(formData);
  let deleted = 0;
  let start = "";
  try {
    const range = readRange(formData);
    start = focusDate(range);
    const dates = datesOnWeekdays(range.start, range.end, readWeekdays(formData));

    const supabase = await createClient();
    const query = supabase.from("company_holidays").delete().eq("type", "wfh").in("holiday_date", dates);
    const { data, error } = await (teamId ? query.eq("team_id", teamId) : query.is("team_id", null)).select("id");
    if (error) throw error;
    deleted = data?.length ?? 0;
    if (deleted === 0) throw new Error("ไม่พบวัน WFH ของทีมนี้ในวันที่เลือกในช่วงนี้");
  } catch (err) {
    fail("delete", teamId, err);
  }
  done(`ลบวัน WFH ${deleted} วัน`, start, teamId);
}
