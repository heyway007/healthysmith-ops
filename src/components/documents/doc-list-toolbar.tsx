import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faFileExcel, faPrint, faXmark } from "@fortawesome/free-solid-svg-icons";
import { DOC_STATUS_OPTIONS, docFilterQuery, type parseDocFilters } from "@/lib/doc-list-filters";
import { secondaryButtonClassName, selectClassName } from "@/lib/ui-classes";
import { DateInput } from "@/components/ui/date-input";

type Filters = ReturnType<typeof parseDocFilters>;

const inputClassName =
  "mt-1 rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Period navigation + search (number / name / tax id, date range, status) +
 * Excel export and "print everything shown" for a tax-document list.
 */
export function DocListToolbar({
  basePath,
  printPath,
  filters: f,
  count,
  stats,
  searchPlaceholder,
}: {
  basePath: string;
  printPath: string;
  filters: Filters;
  count: number;
  stats: { label: string; value: string }[];
  searchPlaceholder: string;
}) {
  const href = (patch: Parameters<typeof docFilterQuery>[1] = {}) => `${basePath}?${docFilterQuery(f, patch)}`;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {f.isRange ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-medium text-teal-900">{f.label}</span>
            <Link href={`${basePath}?${docFilterQuery(f, { from: "", to: "", month: f.month })}`} className="text-teal-500 hover:text-orange-600" aria-label="ล้างช่วงวันที่">
              <FontAwesomeIcon icon={faXmark} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href={href({ month: shiftMonth(f.month, -1) })} className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50" aria-label="เดือนก่อน">
              <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
            </Link>
            <span className="min-w-36 text-center font-medium text-teal-900">{f.label}</span>
            <Link href={href({ month: shiftMonth(f.month, 1) })} className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50" aria-label="เดือนถัดไป">
              <FontAwesomeIcon icon={faChevronRight} className="w-3" />
            </Link>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-teal-100 bg-white px-4 py-2 text-right shadow-sm">
              <p className="text-xs text-teal-500">{s.label}</p>
              <p className="font-semibold text-teal-950">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <form method="get" action={basePath} className="mt-4 flex flex-wrap items-end gap-3">
        {!f.isRange && <input type="hidden" name="month" value={f.month} />}
        <div>
          <label className="block text-xs font-medium text-teal-700" htmlFor="q">
            ค้นหา
          </label>
          <input id="q" name="q" defaultValue={f.q} placeholder={searchPlaceholder} className={`${inputClassName} w-64`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-700" htmlFor="from">
            ตั้งแต่วันที่
          </label>
          <DateInput id="from" name="from" defaultValue={f.rawFrom} className={inputClassName} />
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-700" htmlFor="to">
            ถึงวันที่
          </label>
          <DateInput id="to" name="to" defaultValue={f.rawTo} className={inputClassName} />
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-700" htmlFor="status">
            สถานะ
          </label>
          <select id="status" name="status" defaultValue={f.status === "active" ? "" : f.status} className={selectClassName}>
            {DOC_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value === "active" ? "" : o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={secondaryButtonClassName}>
          ค้นหา
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`${basePath}/export?${docFilterQuery(f)}`} className={`${secondaryButtonClassName} inline-flex items-center gap-2`}>
            <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600" />
            ส่งออก Excel
          </a>
          <Link href={`${printPath}?${docFilterQuery(f)}`} target="_blank" className={`${secondaryButtonClassName} inline-flex items-center gap-2`}>
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์ทั้งหมดที่แสดง ({count})
          </Link>
        </div>
      </form>
    </>
  );
}

/** Small status chips next to a document number in a list. */
export function StatusTag({
  cancelled,
  pending,
  replaced,
  correction,
}: {
  cancelled: boolean;
  pending: boolean;
  replaced: boolean;
  correction: boolean;
}) {
  const tag = (text: string, cls: string) => <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${cls}`}>{text}</span>;
  return (
    <>
      {cancelled && tag(replaced ? "ยกเลิก (แก้ไขแล้ว)" : "ยกเลิก", "bg-gray-100 text-gray-500")}
      {!cancelled && pending && tag("รออนุมัติยกเลิก", "bg-amber-100 text-amber-700")}
      {correction && tag("ฉบับแก้ไข", "bg-sky-100 text-sky-700")}
    </>
  );
}
