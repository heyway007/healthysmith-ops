"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarCheck, faPlus } from "@fortawesome/free-solid-svg-icons";

// Picking a day happens entirely in the browser: the month's data (and each
// day's server-rendered detail panel) is already on the page, so there's no
// server round trip. The URL's ?date= is kept in sync via replaceState so a
// reload or shared link still opens on the same day.

type Selection = { selected: string; select: (date: string) => void };

const SelectionContext = createContext<Selection | null>(null);

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("Day selection components must be inside <DaySelection>");
  return ctx;
}

export function DaySelection({ initial, children }: { initial: string; children: React.ReactNode }) {
  const [selected, setSelected] = useState(initial);
  const select = (date: string) => {
    setSelected(date);
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    window.history.replaceState(null, "", url);
  };
  return <SelectionContext.Provider value={{ selected, select }}>{children}</SelectionContext.Provider>;
}

export function DayButton({
  date,
  title,
  className,
  selectedClassName,
  idleClassName,
  children,
}: {
  date: string;
  title?: string;
  className: string;
  selectedClassName: string;
  idleClassName: string;
  children: React.ReactNode;
}) {
  const { selected, select } = useSelection();
  const isSelected = selected === date;
  return (
    <button
      type="button"
      onClick={() => select(date)}
      aria-pressed={isSelected}
      title={title}
      className={`${className} ${isSelected ? selectedClassName : idleClassName}`}
    >
      {children}
    </button>
  );
}

export type EmptyDayPanelStyle = {
  text: string;
  muted: string;
  icon: string;
  divider: string;
  /** Back office: "add" link for the day; "__DATE__" is replaced with the date. */
  addHref?: string;
  addClassName?: string;
};

/**
 * Shows the server-rendered panel for the selected day when it has entries;
 * days without entries (most of a year) get a simple panel built here, so the
 * server doesn't have to render one per day.
 */
export function SelectedPanel({
  panels,
  empty,
}: {
  panels: Record<string, React.ReactNode>;
  empty: EmptyDayPanelStyle;
}) {
  const { selected } = useSelection();
  if (panels[selected]) return <>{panels[selected]}</>;

  const date = new Date(`${selected}T00:00:00Z`);
  const fmt = (o: Intl.DateTimeFormatOptions) => date.toLocaleDateString("th-TH", { ...o, timeZone: "UTC" });
  const weekend = [0, 6].includes(date.getUTCDay());
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xl font-semibold ${empty.text}`}>{fmt({ day: "numeric", month: "long", year: "numeric" })}</p>
          <p className={`text-sm ${empty.muted}`}>วัน{fmt({ weekday: "long" }).replace(/^วัน/, "")}</p>
        </div>
        <FontAwesomeIcon icon={faCalendarCheck} className={`text-3xl ${empty.icon}`} />
      </div>
      <div className={`mt-4 border-t pt-4 ${empty.divider}`}>
        <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
          {weekend ? "วันหยุดสุดสัปดาห์" : "วันทำงานปกติ"}
        </span>
        <p className="mt-2 text-sm text-gray-600">ไม่มีวันหยุดหรือ WFH ในวันนี้</p>
      </div>
      {empty.addHref && (
        <div className={`mt-4 border-t pt-4 ${empty.divider}`}>
          <Link href={empty.addHref.replace("__DATE__", selected)} className={empty.addClassName}>
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            เพิ่มวันหยุด / WFH
          </Link>
        </div>
      )}
    </>
  );
}

export function SelectDateButton({ date, children }: { date: string; children: React.ReactNode }) {
  const { select } = useSelection();
  return (
    <button type="button" onClick={() => select(date)} className="text-left hover:underline">
      {children}
    </button>
  );
}
