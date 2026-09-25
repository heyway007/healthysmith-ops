"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PAGE = "/admin/hr/teams";

function teamError(err: unknown): never {
  const e = err as { code?: string; message?: string };
  const message = e?.code === "23505" ? "มีทีมชื่อนี้อยู่แล้ว" : (e?.message ?? "เกิดข้อผิดพลาด");
  redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
}

function revalidateTeams() {
  revalidatePath(PAGE);
  revalidatePath("/admin/holidays");
  revalidatePath("/holidays");
}

export async function createTeam(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`${PAGE}?error=${encodeURIComponent("กรุณากรอกชื่อทีม")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ name });
  if (error) teamError(error);
  revalidateTeams();
  redirect(PAGE);
}

export async function renameTeam(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`${PAGE}?error=${encodeURIComponent("กรุณากรอกชื่อทีม")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("teams").update({ name }).eq("id", id);
  if (error) teamError(error);
  revalidateTeams();
  redirect(PAGE);
}

/** Members are un-assigned (ON DELETE SET NULL); the team's WFH days are removed (CASCADE). */
export async function deleteTeam(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) teamError(error);
  revalidateTeams();
}
