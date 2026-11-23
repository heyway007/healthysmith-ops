import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { getPaging, paginate } from "@/lib/pagination";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faChevronLeft, faChevronRight, faEye, faPenToSquare, faXmark } from "@fortawesome/free-solid-svg-icons";
import { DateInput } from "@/components/ui/date-input";
import { FilterField, ListFilterForm, filterInputClassName } from "@/components/ui/list-filter";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { thaiDate } from "@/lib/thai-money";
import { StatusBadge } from "@/components/ui/status-badge";
import { bangkokToday, formatThaiDate } from "@/components/holidays/holiday-views";
import { MOVEMENT_TYPES, formatSignedQty, movementViewHref } from "../labels";
import { CancelWithReasonButton } from "@/components/ui/cancel-with-reason-button";
import { DisabledIconButton, RowActions } from "@/components/ui/row-actions";
import { cancelStockDocument } from "./actions";
import { IconLinkButton } from "@/components/ui/icon-link-button";

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    type?: string;
    saved?: string;
    cancelled?: string;
    error?: string;
    page?: string;
    size?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const paging = await getPaging(params);
  const month = params.month && MONTH_RE.test(params.month) ? params.month : bangkokToday().slice(0, 7);
  const type = params.type && params.type in MOVEMENT_TYPES ? params.type : "";
  const q = (params.q ?? "").trim();
  const rawFrom = DATE_RE.test(params.from ?? "") ? params.from! : "";
  const rawTo = DATE_RE.test(params.to ?? "") ? params.to! : "";
  const isRange = !!(rawFrom || rawTo);
  const supabase = await createClient();

  let query = supabase
    .from("stock_movements")
    .select("*")
    .gte("movement_date", isRange ? rawFrom || "2000-01-01" : `${month}-01`)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });
  query = isRange ? query.lte("movement_date", rawTo || "2999-12-31") : query.lt("movement_date", `${shiftMonth(month, 1)}-01`);
  if (type) query = query.eq("movement_type", type);
  const { data: periodMovements } = await query;

  const productIds = [...new Set((periodMovements ?? []).map((m) => m.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, sku, name, unit").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  // text search: document number, product code / name, or lot number
  const needle = q.toLowerCase();
  const movements = needle
    ? (periodMovements ?? []).filter((m) => {
        const p = productById.get(m.product_id);
        return [m.doc_number, p?.sku, p?.name, m.lot_number].join(" ").toLowerCase().includes(needle);
      })
    : (periodMovements ?? []);
  const hasFilter = !!(q || isRange);

  const docNumbers = [...new Set(movements.map((m) => m.doc_number).filter((d): d is string => !!d))];
  const { data: cancellations } = docNumbers.length
    ? await supabase.from("stock_document_cancellations").select("doc_number, reason").in("doc_number", docNumbers)
    : { data: [] };
  const cancelledDocs = new Map((cancellations ?? []).map((c) => [c.doc_number, c.reason]));
  const receiptIds = [...new Set(movements.map((m) => m.production_receipt_id).filter((x): x is string => !!x))];
  const { data: receipts } = receiptIds.length
    ? await supabase.from("production_receipts").select("id, production_order_id").in("id", receiptIds)
    : { data: [] };
  const orderByReceipt = new Map((receipts ?? []).map((r) => [r.id, r.production_order_id]));

  // month arrows and type pills keep the search text
  const href = (m: string, t: string) => {
    const sp = new URLSearchParams({ month: m });
    if (t) sp.set("type", t);
    if (q) sp.set("q", q);
    return `/admin/inventory/movements?${sp}`;
  };
  const fullDate = { day: "numeric", month: "short", year: "numeric" } as const;
  const periodLabel = isRange
    ? `${rawFrom ? formatThaiDate(rawFrom, fullDate) : "ตั้งแต่ต้น"} – ${rawTo ? formatThaiDate(rawTo, fullDate) : "ล่าสุด"}`
    : formatThaiDate(`${month}-01`, { month: "long", year: "numeric" });

  const paged = paginate(movements, paging);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">รับเข้า / เบิกออก</h2>
          <p className="mt-1 text-sm text-teal-700">ทุกรายการที่ทำให้สต๊อกเปลี่ยน — แก้ไข/ลบไม่ได้ ถ้าบันทึกผิดให้ยกเลิกเอกสารรับเข้า/เบิกออก (ระบบบันทึกรายการกลับให้) หรือปรับยอดด้วยการนับสต๊อก</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/inventory/movements/new?type=in" className={`flex items-center gap-2 ${submitButtonClassName}`}>
            <FontAwesomeIcon icon={faArrowDown} />
            รับเข้า
          </Link>
          <Link href="/admin/inventory/movements/new?type=out" className={`flex items-center gap-2 ${secondaryButtonClassName}`}>
            <FontAwesomeIcon icon={faArrowUp} />
            เบิกออก
          </Link>
        </div>
      </div>

      {params.error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{params.error}</p>}
      {params.cancelled && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ยกเลิกเอกสาร {params.cancelled} แล้ว — ระบบบันทึกรายการกลับสต๊อกให้เรียบร้อย
        </p>
      )}
      {params.saved && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          บันทึกเอกสาร {params.saved} แล้ว ·{" "}
          <Link
            href={`/admin/print/inventory/stock-documents?doc=${encodeURIComponent(params.saved)}`}
            target="_blank"
            className="underline"
          >
            พิมพ์เอกสาร
          </Link>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {isRange ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-medium text-teal-900">{periodLabel}</span>
            <Link href={href(month, type)} className="text-teal-500 hover:text-orange-600" aria-label="ล้างช่วงวันที่">
              <FontAwesomeIcon icon={faXmark} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={href(shiftMonth(month, -1), type)}
              className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
              aria-label="เดือนก่อน"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
            </Link>
            <span className="min-w-36 text-center font-medium text-teal-900">{periodLabel}</span>
            <Link
              href={href(shiftMonth(month, 1), type)}
              className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
              aria-label="เดือนถัดไป"
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-3" />
            </Link>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {[["", "ทั้งหมด"] as const, ...Object.entries(MOVEMENT_TYPES).map(([k, v]) => [k, v.label] as const)].map(
            ([key, label]) => (
              <Link
                key={key}
                href={href(month, key)}
                aria-current={type === key ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  type === key ? "bg-teal-700 text-white" : "bg-white text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"
                }`}
              >
                {label}
              </Link>
            ),
          )}
        </div>
      </div>

      <ListFilterForm
        action="/admin/inventory/movements"
        q={q}
        placeholder="เลขที่เอกสาร / รหัส-ชื่อสินค้า / เลข Lot"
        hidden={{ month: isRange ? "" : month, type }}
        active={hasFilter}
        clearHref={href(month, type).replace(/&?q=[^&]*/, "")}
      >
        <FilterField label="ตั้งแต่วันที่" htmlFor="from">
          <DateInput id="from" name="from" defaultValue={rawFrom} className={filterInputClassName} />
        </FilterField>
        <FilterField label="ถึงวันที่" htmlFor="to">
          <DateInput id="to" name="to" defaultValue={rawTo} className={filterInputClassName} />
        </FilterField>
      </ListFilterForm>
      {hasFilter && <p className="mt-3 text-sm text-teal-600">พบ {movements.length.toLocaleString()} รายการ</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[760px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">เลขที่เอกสาร</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">สินค้า</th>
              <th className="px-4 py-3 text-right">จำนวน</th>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((m) => {
              const p = productById.get(m.product_id);
              const viewHref = movementViewHref(m, m.production_receipt_id ? orderByReceipt.get(m.production_receipt_id) : undefined);
              const cancelReason = m.doc_number ? cancelledDocs.get(m.doc_number) : undefined;
              const isInOut = m.movement_type === "in" || m.movement_type === "out";
              const canCancel = !!m.doc_number && isInOut && !m.is_reversal && cancelReason === undefined;
              // why the cancel button is greyed out on this row
              const cancelDisabledReason = canCancel
                ? undefined
                : cancelReason !== undefined || m.is_reversal
                  ? "เอกสารนี้ยกเลิกแล้ว"
                  : m.movement_type === "adjust"
                    ? "ใบปรับยอดสต๊อกยกเลิกไม่ได้ — ให้นับสต๊อกใหม่"
                    : "ยกเลิกได้ที่หน้าใบผลิต (ใบรับสินค้าจากการผลิต)";
              return (
                <tr key={m.id} className="border-t border-teal-100 hover:bg-teal-50">
                  <td data-label="วันที่" className="whitespace-nowrap px-4 py-3 text-teal-700">{thaiDate(m.movement_date, true)}</td>
                  <td data-label="เลขที่เอกสาร" className="whitespace-nowrap px-4 py-3">
                    {viewHref ? (
                      <Link href={viewHref} title="ดูเอกสาร" className="font-medium text-teal-800 hover:text-orange-600">
                        {m.doc_number ?? "พิมพ์"}
                      </Link>
                    ) : (
                      <span className="text-teal-400">-</span>
                    )}
                  </td>
                  <td data-label="ประเภท" className="px-4 py-3">
                    <StatusBadge status={m.movement_type} config={MOVEMENT_TYPES} />
                    {m.is_reversal && (
                      <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">รายการกลับ</span>
                    )}
                    {cancelReason !== undefined && !m.is_reversal && (
                      <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">ยกเลิกแล้ว</span>
                    )}
                  </td>
                  <td data-label="สินค้า" className="px-4 py-3">
                    <Link
                      href={`/admin/inventory/stock/${m.product_id}`}
                      title={p?.name}
                      className="whitespace-nowrap font-medium text-teal-900 hover:text-orange-600"
                    >
                      {p?.sku}
                    </Link>
                  </td>
                  <td
                    data-label="จำนวน"
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                      m.quantity > 0 ? "text-emerald-700" : "text-orange-600"
                    }`}
                  >
                    {formatSignedQty(m.quantity)} <span className="text-xs font-normal text-teal-500">{p?.unit}</span>
                  </td>
                  <td data-label="Lot" className="px-4 py-3 text-teal-700">{m.lot_number ?? "-"}</td>
                  <td data-label="จัดการ" className="px-4 py-3">
                    <RowActions>
                      {viewHref ? (
                        <IconLinkButton href={viewHref} icon={faEye} label={`ดูเอกสาร ${m.doc_number ?? ""}`} />
                      ) : (
                        <DisabledIconButton icon={faEye} label="ไม่มีเอกสารให้ดู" />
                      )}
                      <DisabledIconButton
                        icon={faPenToSquare}
                        label={
                          m.production_receipt_id
                            ? "แก้ไขที่หน้าใบผลิต"
                            : "แก้ไขไม่ได้ — ให้ยกเลิกเอกสารแล้วบันทึกใหม่"
                        }
                      />
                      <CancelWithReasonButton
                        action={cancelStockDocument.bind(null, m.doc_number ?? "", "/admin/inventory/movements")}
                        title={`ยกเลิกเอกสาร ${m.doc_number}`}
                        description="ยกเลิกทั้งใบ ระบบจะบันทึกรายการกลับสต๊อกให้ และใบเดิมยังเก็บไว้เป็นประวัติ"
                        label={`ยกเลิกเอกสาร ${m.doc_number}`}
                        submitLabel="ยืนยันยกเลิกทั้งใบ"
                        reasonPlaceholder="เช่น บันทึกซ้ำ"
                        disabledReason={cancelDisabledReason}
                      />
                    </RowActions>
                  </td>
                </tr>
              );
            })}
            {movements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  {hasFilter ? "ไม่พบรายการตามเงื่อนไขนี้" : "เดือนนี้ยังไม่มีรายการ"}
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
