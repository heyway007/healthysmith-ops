import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createClient } from "@/lib/supabase/server";
import { thaiDate } from "@/lib/thai-money";
import { StatusBadge } from "@/components/ui/status-badge";
import { bangkokToday, formatThaiDate } from "@/components/holidays/holiday-views";
import { MOVEMENT_TYPES, formatSignedQty, movementPrintHref } from "../labels";

const MONTH_RE = /^\d{4}-\d{2}$/;

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; type?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const month = params.month && MONTH_RE.test(params.month) ? params.month : bangkokToday().slice(0, 7);
  const type = params.type && params.type in MOVEMENT_TYPES ? params.type : "";
  const supabase = await createClient();

  let query = supabase
    .from("stock_movements")
    .select("*")
    .gte("movement_date", `${month}-01`)
    .lt("movement_date", `${shiftMonth(month, 1)}-01`)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (type) query = query.eq("movement_type", type);
  const { data: movements } = await query;

  const productIds = [...new Set((movements ?? []).map((m) => m.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, sku, name, unit").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const href = (m: string, t: string) => {
    const sp = new URLSearchParams({ month: m });
    if (t) sp.set("type", t);
    return `/admin/inventory/movements?${sp}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">รับเข้า / เบิกออก</h2>
          <p className="mt-1 text-sm text-teal-700">ทุกรายการที่ทำให้สต๊อกเปลี่ยน — แก้ไข/ลบไม่ได้ ถ้าบันทึกผิดให้บันทึกรายการกลับ หรือปรับยอดด้วยการนับสต๊อก</p>
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
        <div className="flex items-center gap-2">
          <Link
            href={href(shiftMonth(month, -1), type)}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนก่อน"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
          </Link>
          <span className="min-w-36 text-center font-medium text-teal-900">
            {formatThaiDate(`${month}-01`, { month: "long", year: "numeric" })}
          </span>
          <Link
            href={href(shiftMonth(month, 1), type)}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนถัดไป"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3" />
          </Link>
        </div>
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

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="stack-table w-full text-sm md:min-w-[860px]">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">เลขที่เอกสาร</th>
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">สินค้า</th>
              <th className="px-4 py-3 text-right">จำนวน</th>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3">อ้างอิง / หมายเหตุ</th>
              <th className="px-4 py-3">ผู้บันทึก</th>
            </tr>
          </thead>
          <tbody>
            {movements?.map((m) => {
              const p = productById.get(m.product_id);
              const printHref = movementPrintHref(m);
              return (
                <tr key={m.id} className="border-t border-teal-100 hover:bg-teal-50">
                  <td data-label="วันที่" className="whitespace-nowrap px-4 py-3 text-teal-700">{thaiDate(m.movement_date, true)}</td>
                  <td data-label="เลขที่เอกสาร" className="whitespace-nowrap px-4 py-3">
                    {printHref ? (
                      <Link href={printHref} target="_blank" title="พิมพ์เอกสาร" className="font-medium text-teal-800 hover:text-orange-600">
                        {m.doc_number ?? "พิมพ์"}
                      </Link>
                    ) : (
                      <span className="text-teal-400">-</span>
                    )}
                  </td>
                  <td data-label="ประเภท" className="px-4 py-3">
                    <StatusBadge status={m.movement_type} config={MOVEMENT_TYPES} />
                  </td>
                  <td data-label="สินค้า" className="px-4 py-3">
                    <Link href={`/admin/inventory/stock/${m.product_id}`} className="text-teal-900 hover:text-orange-600">
                      <span className="font-medium">{p?.sku}</span> {p?.name}
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
                  <td data-label="อ้างอิง / หมายเหตุ" className="px-4 py-3 text-teal-800">
                    {m.ref_no ?? ""}
                    {m.note && <span className="block text-xs text-teal-500">{m.note}</span>}
                  </td>
                  <td data-label="ผู้บันทึก" className="px-4 py-3 text-xs text-teal-500">{m.created_by_email ?? "-"}</td>
                </tr>
              );
            })}
            {(!movements || movements.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-teal-400">
                  เดือนนี้ยังไม่มีรายการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
