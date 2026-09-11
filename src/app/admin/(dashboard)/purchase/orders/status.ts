import type { StatusConfig } from "@/components/ui/status-badge";

export const PO_STATUS: StatusConfig = {
  draft: { label: "ร่าง", className: "bg-teal-100 text-teal-700" },
  pending_approval: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  approved: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-700" },
  sent: { label: "ส่งให้ผู้ขายแล้ว", className: "bg-cyan-100 text-cyan-700" },
  partially_received: { label: "รับของบางส่วน", className: "bg-amber-100 text-amber-700" },
  received: { label: "รับของครบแล้ว", className: "bg-emerald-100 text-emerald-700" },
  closed: { label: "ปิดงาน", className: "bg-gray-200 text-gray-600" },
  cancelled: { label: "ยกเลิก", className: "bg-rose-100 text-rose-700" },
};
