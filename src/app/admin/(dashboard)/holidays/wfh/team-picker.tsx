"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/ui-classes";

/** Step 1 of the recurring-WFH page: picking a team reloads the page scoped to it. */
export function TeamPicker({
  teams,
  value,
  tab,
}: {
  teams: { id: string; name: string }[];
  value: string;
  tab: string;
}) {
  const router = useRouter();
  return (
    <select
      id="team"
      value={value}
      onChange={(e) =>
        router.push(`/admin/holidays/wfh?${new URLSearchParams({ tab, team: e.target.value })}`)
      }
      className={`max-w-sm ${selectClassName}`}
    >
      <option value="" disabled>
        - เลือกทีม -
      </option>
      <option value="company">ทั้งบริษัท (ทุกทีม)</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
