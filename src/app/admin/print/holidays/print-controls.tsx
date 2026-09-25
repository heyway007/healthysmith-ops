"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPrint } from "@fortawesome/free-solid-svg-icons";
import { startNavigationProgress } from "@/components/ui/navigation-progress";

export type PrintOptions = {
  year: number;
  month: number;
  scope: "year" | "month";
  layout: "list" | "calendar";
  team: string; // "" = every team, otherwise company-wide + that team
  type: string; // "" = both, "holiday" or "wfh"
};

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const selectClassName =
  "rounded-lg border border-teal-200 bg-white py-1.5 pl-3 pr-8 text-sm text-teal-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

/** Settings bar above the printout (hidden when printing). Each change reloads the preview. */
export function PrintControls({ options, teams }: { options: PrintOptions; teams: { id: string; name: string }[] }) {
  const router = useRouter();

  const update = (patch: Partial<PrintOptions>) => {
    const next = { ...options, ...patch };
    const q = new URLSearchParams({
      year: String(next.year),
      month: String(next.month),
      scope: next.scope,
      layout: next.layout,
    });
    if (next.team) q.set("team", next.team);
    if (next.type) q.set("type", next.type);
    startNavigationProgress();
    router.replace(`/admin/print/holidays?${q}`);
  };

  const backQuery = new URLSearchParams({ view: "calendar", year: String(options.year), month: String(options.month) });
  if (options.team) backQuery.set("team", options.team);
  if (options.type) backQuery.set("type", options.type);

  const field = (label: string, control: React.ReactNode) => (
    <label className="flex items-center gap-2 text-sm text-teal-800">
      {label}
      {control}
    </label>
  );

  return (
    <div className="sticky top-0 z-10 border-b border-teal-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur print:hidden sm:px-8">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/admin/holidays?${backQuery}`}
          className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-800"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          กลับ
        </Link>

        {field(
          "ช่วง",
          <select
            value={options.scope}
            onChange={(e) => update({ scope: e.target.value as PrintOptions["scope"] })}
            className={selectClassName}
          >
            <option value="year">ทั้งปี</option>
            <option value="month">รายเดือน</option>
          </select>,
        )}
        {options.scope === "month" &&
          field(
            "เดือน",
            <select
              value={options.month}
              onChange={(e) => update({ month: Number(e.target.value) })}
              className={selectClassName}
            >
              {THAI_MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>,
          )}
        {field(
          "ปี",
          <select value={options.year} onChange={(e) => update({ year: Number(e.target.value) })} className={selectClassName}>
            {Array.from({ length: 7 }, (_, i) => options.year - 3 + i).map((y) => (
              <option key={y} value={y}>
                {y + 543}
              </option>
            ))}
          </select>,
        )}
        {field(
          "รูปแบบ",
          <select
            value={options.layout}
            onChange={(e) => update({ layout: e.target.value as PrintOptions["layout"] })}
            className={selectClassName}
          >
            <option value="list">ตาราง</option>
            <option value="calendar">ปฏิทิน</option>
          </select>,
        )}
        {field(
          "ทีม",
          <select value={options.team} onChange={(e) => update({ team: e.target.value })} className={selectClassName}>
            <option value="">ทุกทีม</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>,
        )}
        {field(
          "ประเภท",
          <select value={options.type} onChange={(e) => update({ type: e.target.value })} className={selectClassName}>
            <option value="">ทั้งหมด</option>
            <option value="holiday">วันหยุด</option>
            <option value="wfh">WFH</option>
          </select>,
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 rounded-lg border border-orange-600/40 bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700"
        >
          <FontAwesomeIcon icon={faPrint} />
          พิมพ์
        </button>
      </div>
    </div>
  );
}
