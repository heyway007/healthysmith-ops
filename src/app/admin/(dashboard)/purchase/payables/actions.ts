"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, numberOrDefault } from "@/lib/forms";
import { currentEmployeeId } from "@/lib/employee-picker";

export async function recordPayment(billId: string, formData: FormData) {
  const supabase = await createClient();
  try {
    const { data: bill } = await supabase
      .from("purchase_bills")
      .select("*")
      .eq("id", billId)
      .single();
    if (!bill) throw new Error("ไม่พบบิลซื้อ");
    if (!["approved", "partially_paid"].includes(bill.status)) {
      throw new Error("บันทึกจ่ายได้เฉพาะบิลที่อนุมัติแล้วเท่านั้น");
    }

    const amount = numberOrDefault(formData.get("amount"), 0);
    const outstanding = bill.outstanding_amount ?? bill.total_amount - bill.paid_amount;
    if (amount <= 0) throw new Error("จำนวนเงินต้องมากกว่า 0");
    if (amount > outstanding + 1e-9) throw new Error(`จำนวนเงินเกินยอดค้างชำระ (ค้าง ${outstanding})`);

    const created_by = await currentEmployeeId(supabase);

    const { error: paymentError } = await supabase.from("ap_payments").insert({
      supplier_id: bill.supplier_id,
      purchase_bill_id: billId,
      payment_date:
        String(formData.get("payment_date") || "").trim() || new Date().toISOString().slice(0, 10),
      payment_method: String(formData.get("payment_method") ?? "bank_transfer"),
      amount,
      reference_number: emptyToNull(formData.get("reference_number")),
      note: emptyToNull(formData.get("note")),
      created_by,
    });
    if (paymentError) throw paymentError;

    const newPaidAmount = bill.paid_amount + amount;
    const newStatus = newPaidAmount + 1e-9 >= bill.total_amount ? "paid" : "partially_paid";

    const { error: billError } = await supabase
      .from("purchase_bills")
      .update({ paid_amount: newPaidAmount, status: newStatus })
      .eq("id", billId);
    if (billError) throw billError;
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    redirect(`/admin/purchase/payables?bill=${billId}&error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/purchase/payables");
  revalidatePath("/admin/purchase/bills");
  redirect("/admin/purchase/payables");
}
