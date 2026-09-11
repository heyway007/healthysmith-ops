import type { StatusConfig } from "@/components/ui/status-badge";

export const PR_STATUS: StatusConfig = {
  draft: { label: "ร่าง", className: "bg-teal-100 text-teal-700" },
  pending_approval: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  approved: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่อนุมัติ", className: "bg-rose-100 text-rose-700" },
  converted: { label: "แปลงเป็น PO แล้ว", className: "bg-cyan-100 text-cyan-700" },
  cancelled: { label: "ยกเลิก", className: "bg-gray-200 text-gray-600" },
};
