import type { StatusConfig } from "@/components/ui/status-badge";

export const LEAVE_STATUS: StatusConfig = {
  pending: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  approved: { label: "อนุมัติแล้ว", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่อนุมัติ", className: "bg-rose-100 text-rose-700" },
  cancelled: { label: "ยกเลิก", className: "bg-gray-200 text-gray-600" },
};
