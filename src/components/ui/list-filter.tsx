import Link from "next/link";
import { secondaryButtonClassName } from "@/lib/ui-classes";

export const filterInputClassName =
  "mt-1 rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

/** One labelled field of a <ListFilterForm> (a select, a date input, ...). */
export function FilterField({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-teal-700" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * The search row above a list: a wide "ค้นหา" box, extra fields (children),
 * the ค้นหา button and — when a filter is active — "ล้างตัวกรอง".
 * `hidden` carries the params that must survive a search (month, view, ...).
 */
export function ListFilterForm({
  action,
  q,
  placeholder,
  hidden = {},
  active,
  clearHref,
  actions,
  children,
}: {
  action: string;
  q: string;
  placeholder: string;
  hidden?: Record<string, string>;
  active: boolean;
  clearHref: string;
  /** extra buttons at the end of the row (e.g. print) */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <form method="get" action={action} className="mt-4 flex flex-wrap items-end justify-end gap-3">
      {Object.entries(hidden).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
      <FilterField label="ค้นหา" htmlFor="q" className="min-w-64 flex-1">
        <input id="q" name="q" defaultValue={q} placeholder={placeholder} className={`${filterInputClassName} w-full`} />
      </FilterField>
      {children}
      <button type="submit" className={secondaryButtonClassName}>
        ค้นหา
      </button>
      {active && (
        <Link href={clearHref} className={secondaryButtonClassName}>
          ล้างตัวกรอง
        </Link>
      )}
      {actions}
    </form>
  );
}
