"use client";

import { useRouter } from "next/navigation";
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
  teams: { id: string; name: string }[];
  value: string;
  allValue?: string;
  /** Marks the signed-in employee's own team in the list. */
  myTeamId?: string | null;
  selectClassName: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      ทีม
      <select
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams({ view, year: String(year), month: String(month) });
          if (e.target.value) q.set("team", e.target.value);
          if (type) q.set("type", type);
          startNavigationProgress();
          router.push(`${basePath}?${q}`);
        }}
        className={selectClassName}
      >
        <option value={allValue}>ทุกทีม</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.id === myTeamId ? " (ทีมของคุณ)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
