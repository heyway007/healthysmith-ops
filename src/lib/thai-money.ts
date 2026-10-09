// Money/date formatting for Thai sales documents. Client-safe.

export const VAT_RATE = 7;

/** 1234.5 -> "1,234.50" */
export function formatMoney(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** VAT-inclusive total -> { net, vat } (vat = total × 7/107, rounded to satang). */
export function splitVat(totalInclVat: number) {
  const vat = Math.round(((totalInclVat * VAT_RATE) / (100 + VAT_RATE)) * 100) / 100;
  return { net: Math.round((totalInclVat - vat) * 100) / 100, vat };
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** '2026-10-09' -> '9 ตุลาคม 2569' (or '9 ต.ค. 69' with short) */
export function thaiDate(iso: string | null | undefined, short = false) {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return short
    ? `${d} ${THAI_MONTHS_SHORT[m - 1]} ${String(y + 543).slice(-2)}`
    : `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

/** 'YYYY-MM' -> 'ตุลาคม 2569' */
export function thaiMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

/** Today in Bangkok as 'YYYY-MM-DD'. */
export function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/** First/last day of 'YYYY-MM'. */
export function monthRange(ym: string): [string, string] {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, "0")}`];
}

const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** Reads a whole number below one million (no "ล้าน"). */
function readBelowMillion(n: number, hasHigher: boolean): string {
  const digits = String(n).split("").map(Number);
  const len = digits.length;
  return digits
    .map((d, i) => {
      const place = len - 1 - i;
      if (d === 0) return "";
      if (place === 1 && d === 1) return "สิบ";
      if (place === 1 && d === 2) return "ยี่สิบ";
      if (place === 0 && d === 1 && (len > 1 || hasHigher)) return "เอ็ด";
      return DIGITS[d] + PLACES[place];
    })
    .join("");
}

function readNumber(n: number): string {
  if (n === 0) return "ศูนย์";
  let out = "";
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  if (millions > 0) out += readNumber(millions) + "ล้าน";
  if (rest > 0) out += readBelowMillion(rest, millions > 0);
  return out;
}

/** 1234.5 -> "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์", 100 -> "หนึ่งร้อยบาทถ้วน" */
export function bahtText(amount: number): string {
  const satangTotal = Math.round(Math.abs(amount) * 100);
  const baht = Math.floor(satangTotal / 100);
  const satang = satangTotal % 100;
  const prefix = amount < 0 ? "ลบ" : "";
  if (baht === 0 && satang === 0) return "ศูนย์บาทถ้วน";
  const bahtPart = baht > 0 ? readNumber(baht) + "บาท" : "";
  return prefix + bahtPart + (satang > 0 ? readNumber(satang) + "สตางค์" : "ถ้วน");
}
