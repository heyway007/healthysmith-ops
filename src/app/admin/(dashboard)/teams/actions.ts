"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/teams";

function readName(formData: FormData) {
  return String(formData.get("name") ?? "").trim();
}

function describe(err: unknown) {
  const e = err as { code?: string; message?: string };
  return e?.code === "23505" ? "มีทีมชื่อนี้อยู่แล้ว" : (e?.message ?? "เกิดข้อผิดพลาด");
}

function revalidateTeams() {
  revalidatePath(PAGE);
  revalidatePath("/admin/holidays");
  revalidatePath("/holidays");
}

export async function createTeam(formData: FormData) {
  const name = readName(formData);
  if (!name) redirect(`${PAGE}/new?error=${encodeURIComponent("กรุณากรอกชื่อทีม")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ name });
  if (error) redirect(`${PAGE}/new?error=${encodeURIComponent(describe(error))}`);
  revalidateTeams();
  redirect(`${PAGE}?${new URLSearchParams({ notice: `เพิ่มทีม "${name}" แล้ว` })}`);
}

export async function updateTeam(id: string, formData: FormData) {
  const name = readName(formData);
  if (!name) redirect(`${PAGE}/${id}?error=${encodeURIComponent("กรุณากรอกชื่อทีม")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("teams").update({ name }).eq("id", id);
  if (error) redirect(`${PAGE}/${id}?error=${encodeURIComponent(describe(error))}`);
  revalidateTeams();
  redirect(`${PAGE}?${new URLSearchParams({ notice: `บันทึกทีม "${name}" แล้ว` })}`);
}

/**
 * Members are un-assigned (ON DELETE SET NULL); the team's WFH days are removed
 * (CASCADE). `returnTo` is set when deleting from the edit page.
 */
export async function deleteTeam(id: string, returnTo?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) redirect(`${PAGE}?error=${encodeURIComponent(describe(error))}`);
  revalidateTeams();
  if (returnTo) redirect(returnTo);
}
