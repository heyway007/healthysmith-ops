import type { StatusConfig } from "@/components/ui/status-badge";

export const GR_STATUS: StatusConfig = {
  draft: { label: "ร่าง", className: "bg-teal-100 text-teal-700" },
  confirmed: { label: "ยืนยันรับของแล้ว", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ยกเลิก", className: "bg-rose-100 text-rose-700" },
};
