export const selectClassName =
  "mt-1 w-full rounded-lg border border-teal-300 py-2 pl-3 pr-8 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

export const formCardClassName =
  "rounded-2xl border border-teal-100 bg-linear-to-b from-white to-teal-50/40 p-6 shadow-sm";

/** Primary action -- gradient fill, plus a subtle rim so it still reads as
 * a framed button rather than just a colored patch of text. */
export const submitButtonClassName =
  "w-fit rounded-lg border border-orange-600/40 bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 transition-colors hover:from-orange-600 hover:to-orange-700";

/** Secondary action -- outlined, teal. For things like "cancel", "close",
 * "submit for approval" that shouldn't compete with the primary button. */
export const secondaryButtonClassName =
  "w-fit rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50";

/** Destructive/negative action -- outlined, rose. For "reject", "cancel
 * document", "deactivate". */
export const dangerButtonClassName =
  "w-fit rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50";
