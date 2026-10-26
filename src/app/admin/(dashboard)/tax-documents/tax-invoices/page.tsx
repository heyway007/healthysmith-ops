import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faPrint } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { getDocPermissions } from "@/lib/current-role";
import { canDoc } from "@/lib/doc-permissions";
import { parseDocFilters, type DocListParams } from "@/lib/doc-list-filters";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { formatMoney, thaiDate } from "@/lib/thai-money";
import { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";
import { DocListToolbar, StatusTag } from "@/components/documents/doc-list-toolbar";

const BASE = "/admin/tax-documents/tax-invoices";

export default async function TaxInvoicesPage({ searchParams }: { searchParams: Promise<DocListParams> }) {
  const f = parseDocFilters(await searchParams);
  const supabase = await createClient();

  let query = supabase
    .from("tax_invoice_list")
    .select("*")
    .gte("issue_date", f.from)
    .lte("issue_date", f.to)
    .order("tax_invoice_number", { ascending: true })
    .limit(2000);
  if (f.status === "active") query = query.eq("is_cancelled", false);
  if (f.status === "cancelled") query = query.eq("is_cancelled", true);
  if (f.status === "pending") query = query.eq("is_cancelled", false).not("cancel_requested_at", "is", null);
  if (f.q) {
    query = query.or(["tax_invoice_number", "buyer_name", "buyer_tax_id", "order_refs"].map((c) => `${c}.ilike.*${f.q}*`).join(","));
  }
  const [{ data: invoices }, perms] = await Promise.all([query, getDocPermissions()]);

  const active = (invoices ?? []).filter((t) => !t.is_cancelled);
  const total = active.reduce((s, t) => s + t.total_amount, 0);
  const vat = active.reduce((s, t) => s + t.vat_amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ใบเสร็จรับเงิน / ใบกำกับภาษี</h2>
          <p className="mt-1 text-sm text-teal-700">ค้นหาตามเลขที่ ชื่อ เลขภาษี หรือช่วงวันที่ · ติ๊กเลือกแล้วพิมพ์หลายใบ หรือส่งออก Excel</p>
        </div>
        {canDoc(perms, "create") && (
          <Link href={`${BASE}/manual`} className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}>
            <FontAwesomeIcon icon={faPenToSquare} />
            ออกใบกำกับ (กรอกเอง)
          </Link>
        )}
      </div>

      <DocListToolbar
        basePath={BASE}
        printPath="/admin/print/tax-invoices"
        filters={f}
        count={(invoices ?? []).length}
        searchPlaceholder="เลขที่ / ชื่อ / เลขภาษี / เลขออเดอร์"
        stats={[
          { label: "จำนวนใบ (ใช้งาน)", value: active.length.toLocaleString() },
          { label: "ยอดรวม VAT", value: `฿${formatMoney(total)}` },
          { label: "ภาษีขาย", value: `฿${formatMoney(vat)}` },
        ]}
      />

      <form method="get" action="/admin/print/tax-invoices" target="_blank" className="mt-4">
        <div className="mb-3 flex items-center gap-3">
          <button type="submit" className={`${secondaryButtonClassName} inline-flex items-center gap-2`}>
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์ใบที่ติ๊กเลือก
          </button>
          <span className="text-sm text-teal-600">พบ {(invoices ?? []).length.toLocaleString()} รายการ</span>
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
                      href={`${BASE}/${t.id}`}
                      className={`font-mono text-xs font-medium hover:text-orange-600 ${t.is_cancelled ? "line-through" : "text-teal-800"}`}
                    >
                      {t.tax_invoice_number}
                    </Link>
                    <StatusTag cancelled={t.is_cancelled} pending={!!t.cancel_requested_at} replaced={!!t.replaced_by_id} correction={!!t.replaces_id} />
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
                    ไม่พบใบกำกับภาษีตามเงื่อนไขนี้
                    {f.status === "active" && " — ใบที่ยกเลิกแล้วดูได้โดยเลือกสถานะ “ทั้งหมด”"}
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

