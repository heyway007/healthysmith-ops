"use client";

import { createContext, useContext, useState } from "react";

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

/** Shows the pre-rendered panel for whichever day is selected. */
export function SelectedPanel({ panels }: { panels: Record<string, React.ReactNode> }) {
  const { selected } = useSelection();
  return <>{panels[selected]}</>;
}

export function SelectDateButton({ date, children }: { date: string; children: React.ReactNode }) {
  const { select } = useSelection();
  return (
    <button type="button" onClick={() => select(date)} className="text-left hover:underline">
      {children}
    </button>
  );
}
