import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faPrint } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { secondaryButtonClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { bangkokToday, formatMoney, monthRange, thaiDate, thaiMonth } from "@/lib/thai-money";
import { SelectAllCheckbox } from "./select-all";

type Params = { month?: string; status?: string; q?: string };

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function TaxInvoicesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : bangkokToday().slice(0, 7);
  const status = ["all", "cancelled"].includes(params.status ?? "") ? params.status! : "active";
  const q = (params.q ?? "").replace(/[,()*%\\]/g, " ").trim();
  const [from, to] = monthRange(month);

  const supabase = await createClient();
  let query = supabase
    .from("tax_invoice_list")
    .select("*")
    .gte("issue_date", from)
    .lte("issue_date", to)
    .order("tax_invoice_number", { ascending: true });
  if (status === "active") query = query.eq("is_cancelled", false);
  if (status === "cancelled") query = query.eq("is_cancelled", true);
  if (q) {
    query = query.or(
      ["tax_invoice_number", "buyer_name", "buyer_tax_id", "order_refs"].map((c) => `${c}.ilike.*${q}*`).join(","),
    );
  }
  const { data: invoices } = await query;

  const active = (invoices ?? []).filter((t) => !t.is_cancelled);
  const total = active.reduce((s, t) => s + t.total_amount, 0);
  const vat = active.reduce((s, t) => s + t.vat_amount, 0);

  const link = (patch: Partial<Params>) => {
    const next = { month, status: status === "active" ? "" : status, q, ...patch };
    return `/admin/sales/tax-invoices?${new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][])}`;
  };
  const printAll = `/admin/print/tax-invoices?${new URLSearchParams(
    Object.entries({ month, status: status === "active" ? "" : status, q }).filter(([, v]) => v) as [string, string][],
  )}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ใบเสร็จรับเงิน / ใบกำกับภาษี</h2>
          <p className="mt-1 text-sm text-teal-700">
            ออกใบใหม่จากหน้าออเดอร์ · ติ๊กเลือกแล้วพิมพ์ทีละหลายใบ หรือพิมพ์ทั้งเดือน
          </p>
        </div>
        <Link href={printAll} target="_blank" className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}>
          <FontAwesomeIcon icon={faPrint} />
          พิมพ์ทั้งหมดที่แสดง ({(invoices ?? []).length})
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={link({ month: shiftMonth(month, -1) })}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนก่อน"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
          </Link>
          <span className="min-w-36 text-center font-medium text-teal-900">{thaiMonth(month)}</span>
          <Link
            href={link({ month: shiftMonth(month, 1) })}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนถัดไป"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          <Stat label="จำนวนใบ" value={active.length.toLocaleString()} />
          <Stat label="ยอดรวม VAT" value={`฿${formatMoney(total)}`} />
          <Stat label="ภาษีขาย" value={`฿${formatMoney(vat)}`} />
        </div>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="month" value={month} />
        <div>
          <label className="block text-xs font-medium text-teal-700">สถานะ</label>
          <select name="status" defaultValue={status === "active" ? "" : status} className={selectClassName}>
            <option value="">ใช้งาน</option>
            <option value="cancelled">ยกเลิกแล้ว</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-700">ค้นหา</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="เลขที่ / ชื่อ / เลขภาษี / เลขออเดอร์"
            className="mt-1 w-64 rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <button type="submit" className={secondaryButtonClassName}>
          กรอง
        </button>
      </form>

      <form method="get" action="/admin/print/tax-invoices" target="_blank" className="mt-4">
        <div className="mb-3 flex items-center gap-3">
          <button type="submit" className={`${secondaryButtonClassName} inline-flex items-center gap-2`}>
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์ใบที่ติ๊กเลือก
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="w-10 px-4 py-3">
                  <SelectAllCheckbox name="id" />
                </th>
                <th className="px-4 py-3">เลขที่</th>
                <th className="px-4 py-3">วันที่</th>
                <th className="px-4 py-3">ผู้ซื้อ</th>
                <th className="px-4 py-3">อ้างอิงออเดอร์</th>
                <th className="px-4 py-3 text-right">ยอดรวม</th>
                <th className="px-4 py-3 text-right">VAT</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map((t) => (
                <tr key={t.id} className={`border-t border-teal-100 hover:bg-teal-50 ${t.is_cancelled ? "text-gray-400" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" name="id" value={t.id} aria-label={`เลือก ${t.tax_invoice_number}`} className="size-4 accent-teal-600" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/admin/sales/tax-invoices/${t.id}`}
                      className={`font-mono text-xs font-medium hover:text-orange-600 ${t.is_cancelled ? "line-through" : "text-teal-800"}`}
                    >
                      {t.tax_invoice_number}
                    </Link>
                    {t.is_cancelled && <span className="ml-2 text-xs">ยกเลิก</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{thaiDate(t.issue_date, true)}</td>
                  <td className="px-4 py-3">
                    <span className={t.is_cancelled ? "" : "text-teal-900"}>{t.buyer_name}</span>
                    {t.buyer_tax_id && <span className="block font-mono text-xs text-teal-500">{t.buyer_tax_id}</span>}
                  </td>
                  <td className="max-w-56 truncate px-4 py-3 font-mono text-xs text-teal-600" title={t.order_refs ?? undefined}>
                    {t.channel_names && <span className="font-sans">{t.channel_names} · </span>}
                    {t.order_refs ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatMoney(t.total_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatMoney(t.vat_amount)}</td>
                </tr>
              ))}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-teal-400">
                    ยังไม่มีใบกำกับภาษีในเดือนนี้ —{" "}
                    <Link href={`/admin/sales/orders?month=${month}&tax=none`} className="text-teal-600 underline hover:text-orange-600">
                      ไปเลือกออเดอร์ที่ยังไม่ออก
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white px-4 py-2 text-right shadow-sm">
      <p className="text-xs text-teal-500">{label}</p>
      <p className="font-semibold text-teal-950">{value}</p>
    </div>
  );
}
