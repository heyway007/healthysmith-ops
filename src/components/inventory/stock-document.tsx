import type { Database } from "@/types/database.types";

// Building blocks for the printed inventory documents (ใบสั่งผลิต, ใบรับสินค้า
// จากการผลิต, ใบรับเข้า / ใบเบิก / ใบปรับยอด, ใบนับสต๊อก). One A4 sheet each,
// styled like the tax invoice: black rules, company header, signature boxes.

type Company = Database["public"]["Tables"]["companies"]["Row"];

/** 2026-10-21 -> 21/10/2569 */
export function docDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}/${m}/${y + 543}`;
}

export function DocSheet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="mx-auto mb-6 w-[210mm] max-w-full break-after-page bg-white p-[12mm] shadow-md last:break-after-auto print:mb-0 print:w-auto print:p-0 print:shadow-none"
      aria-label={label}
    >
      <article className="relative mx-auto flex min-h-[273mm] w-full max-w-[186mm] flex-col text-[12px] leading-snug text-black">
        {children}
      </article>
    </div>
  );
}

/** Company on the left, document title / number / date boxed on the right. */
export function DocHeader({
  company,
  title,
  titleEn,
  number,
  date,
  extra,
}: {
  company: Company | null;
  title: string;
  titleEn: string;
  number: string;
  date: string | null;
  /** extra rows for the number box, e.g. the production order a receipt belongs to */
  extra?: [label: string, value: React.ReactNode][];
}) {
  return (
    <header className="grid grid-cols-[1fr_64mm] gap-6">
      <div className="flex items-start gap-4">
        {company?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logo_url} alt="" className="h-16 w-16 shrink-0 object-contain" />
        )}
        <div>
          <p className="text-[16px] font-semibold">{company?.name ?? ""}</p>
          {company?.address && <p className="whitespace-pre-line">{company.address}</p>}
          {company?.phone && <p>โทร {company.phone}</p>}
        </div>
      </div>
      <div>
        <div className="border-2 border-black px-2 py-1.5 text-center font-bold">
          <p className="text-[15px]">{title}</p>
          <p className="text-[10px] tracking-wide">{titleEn}</p>
        </div>
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 border-2 border-black px-3 py-2">
          <dt className="text-[11px]">เลขที่ / No.</dt>
          <dd className="text-[14px] font-bold">{number}</dd>
          <dt className="text-[11px]">วันที่ / Date</dt>
          <dd className="text-[13px]">{docDate(date)}</dd>
          {extra?.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-[11px]">{label}</dt>
              <dd className="text-[13px]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

/** Label/value lines in a ruled box under the header. */
export function DocInfo({ rows }: { rows: [label: string, value: React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (shown.length === 0) return null;
  return (
    <section className="mt-3 border-2 border-black px-3 py-2">
      {shown.map(([label, value]) => (
        <p key={label} className="grid grid-cols-[34mm_1fr] gap-2 py-0.5">
          <span className="text-[11px]">{label}</span>
          <span>{value}</span>
        </p>
      ))}
    </section>
  );
}

export const docTableClassName = "mt-3 w-full border-collapse border-2 border-black [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:py-1 [&_th]:text-[11px] [&_th]:font-semibold";

export function CancelledStamp() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <span className="-rotate-30 rounded-2xl border-8 border-rose-500/40 px-10 py-2 text-7xl font-bold text-rose-500/40">
        ยกเลิก
      </span>
    </div>
  );
}

/** Signature boxes pinned to the bottom of the sheet. */
export function DocSignatures({ labels }: { labels: string[] }) {
  return (
    <footer
      className="mt-auto grid gap-4 pt-8 print-avoid-break"
      style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
    >
      {labels.map((label) => (
        <div key={label} className="border-2 border-black px-3 pb-2 pt-10 text-center">
          <p>(.......................................)</p>
          <p className="mt-1 font-semibold">{label}</p>
          <p className="mt-1 text-[11px]">วันที่ ........./........./.........</p>
        </div>
      ))}
    </footer>
  );
}
