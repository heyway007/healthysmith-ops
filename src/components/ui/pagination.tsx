"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PAGE_SIZES, PAGE_SIZE_COOKIE } from "@/lib/page-sizes";

// One-off messages that shouldn't follow the user to the next page.
const TRANSIENT = ["saved", "cancelled", "error", "notice", "received"];

const pill = "rounded-full px-3 py-1.5 text-xs font-medium sm:py-1";
const pillOn = "bg-teal-700 text-white";
const pillOff = "bg-white text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50";

/** 1 … 4 5 6 … 20 */
function pageNumbers(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/**
 * Footer of a list: "แสดง 1–10 จาก 120 รายการ", the rows-per-page choice
 * (10 / 50 / 100, remembered in a cookie) and page links. Keeps the list's
 * other filters in the URL. Hidden when everything fits on the first page of 10.
 */
export function Pagination({ total, page, size }: { total: number; page: number; size: number }) {
  const pathname = usePathname();
  const current = useSearchParams();
  if (total <= PAGE_SIZES[0]) return null;

  const pages = Math.max(1, Math.ceil(total / size));
  const href = (changes: Record<string, string | null>) => {
    const q = new URLSearchParams(current.toString());
    for (const k of TRANSIENT) q.delete(k);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <nav aria-label="เลือกหน้า" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-teal-700">
      <p>
        แสดง {from.toLocaleString()}–{to.toLocaleString()} จาก {total.toLocaleString()} รายการ
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs">แสดง</span>
        {PAGE_SIZES.map((n) => (
          <Link
            key={n}
            href={href({ size: String(n), page: null })}
            onClick={() => {
              document.cookie = `${PAGE_SIZE_COOKIE}=${n}; path=/; max-age=31536000; samesite=lax`;
            }}
            aria-current={n === size ? "true" : undefined}
            className={`${pill} ${n === size ? pillOn : pillOff}`}
          >
            {n}
          </Link>
        ))}
        <span className="text-xs">รายการ / หน้า</span>
      </div>

      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className={`${pill} ${pillOff}`}>
              ‹ ก่อนหน้า
            </Link>
          ) : (
            <span className={`${pill} cursor-not-allowed bg-gray-50 text-gray-300 ring-1 ring-gray-200`}>‹ ก่อนหน้า</span>
          )}
          {pageNumbers(page, pages).map((n, i) =>
            n === "…" ? (
              <span key={`gap${i}`} className="px-1 text-teal-400">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href({ page: n === 1 ? null : String(n) })}
                aria-current={n === page ? "page" : undefined}
                className={`${pill} ${n === page ? pillOn : pillOff}`}
              >
                {n}
              </Link>
            ),
          )}
          {page < pages ? (
            <Link href={href({ page: String(page + 1) })} className={`${pill} ${pillOff}`}>
              ถัดไป ›
            </Link>
          ) : (
            <span className={`${pill} cursor-not-allowed bg-gray-50 text-gray-300 ring-1 ring-gray-200`}>ถัดไป ›</span>
          )}
        </div>
      )}
    </nav>
  );
}
