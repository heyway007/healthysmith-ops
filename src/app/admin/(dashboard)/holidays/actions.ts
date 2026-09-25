"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";
import { holidayListUrl as listUrl } from "@/lib/holiday-types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function holidayFields(formData: FormData) {
  const type = String(formData.get("type") ?? "holiday");
  return {
    holiday_date: String(formData.get("holiday_date") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    type,
    note: emptyToNull(formData.get("note")),
    // Public holidays are always company-wide; only WFH can target a team.
    team_id: type === "wfh" ? emptyToNull(formData.get("team_id")) : null,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Why this date can't take the entry, or null if it's free. One entry per
 * date per team, and a team's WFH is pointless on a company-wide holiday/WFH day.
 */
async function conflictReason(supabase: Supabase, fields: ReturnType<typeof holidayFields>, excludeId?: string) {
  const { data, error } = await supabase
    .from("company_holidays")
    .select("id, team_id, name")
    .eq("holiday_date", fields.holiday_date);
  if (error) throw error;
  const others = (data ?? []).filter((r) => r.id !== excludeId);
  if (others.some((r) => r.team_id === fields.team_id)) {
    return fields.team_id ? "ทีมนี้มีรายการในวันที่นี้อยู่แล้ว" : "มีวันหยุด/WFH ทั้งบริษัทในวันที่นี้อยู่แล้ว";
  }
  const companyWide = others.find((r) => r.team_id === null);
  if (fields.team_id && companyWide) return `วันที่นี้เป็น "${companyWide.name}" ของทั้งบริษัทอยู่แล้ว`;
  return null;
}

function returnView(formData: FormData) {
  return formData.get("return_view") === "list" ? "list" : "calendar";
}

function revalidateHolidays() {
  revalidatePath("/admin/holidays");
  revalidatePath("/holidays");
}

export async function createHoliday(formData: FormData) {
  const supabase = await createClient();
  const fields = holidayFields(formData);
  const view = returnView(formData);
  try {
    if (!DATE_RE.test(fields.holiday_date) || !fields.name) throw new Error("กรุณากรอกวันที่และชื่อวันหยุด");
    const reason = await conflictReason(supabase, fields);
    if (reason) throw new Error(reason);

    const { error } = await supabase.from("company_holidays").insert(fields);
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    const q = new URLSearchParams({ error: message, view, date: fields.holiday_date });
    redirect(`/admin/holidays/new?${q}`);
  }
  revalidateHolidays();
  redirect(listUrl(view, fields.holiday_date));
}

export async function updateHoliday(id: string, formData: FormData) {
  const supabase = await createClient();
  const fields = holidayFields(formData);
  const view = returnView(formData);
  try {
    if (!DATE_RE.test(fields.holiday_date) || !fields.name) throw new Error("กรุณากรอกวันที่และชื่อวันหยุด");
    const reason = await conflictReason(supabase, fields, id);
    if (reason) throw new Error(reason);

    const { error } = await supabase.from("company_holidays").update(fields).eq("id", id);
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/holidays/${id}?${new URLSearchParams({ error: message, view })}`);
  }
  revalidateHolidays();
  redirect(listUrl(view, fields.holiday_date));
}

/** `returnTo` is set when deleting from the edit page, which no longer exists afterwards. */
export async function deleteHoliday(id: string, returnTo?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("company_holidays").delete().eq("id", id);
  if (error) redirect(`/admin/holidays?error=${encodeURIComponent(error.message)}`);
  revalidateHolidays();
  if (returnTo) redirect(returnTo);
}
