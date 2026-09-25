"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { startNavigationProgress } from "@/components/ui/navigation-progress";

/**
 * Calendar team filter: `allValue` = every team, otherwise company-wide days +
 * that team's WFH. The public page uses allValue="all" so "every team" can be
 * chosen explicitly even when the default is the viewer's own team.
 */
export function TeamFilter({
  basePath,
  view,
  year,
  month,
  type,
  months,
  range,
  listMonth,
  teams,
  value,
  allValue = "",
  myTeamId,
  selectClassName,
}: {
  basePath: string;
  view: string;
  year: number;
  month: number;
  /** Holiday / WFH filter to keep when switching team. */
  type?: string;
  /** Months in the period, kept when switching team. */
  months?: number;
  /** Custom date range, kept when switching team. */
  range?: { from: string; to: string };
  /** List view month button ("all" or YYYY-MM), kept when switching team. */
  listMonth?: string;
  teams: { id: string; name: string }[];
  value: string;
  allValue?: string;
  /** Marks the signed-in employee's own team in the list. */
  myTeamId?: string | null;
  selectClassName: string;
}) {
  const router = useRouter();

  return (
    // No text label beside it (it broke up the row of controls): a team icon inside the
    // field says what it is, and aria-label names it for screen readers.
    <div className="relative w-full sm:w-auto">
      <FontAwesomeIcon
        icon={faUserGroup}
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
      />
      <select
        aria-label="ทีม"
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams(
            view === "list" || listMonth ? { view, year: String(year) } : { view, year: String(year), month: String(month) },
          );
          if (e.target.value) q.set("team", e.target.value);
          if (type && type !== "holiday") q.set("type", type);
          if (view === "calendar" && !(listMonth && listMonth !== "all")) {
            if (range) {
              q.set("from", range.from);
              q.set("to", range.to);
            } else if (months && months !== 1) q.set("months", String(months));
          }
          if (listMonth) q.set("lm", listMonth);
          startNavigationProgress();
          router.push(`${basePath}?${q}`);
        }}
        className={`w-full py-2.5! pl-9! sm:w-48 ${selectClassName}`}
      >
        <option value={allValue}>ทุกทีม</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.id === myTeamId ? " (ทีมของคุณ)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
