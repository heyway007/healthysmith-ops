import type { StatusConfig } from "@/components/ui/status-badge";

// Shared between the HR back-office module and the employee portal calendar.
export const HOLIDAY_TYPES: StatusConfig = {
  holiday: { label: "วันหยุด", className: "bg-rose-100 text-rose-700" },
  wfh: { label: "Work From Home", className: "bg-sky-100 text-sky-700" },
};

/** Back-office holidays page URL for a view, jumping to the month of `date` (YYYY-MM-DD) if given. */
export function holidayListUrl(view: string, date?: string) {
  const [year, month] = (date ?? "").split("-");
  const q = new URLSearchParams({ view });
  if (year && month) {
    q.set("year", year);
    q.set("month", String(Number(month)));
  }
  return `/admin/holidays?${q}`;
}
