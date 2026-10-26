"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull } from "@/lib/forms";
import { branchLabel } from "@/lib/wht";

export type WhtFormState = { error: string } | null;

type LineInput = { income_type: string; description: string; pay_date: string; amount: number; tax: number };

/** Issue a 50 ทวิ certificate. The payer is our company as set up in
 * เอกสารภาษี → ข้อมูลบริษัท, snapshotted so later edits don't change it. */
export async function createWhtCertificate(_prev: WhtFormState, formData: FormData): Promise<WhtFormState> {
  let lines: LineInput[];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: "ข้อมูลรายการเงินได้ไม่ถูกต้อง" };
  }
  if (!Array.isArray(lines) || lines.length === 0) return { error: "กรุณาเพิ่มรายการเงินได้อย่างน้อย 1 รายการ" };

  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle();
  if (!company) return { error: "ยังไม่ได้ตั้งค่าข้อมูลบริษัท — ไปที่ เอกสารภาษี → ข้อมูลบริษัท ก่อน" };

  const field = (k: string) => emptyToNull(formData.get(k));
  const digits = (k: string) => field(k)?.replace(/\D/g, "") || null;
  const money = (k: string) => {
    const v = field(k);
    return v == null ? null : Number(v);
  };

  const { data: id, error } = await supabase.rpc("issue_wht_certificate", {
    p_cert: {
      book_number: field("book_number"),
      issue_date: field("issue_date"),
      purchase_bill_id: field("purchase_bill_id"),
      supplier_id: field("supplier_id"),
      payer_name: `${company.name} (${branchLabel(company.branch_code)})`,
      payer_tax_id: company.tax_id?.replace(/\D/g, "") || null,
      payer_address: company.address,
      payee_type: field("payee_type") ?? "juristic",
      payee_name: field("payee_name"),
      payee_tax_id: digits("payee_tax_id"),
      payee_address: field("payee_address"),
      form_type: field("form_type"),
      sequence_label: field("sequence_label"),
      payer_condition: field("payer_condition") ?? "withhold",
      payer_condition_other: field("payer_condition_other"),
      pf_license_no: field("pf_license_no"),
      pf_amount: money("pf_amount"),
      sso_amount: money("sso_amount"),
      sso_employer_no: field("sso_employer_no"),
      sso_card_no: field("sso_card_no"),
      signer_name: field("signer_name"),
      note: field("note"),
      replaces_id: field("replaces_id"),
      edit_reason: field("edit_reason"),
    },
    p_lines: lines,
  });

  if (error || !id) return { error: error?.message ?? "ออกหนังสือรับรองไม่สำเร็จ" };
  revalidatePath("/admin/tax-documents/wht");
  redirect(`/admin/tax-documents/wht/${id}`);
}
