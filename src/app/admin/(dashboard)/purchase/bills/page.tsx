import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { getPaging, paginate } from "@/lib/pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faEye, faPenToSquare, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { DateInput } from "@/components/ui/date-input";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { IconLinkButton } from "@/components/ui/icon-link-button";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { bangkokToday, formatThaiDate } from "@/components/holidays/holiday-views";
import { ImageGallery } from "@/components/ui/image-gallery";
import { deleteBill } from "./actions";
import { attachmentViewsByBill } from "./attachments";
import { BILL_STATUS } from "./status";

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const inputClassName =
  "mt-1 rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

/** Payment-status choices for the filter (draft / pending_approval count as unpaid). */
const STATUS_FILTERS: { value: string; label: string; statuses: string[] }[] = [
  { value: "unpaid", label: "ค้างจ่าย", statuses: ["approved", "draft", "pending_approval"] },
  { value: "overdue", label: "เกินกำหนดจ่าย", statuses: ["overdue"] },
  { value: "partially_paid", label: "จ่ายบางส่วน", statuses: ["partially_paid"] },
  { value: "paid", label: "จ่ายแล้ว", statuses: ["paid"] },
];

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function PurchaseBillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    month?: string;
    page?: string;
    size?: string;
    q?: string;
    supplier?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const paging = await getPaging(params);
  const month = params.month && MONTH_RE.test(params.month) ? params.month : bangkokToday().slice(0, 7);
  const rawFrom = DATE_RE.test(params.from ?? "") ? params.from! : "";
  const rawTo = DATE_RE.test(params.to ?? "") ? params.to! : "";
  const isRange = !!(rawFrom || rawTo);
  const q = (params.q ?? "").trim().toLowerCase();
  const supplierFilter = params.supplier ?? "";
  const statusFilter = STATUS_FILTERS.find((o) => o.value === params.status);
  const supabase = await createClient();

  let billQuery = supabase
    .from("purchase_bills")
    .select("*")
    .neq("status", "cancelled")
    .gte("bill_date", isRange ? rawFrom || "2000-01-01" : `${month}-01`)
    .order("bill_date", { ascending: false })
    .order("created_at", { ascending: false });
  billQuery = isRange
    ? billQuery.lte("bill_date", rawTo || "2999-12-31")
    : billQuery.lt("bill_date", `${shiftMonth(month, 1)}-01`);
  if (supplierFilter) billQuery = billQuery.eq("supplier_id", supplierFilter);
  if (statusFilter) billQuery = billQuery.in("status", statusFilter.statuses);

  const [{ data: periodBills }, { data: suppliers }] = await Promise.all([
    billQuery,
    supabase.from("suppliers").select("id, name").order("name"),
  ]);
  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  const periodIds = (periodBills ?? []).map((b) => b.id);
  const { data: items } = periodIds.length
    ? await supabase
        .from("purchase_bill_items")
        .select("purchase_bill_id, description, sort_order")
        .in("purchase_bill_id", periodIds)
        .order("sort_order")
    : { data: [] as { purchase_bill_id: string; description: string | null }[] };

  // Text search: bill number, supplier invoice / note, supplier name, or any line item.
  const itemText = new Map<string, string>();
  for (const item of items ?? []) {
    itemText.set(item.purchase_bill_id, `${itemText.get(item.purchase_bill_id) ?? ""} ${item.description ?? ""}`);
  }
  const bills = q
    ? (periodBills ?? []).filter((b) =>
        [
          b.bill_number,
          b.supplier_invoice_number,
          b.invoice_number,
          b.delivery_note_number,
          b.note,
          supplierNameById.get(b.supplier_id),
          itemText.get(b.id),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : (periodBills ?? []);
  const hasFilter = !!(q || supplierFilter || statusFilter || isRange);

  const billIds = bills.map((b) => b.id);
  const shown = new Set(billIds);
  const attachmentsByBill = await attachmentViewsByBill(supabase, billIds);
  const itemsByBill = new Map<string, string[]>();
  for (const item of items ?? []) {
    if (!shown.has(item.purchase_bill_id)) continue;
    const list = itemsByBill.get(item.purchase_bill_id) ?? [];
    if (item.description) list.push(item.description);
    itemsByBill.set(item.purchase_bill_id, list);
  }

  const total = bills.reduce((sum, b) => sum + b.total_amount, 0);
  const unpaid = bills.reduce((sum, b) => sum + (b.outstanding_amount ?? 0), 0);
  const fullDate = { day: "numeric", month: "short", year: "numeric" } as const;
  const monthLabel = isRange
    ? `${rawFrom ? formatThaiDate(rawFrom, fullDate) : "ตั้งแต่ต้น"} – ${rawTo ? formatThaiDate(rawTo, fullDate) : "ล่าสุด"}`
    : formatThaiDate(`${month}-01`, { month: "long", year: "numeric" });

  // Month arrows keep the search / supplier / status choices.
  const monthHref = (m: string) => {
    const next = new URLSearchParams(
      Object.entries({ q: params.q ?? "", supplier: supplierFilter, status: statusFilter?.value ?? "" }).filter(([, v]) => v),
    );
    next.set("month", m);
    return `/admin/purchase/bills?${next.toString()}`;
  };

  const paged = paginate(bills, paging);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">รายการซื้อ</h2>
          <p className="mt-1 text-sm text-teal-700">ของที่ซื้อเข้าบริษัท ทั้งจ่ายแล้วและยังค้างจ่าย</p>
        </div>
        <Link
          href="/admin/purchase/bills/new"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faPlus} />
          จดรายการซื้อ
        </Link>
      </div>

      {params.error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{params.error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {isRange ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-medium text-teal-900">{monthLabel}</span>
            <Link href={monthHref(month)} className="text-teal-500 hover:text-orange-600" aria-label="ล้างช่วงวันที่">
              <FontAwesomeIcon icon={faXmark} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={monthHref(shiftMonth(month, -1))}
              className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
              aria-label="เดือนก่อน"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
            </Link>
            <span className="min-w-36 text-center font-medium text-teal-900">{monthLabel}</span>
            <Link
              href={monthHref(shiftMonth(month, 1))}
              className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
              aria-label="เดือนถัดไป"
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-3" />
            </Link>
          </div>
        )}
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
          <Stat label={isRange ? "ซื้อทั้งหมด" : "ซื้อทั้งเดือน"} value={total} />
          <Stat label="ยังค้างจ่าย" value={unpaid} className={unpaid > 0 ? "text-rose-600" : undefined} />
        </div>
      </div>

      <form method="get" action="/admin/purchase/bills" className="mt-4 flex flex-wrap items-end justify-end gap-3">
        {!isRange && <input type="hidden" name="month" value={month} />}
        <div className="min-w-64 flex-1">
          <label className="block text-xs font-medium text-teal-700" htmlFor="q">
            ค้นหา
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="เลขที่ / ร้าน-ผู้ขาย / รายการ / เลขใบกำกับ"
            className={`${inputClassName} w-full`}
          />
        </div>
        <div className="min-w-44">
          <label className="block text-xs font-medium text-teal-700" htmlFor="supplier">
            ร้าน / ผู้ขาย
          </label>
          <select id="supplier" name="supplier" defaultValue={supplierFilter} className={selectClassName}>
            <option value="">ทั้งหมด</option>
            {(suppliers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-700" htmlFor="status">
            จ่ายเงิน
          </label>
          <select id="status" name="status" defaultValue={statusFilter?.value ?? ""} className={selectClassName}>
            <option value="">ทั้งหมด</option>
            {STATUS_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-700" htmlFor="from">
            ตั้งแต่วันที่
          </label>
          <DateInput id="from" name="from" defaultValue={rawFrom} className={inputClassName} />
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-700" htmlFor="to">
            ถึงวันที่
          </label>
          <DateInput id="to" name="to" defaultValue={rawTo} className={inputClassName} />
        </div>
        <button type="submit" className={secondaryButtonClassName}>
          ค้นหา
        </button>
        {hasFilter && (
          <Link href={`/admin/purchase/bills?month=${month}`} className={secondaryButtonClassName}>
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      {hasFilter && <p className="mt-3 text-sm text-teal-600">พบ {bills.length.toLocaleString()} รายการ</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[860px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เลขที่</th>
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">ร้าน / ผู้ขาย</th>
              <th className="px-4 py-3">รายการ</th>
              <th className="px-4 py-3 text-right">ยอดรวม</th>
              <th className="px-4 py-3">จ่ายเงิน</th>
              <th className="px-4 py-3">ไฟล์แนบ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((b) => {
              const descriptions = itemsByBill.get(b.id) ?? [];
              return (
                <tr key={b.id} className="border-t border-teal-100 hover:bg-teal-50">
                  <td data-label="เลขที่" className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/admin/purchase/bills/${b.id}`}
                      className="font-mono text-xs font-medium text-teal-700 hover:text-orange-600"
                    >
                      {b.bill_number}
                    </Link>
                  </td>
                  <td data-label="วันที่" className="whitespace-nowrap px-4 py-3 text-teal-700">
                    {formatThaiDate(b.bill_date, { day: "numeric", month: "short" })}
                  </td>
                  <td data-label="ร้าน / ผู้ขาย" className="px-4 py-3 text-teal-900">{supplierNameById.get(b.supplier_id) ?? "-"}</td>
                  <td data-label="รายการ" className="px-4 py-3">
                    <Link
                      href={`/admin/purchase/bills/${b.id}`}
                      className="font-medium text-teal-800 hover:text-orange-600"
                    >
                      {descriptions[0] ?? ((attachmentsByBill.get(b.id)?.length ?? 0) > 0 ? "ตามไฟล์แนบ" : "-")}
                    </Link>
                    {descriptions.length > 1 && (
                      <span className="text-teal-500"> และอีก {descriptions.length - 1} รายการ</span>
                    )}
                  </td>
                  <td data-label="ยอดรวม" className="px-4 py-3 text-right font-medium text-teal-900">
                    {b.total_amount.toLocaleString()}
                  </td>
                  <td data-label="จ่ายเงิน" className="px-4 py-3">
                    <StatusBadge status={b.status} config={BILL_STATUS} />
                  </td>
                  <td data-label="ไฟล์แนบ" className="px-4 py-3">
                    <ImageGallery images={attachmentsByBill.get(b.id) ?? []} compact />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions>
                      <IconLinkButton href={`/admin/purchase/bills/${b.id}`} icon={faEye} label={`ดูรายละเอียด ${b.bill_number}`} />
                      <IconLinkButton href={`/admin/purchase/bills/${b.id}`} icon={faPenToSquare} label={`แก้ไข ${b.bill_number}`} />
                      <DeleteButton
                        action={deleteBill.bind(null, b.id)}
                        confirmMessage={`ลบรายการซื้อ ${b.bill_number}${descriptions[0] ? ` "${descriptions[0]}"` : ""}?`}
                      />
                    </RowActions>
                  </td>
                </tr>
              );
            })}
            {bills.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-teal-400">
                  {hasFilter ? "ไม่พบรายการซื้อตามเงื่อนไขนี้" : "เดือนนี้ยังไม่มีรายการซื้อ"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={paged.total} page={paged.page} size={paged.size} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white px-4 py-2 shadow-sm">
      <p className="text-xs font-medium text-teal-500">{label}</p>
      <p className={`text-lg font-semibold ${className ?? "text-teal-950"}`}>{value.toLocaleString()}</p>
    </div>
  );
}
