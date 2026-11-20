import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { PrintBar } from "@/components/inventory/print-bar";
import { DocHeader, DocInfo, DocSheet, DocSignatures, docTableClassName } from "@/components/inventory/stock-document";
import { PRODUCT_TYPES, formatQty, productSearchFilter } from "@/app/admin/(dashboard)/inventory/labels";
import { expandForCount } from "@/app/admin/(dashboard)/inventory/count-rows";
import { shortDate, type LotOption } from "@/components/inventory/lots";

// ใบนับสต๊อก: a blank sheet to count on, same products/filters as the นับสต๊อก
// page. `blind=1` leaves out the system quantity so counters aren't swayed by it.
export default async function PrintStockCountPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; blind?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type && params.type in PRODUCT_TYPES ? params.type : "";
  const blind = params.blind === "1";
  const supabase = await createClient();

  let query = supabase
    .from("product_stock")
    .select("id, sku, name, unit, on_hand, track_lot")
    .eq("is_active", true)
    .neq("product_type", "service")
    .order("sku");
  if (type) query = query.eq("product_type", type);
  const filter = productSearchFilter(q);
  if (filter) query = query.or(filter);
  const [{ data: company }, { data: products }] = await Promise.all([
    supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
    query,
  ]);

  const trackedIds = (products ?? []).filter((p) => p.track_lot).map((p) => p.id);
  const { data: lotData } = trackedIds.length
    ? await supabase
        .from("product_lot_stock")
        .select("product_id, lot_number, expiry_date, on_hand, received_date")
        .in("product_id", trackedIds)
    : { data: [] as LotOption[] };
  const rows = expandForCount(products ?? [], lotData ?? []);
  const hasLots = rows.some((r) => r.tracked);

  const toggle = new URLSearchParams();
  if (q) toggle.set("q", q);
  if (type) toggle.set("type", type);
  if (!blind) toggle.set("blind", "1");

  return (
    <>
      <PrintBar summary={`${rows.length} รายการ`} canPrint={rows.length > 0}>
        <Link
          href={`/admin/print/inventory/stock-count?${toggle}`}
          replace
          className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50"
        >
          {blind ? "แสดงยอดในระบบ" : "ซ่อนยอดในระบบ (นับแบบไม่เห็นยอด)"}
        </Link>
      </PrintBar>
      <main className="py-6 print:py-0">
        <DocSheet label="ใบนับสต๊อก">
          <DocHeader
            company={company}
            title="ใบนับสต๊อก"
            titleEn="STOCK COUNT SHEET"
            number="................"
            date={bangkokToday()}
          />
          <DocInfo
            rows={[
              ["ประเภทสินค้า", type ? PRODUCT_TYPES[type] : "ทั้งหมด"],
              ["เฉพาะที่ค้นหา", q || null],
            ]}
          />
          <table className={docTableClassName}>
            <thead>
              <tr>
                <th className="w-[12mm]">ลำดับ</th>
                <th className="w-[28mm]">รหัสสินค้า</th>
                <th>รายการ</th>
                {hasLots && <th className="w-[34mm]">Lot / หมดอายุ</th>}
                <th className="w-[14mm]">หน่วย</th>
                {!blind && <th className="w-[20mm]">ในระบบ</th>}
                <th className="w-[24mm]">นับได้</th>
                {!blind && <th className="w-[18mm]">ผลต่าง</th>}
                <th className="w-[30mm]">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, n) => (
                <tr key={r.key} className="print-avoid-break">
                  <td className="text-center">{n + 1}</td>
                  <td>{r.first ? r.sku : ""}</td>
                  <td>{r.first ? r.name : ""}</td>
                  {hasLots && (
                    <td>
                      {r.tracked ? (
                        <>
                          {r.lot ?? "ไม่ระบุล็อต"}
                          {r.expiry && <span className="block text-[10px]">หมดอายุ {shortDate(r.expiry)}</span>}
                        </>
                      ) : (
                        ""
                      )}
                    </td>
                  )}
                  <td className="text-center">{r.unit}</td>
                  {!blind && <td className="text-right">{formatQty(r.onHand)}</td>}
                  <td />
                  {!blind && <td />}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
          <DocSignatures labels={["ผู้นับ", "ผู้ตรวจนับ", "ผู้อนุมัติ"]} />
        </DocSheet>
      </main>
    </>
  );
}
