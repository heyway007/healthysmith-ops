// Portal-scoped style constants (palette A: mist grey) -- deliberately separate from
// src/lib/ui-classes.ts (teal/orange) so the employee front office reads as
// a visually distinct app from the admin back office.

export const cardClassName = "rounded-2xl border border-mist-200 bg-white p-6 shadow-sm";

export const inputClassName =
  "mt-1 w-full rounded-lg border border-mist-300 px-3 py-2 text-sm transition-shadow focus:border-mist-600 focus:outline-none focus:ring-2 focus:ring-mist-200";

export const primaryButtonClassName =
  "w-fit rounded-lg border border-mist-800 bg-mist-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-mist-700";

export const secondaryButtonClassName =
  "w-fit rounded-lg border border-mist-300 bg-white px-4 py-2 text-sm font-medium text-mist-700 transition-colors hover:bg-mist-100";

export const dangerButtonClassName =
  "w-fit rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50";
