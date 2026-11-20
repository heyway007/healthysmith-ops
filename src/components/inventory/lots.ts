// Lot helpers shared by server pages and client components (no "use client").

/** One row of the product_lot_stock view. `lot_number` null = ไม่ระบุล็อต. */
export type LotOption = {
  product_id: string;
  lot_number: string | null;
  expiry_date: string | null;
  on_hand: number;
  received_date: string | null;
};

/** "ใกล้หมดอายุ" when this many days or fewer are left. */
export const NEAR_EXPIRY_DAYS = 60;

/** Select value standing for the ไม่ระบุล็อต bucket (an empty value would mean "not chosen"). */
export const UNLOTTED = "__unlotted__";
export const UNLOTTED_LABEL = "ไม่ระบุล็อต";

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};

export type ExpiryStatus = { key: "expired" | "near" | "ok" | "none"; label: string; className: string; days: number | null };

/** Where a lot stands against its expiry date, as of `today` (YYYY-MM-DD). */
export function expiryStatus(expiry: string | null | undefined, today: string): ExpiryStatus {
  if (!expiry) return { key: "none", label: "ไม่ระบุวันหมดอายุ", className: "bg-gray-100 text-gray-500", days: null };
  const days = dayNumber(expiry) - dayNumber(today);
  if (days < 0) return { key: "expired", label: "หมดอายุแล้ว", className: "bg-rose-100 text-rose-700", days };
  if (days <= NEAR_EXPIRY_DAYS) {
    return { key: "near", label: days === 0 ? "หมดอายุวันนี้" : `เหลือ ${days} วัน`, className: "bg-amber-100 text-amber-700", days };
  }
  return { key: "ok", label: "ปกติ", className: "bg-emerald-100 text-emerald-700", days };
}

/** First-expiring-first-out: soonest expiry first (no expiry last), then the
 * earliest received; the ไม่ระบุล็อต bucket always comes last. */
export function fefoSort<T extends { lot_number: string | null; expiry_date: string | null; received_date: string | null }>(
  lots: T[],
): T[] {
  const key = (l: T) => [
    l.lot_number === null ? 1 : 0,
    l.expiry_date ?? "9999-12-31",
    l.received_date ?? "9999-12-31",
    l.lot_number ?? "",
  ];
  return [...lots].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  });
}

/** The lot to issue first: the soonest-expiring one that hasn't expired yet
 * (an expired lot is only suggested when every lot has expired). */
export function recommendedLot<T extends { expiry_date: string | null }>(sorted: T[], today: string): T | undefined {
  return sorted.find((l) => !l.expiry_date || !today || l.expiry_date >= today) ?? sorted[0];
}

/** The lots of a product that can still be issued, in FEFO order. */
export function issuableLots(lots: LotOption[], productId: string) {
  return fefoSort(lots.filter((l) => l.product_id === productId && l.on_hand > 0));
}

export const lotValue = (l: { lot_number: string | null }) => l.lot_number ?? UNLOTTED;

/** 2028-01-31 -> 31/01/2028 */
export function shortDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
