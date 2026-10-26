import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPrint } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { getDocPermissions } from "@/lib/current-role";
import { canDoc } from "@/lib/doc-permissions";
import { parseDocFilters, type DocListParams } from "@/lib/doc-list-filters";
import { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";
import { DocListToolbar, StatusTag } from "@/components/documents/doc-list-toolbar";
import { secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { formatMoney, thaiDate } from "@/lib/thai-money";
import { WHT_FORM_TYPES } from "@/lib/wht";

const BASE = "/admin/tax-documents/wht";
const FORM_LABEL = Object.fromEntries(WHT_FORM_TYPES.map((f) => [f.value, f.label]));

export default async function WhtCertificatesPage({ searchParams }: { searchParams: Promise<DocListParams> }) {
  const f = parseDocFilters(await searchParams);
  const supabase = await createClient();

  let query = supabase
    .from("wht_certificates")
    .select("*")
    .gte("issue_date", f.from)
    .lte("issue_date", f.to)
    .order("issue_date", { ascending: true })
    .order("certificate_number", { ascending: true })
    .limit(2000);
  if (f.status === "active") query = query.eq("is_cancelled", false);
  if (f.status === "cancelled") query = query.eq("is_cancelled", true);
  if (f.status === "pending") query = query.eq("is_cancelled", false).not("cancel_requested_at", "is", null);
  if (f.q) query = query.or(["certificate_number", "payee_name", "payee_tax_id"].map((c) => `${c}.ilike.*${f.q}*`).join(","));
  const [{ data: certificates }, perms] = await Promise.all([query, getDocPermissions()]);

  const active = (certificates ?? []).filter((c) => !c.is_cancelled);
  const paid = active.reduce((s, c) => s + c.total_paid, 0);
  const tax = active.reduce((s, c) => s + c.total_tax, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)</h2>
          <p className="mt-1 text-sm text-teal-700">เลขที่ออกอัตโนมัติตามวันที่ (วันเดือนปี-ลำดับ) · พิมพ์ฉบับละ 1 แผ่น A4</p>
        </div>
        {canDoc(perms, "create") && (
          <Link href={`${BASE}/new`} className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}>
            <FontAwesomeIcon icon={faPlus} />
            ออกหนังสือรับรอง
          </Link>
        )}
      </div>

      <DocListToolbar
        basePath={BASE}
        printPath="/admin/print/wht-certificates"
        filters={f}
        count={(certificates ?? []).length}
        searchPlaceholder="เลขที่ / ชื่อผู้รับเงิน / เลขภาษี"
        stats={[
          { label: "จำนวนใบ (ใช้งาน)", value: active.length.toLocaleString() },
          { label: "ยอดจ่าย", value: `฿${formatMoney(paid)}` },
          { label: "ภาษีที่หัก", value: `฿${formatMoney(tax)}` },
        ]}
      />

      <form method="get" action="/admin/print/wht-certificates" target="_blank" className="mt-4">
        <div className="mb-3 flex items-center gap-3">
          <button type="submit" className={`${secondaryButtonClassName} inline-flex items-center gap-2`}>
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์ใบที่ติ๊กเลือก
          </button>
          <span className="text-sm text-teal-600">พบ {(certificates ?? []).length.toLocaleString()} รายการ</span>
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
                <th className="px-4 py-3">ผู้ถูกหักภาษี (ผู้รับเงิน)</th>
                <th className="px-4 py-3">แบบ</th>
                <th className="px-4 py-3 text-right">ยอดจ่าย</th>
                <th className="px-4 py-3 text-right">ภาษีที่หัก</th>
              </tr>
            </thead>
            <tbody>
              {certificates?.map((c) => (
                <tr key={c.id} className={`border-t border-teal-100 hover:bg-teal-50 ${c.is_cancelled ? "text-gray-400" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" name="id" value={c.id} aria-label={`เลือก ${c.certificate_number}`} className="size-4 accent-teal-600" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`${BASE}/${c.id}`}
                      className={`font-mono text-xs font-medium hover:text-orange-600 ${c.is_cancelled ? "line-through" : "text-teal-800"}`}
                    >
                      {c.certificate_number}
                    </Link>
                    <StatusTag cancelled={c.is_cancelled} pending={!!c.cancel_requested_at} replaced={!!c.replaced_by_id} correction={!!c.replaces_id} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{thaiDate(c.issue_date, true)}</td>
                  <td className="px-4 py-3">
                    <span className={c.is_cancelled ? "" : "text-teal-900"}>{c.payee_name}</span>
                    {c.payee_tax_id && <span className="block font-mono text-xs text-teal-500">{c.payee_tax_id}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{FORM_LABEL[c.form_type]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{formatMoney(c.total_paid)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">{formatMoney(c.total_tax)}</td>
                </tr>
              ))}
              {(!certificates || certificates.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-teal-400">
                    ไม่พบหนังสือรับรองตามเงื่อนไขนี้
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
