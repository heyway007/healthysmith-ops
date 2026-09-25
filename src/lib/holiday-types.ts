import type { StatusConfig } from "@/components/ui/status-badge";

// Shared between the HR back-office module and the employee portal calendar.
export const HOLIDAY_TYPES: StatusConfig = {
  holiday: { label: "วันหยุด", className: "bg-red-50 text-red-700" },
  wfh: { label: "Work From Home", className: "bg-sky-50 text-sky-700" },
};

/**
 * Back-office holidays page URL for a view, jumping to the month of `date`
 * (YYYY-MM-DD) if given. `type` sets the type filter (the page defaults to
 * public holidays only, so pass "wfh" / "all" when WFH days should show).
 */
export function holidayListUrl(view: string, date?: string, type?: string) {
  const [year, month] = (date ?? "").split("-");
  const q = new URLSearchParams({ view });
  if (type && type !== "holiday") q.set("type", type);
  if (year && month) {
    q.set("year", year);
    q.set("month", String(Number(month)));
  }
  return `/admin/holidays?${q}`;
}
