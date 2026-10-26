"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";

export type DocKind = "tax_invoice" | "wht";

const BASE: Record<DocKind, string> = {
  tax_invoice: "/admin/tax-documents/tax-invoices",
  wht: "/admin/tax-documents/wht",
};

function back(kind: DocKind, id: string, q: Record<string, string>): never {
  redirect(`${BASE[kind]}/${id}?${new URLSearchParams(q)}`);
}

/** Cancel (approver) or ask for cancellation (cancel permission only). The
 * database decides which, based on the user's permissions. */
export async function requestCancel(kind: DocKind, id: string, formData: FormData) {
  const reason = emptyToNull(formData.get("cancel_reason"));
  if (!reason) back(kind, id, { error: "กรุณาระบุเหตุผลที่ยกเลิก" });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_document_cancel", { p_kind: kind, p_id: id, p_reason: reason });
  if (error) back(kind, id, { error: error.message });

  revalidatePath(BASE[kind]);
  if (kind === "tax_invoice") revalidatePath("/admin/sales/orders");
  back(kind, id, { notice: data === "requested" ? "ส่งคำขอยกเลิกแล้ว — รอผู้อนุมัติ" : "ยกเลิกเอกสารแล้ว" });
}

export async function reviewCancel(kind: DocKind, id: string, approve: boolean, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_document_cancel", {
    p_kind: kind,
    p_id: id,
    p_approve: approve,
    p_note: emptyToNull(formData.get("review_note")),
  });
  if (error) back(kind, id, { error: error.message });

  revalidatePath(BASE[kind]);
  if (kind === "tax_invoice") revalidatePath("/admin/sales/orders");
  back(kind, id, { notice: approve ? "อนุมัติการยกเลิกแล้ว" : "ไม่อนุมัติการยกเลิก — เอกสารยังใช้งานได้ตามเดิม" });
}
