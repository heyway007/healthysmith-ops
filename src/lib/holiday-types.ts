import type { StatusConfig } from "@/components/ui/status-badge";

// Shared between the HR back-office module and the employee portal calendar.
export const HOLIDAY_TYPES: StatusConfig = {
  holiday: { label: "วันหยุด", className: "bg-rose-100 text-rose-700" },
  wfh: { label: "Work From Home", className: "bg-sky-100 text-sky-700" },
};
