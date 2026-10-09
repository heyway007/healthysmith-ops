import type { StatusConfig } from "@/components/ui/status-badge";

/** A purchase is simply paid, partly paid, or still owed. `draft` /
 * `pending_approval` only exist on records from the old PR/PO flow and are
 * shown as unpaid; saving one of them again moves it onto the simple flow. */
export const BILL_STATUS: StatusConfig = {
  approved: { label: "ค้างจ่าย", className: "bg-amber-100 text-amber-700" },
  draft: { label: "ค้างจ่าย", className: "bg-amber-100 text-amber-700" },
  pending_approval: { label: "ค้างจ่าย", className: "bg-amber-100 text-amber-700" },
  overdue: { label: "เกินกำหนดจ่าย", className: "bg-rose-100 text-rose-700" },
  partially_paid: { label: "จ่ายบางส่วน", className: "bg-cyan-100 text-cyan-700" },
  paid: { label: "จ่ายแล้ว", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ยกเลิก", className: "bg-gray-200 text-gray-600" },
};

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "เงินสด",
  bank_transfer: "โอนเงิน",
  cheque: "เช็ค",
  other: "อื่นๆ (บัตร/เงินสดย่อย)",
};

/** Status that matches how much of the purchase has been paid. */
export function statusForPaid(paid: number, total: number) {
  if (paid <= 0) return total <= 0 ? "paid" : "approved";
  return paid + 1e-9 >= total ? "paid" : "partially_paid";
}
