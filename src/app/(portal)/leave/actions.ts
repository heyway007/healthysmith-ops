"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";
import { getCurrentEmployee } from "@/lib/current-employee";

function daysBetweenInclusive(start: string, end: string): number {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return diff > 0 ? diff : 1;
}

export async function createLeaveRequest(formData: FormData) {
  try {
    const employee = await getCurrentEmployee();
    if (!employee) throw new Error("บัญชีนี้ยังไม่ได้ผูกกับข้อมูลพนักงาน");

    const leave_type_id = String(formData.get("leave_type_id") ?? "");
    const start_date = String(formData.get("start_date") ?? "");
    const end_date = String(formData.get("end_date") ?? "");
    const reason = emptyToNull(formData.get("reason"));

    if (!leave_type_id) throw new Error("กรุณาเลือกประเภทการลา");
    if (!start_date || !end_date) throw new Error("กรุณาระบุวันที่ลา");
    if (end_date < start_date) throw new Error("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มลา");

    const supabase = await createClient();
    const { error } = await supabase.from("leave_requests").insert({
      employee_id: employee.id,
      leave_type_id,
      start_date,
      end_date,
      days_count: daysBetweenInclusive(start_date, end_date),
      reason,
    });
    if (error) throw error;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/leave/new?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/leave");
  revalidatePath("/");
  redirect("/leave");
}

export async function withdrawLeaveRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leave_requests")
    .delete()
    .eq("id", id)
    .eq("status", "pending");
  if (error) redirect(`/leave/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/leave");
  revalidatePath("/");
  redirect("/leave");
}
