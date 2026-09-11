// Portal-scoped style constants (indigo/amber) -- deliberately separate from
// src/lib/ui-classes.ts (teal/orange) so the employee front office reads as
// a visually distinct app from the admin back office.

export const cardClassName = "rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm";

export const inputClassName =
  "mt-1 w-full rounded-lg border border-indigo-300 px-3 py-2 text-sm transition-shadow focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export const primaryButtonClassName =
  "w-fit rounded-lg border border-amber-600/40 bg-linear-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/30 transition-colors hover:from-amber-600 hover:to-amber-700";

export const secondaryButtonClassName =
  "w-fit rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50";

export const dangerButtonClassName =
  "w-fit rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50";
