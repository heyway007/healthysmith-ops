import { createClient } from "@/lib/supabase/server";
import { logDocumentEvents } from "@/lib/audit";
import { PrintBar } from "@/components/inventory/print-bar";
import {
  DocHeader,
  DocInfo,
  DocSheet,
  DocSignatures,
  docDate,
  docTableClassName,
} from "@/components/inventory/stock-document";
import { CancelledStamp } from "@/components/inventory/cancelled-stamp";
import { bangkokDate, formatQty, formatSignedQty } from "@/app/admin/(dashboard)/inventory/labels";

// ใบรับสินค้าเข้า (IN) / ใบเบิกสินค้า (OUT) / ใบปรับยอดสต๊อก (CNT): the
// stock movements posted together under one document number.

const KINDS = {
  in: { title: "ใบรับสินค้าเข้า", titleEn: "GOODS RECEIVED NOTE", signatures: ["ผู้ส่งของ", "ผู้รับของ", "ผู้ตรวจสอบ"] },
  out: { title: "ใบเบิกสินค้า", titleEn: "STOCK ISSUE NOTE", signatures: ["ผู้เบิก", "ผู้จ่ายของ", "ผู้อนุมัติ"] },
  adjust: { title: "ใบปรับยอดสต๊อก", titleEn: "STOCK ADJUSTMENT", signatures: ["ผู้นับ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"] },
} as const;

export default async function PrintStockDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string | string[] }>;
}) {
  const docs = [(await searchParams).doc ?? []]
    .flat()
    .filter((d) => /^(IN|OUT|CNT)\d{2}-\d{4,}$/.test(d))
    .slice(0, 100);
  const supabase = await createClient();

  const [{ data: company }, { data: movements }, { data: cancellations }] = await Promise.all([
    supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
    docs.length
      ? supabase.from("stock_movements").select("*").in("doc_number", docs).in("movement_type", ["in", "out", "adjust"]).eq("is_reversal", false)
      : { data: [] },
    docs.length
      ? supabase.from("stock_document_cancellations").select("doc_number, reason, cancelled_at").in("doc_number", docs)
      : { data: [] },
  ]);
  const cancelledDocs = new Map((cancellations ?? []).map((c) => [c.doc_number, c]));
  const productIds = [...new Set((movements ?? []).map((m) => m.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, sku, name, unit").in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const documents = [...new Set((movements ?? []).map((m) => m.doc_number!))].sort().map((number) => {
    const rows = (movements ?? [])
      .filter((m) => m.doc_number === number)
      .map((m) => ({ ...m, p: productById.get(m.product_id) }))
      .sort((a, b) => (a.p?.sku ?? "").localeCompare(b.p?.sku ?? ""));
    const first = rows[0];
    // note typed for the whole document is on every row; per-line notes differ
    const sharedNote = rows.every((r) => r.note === first.note) ? first.note : null;
    return { number, rows, first, sharedNote, cancelled: cancelledDocs.get(number), kind: KINDS[first.movement_type as keyof typeof KINDS] };
  });

  await logDocumentEvents(
    "document.print",
    "stock_movements",
    documents.map((d) => ({ id: d.number, label: d.number })),
  );

  return (
    <>
      <PrintBar summary={`เอกสาร ${documents.length} ใบ`} canPrint={documents.length > 0} />
      <main className="py-6 print:py-0">
        {documents.length === 0 && <p className="text-center text-gray-500">ไม่พบเอกสารที่จะพิมพ์</p>}
        {documents.map(({ number, rows, first, sharedNote, cancelled, kind }) => {
          const isAdjust = first.movement_type === "adjust";
          const hasLot = rows.some((r) => r.lot_number || r.expiry_date);
          const showNotes = isAdjust || (!sharedNote && rows.some((r) => r.note));
          return (
            <DocSheet key={number} label={number}>
              <DocHeader company={company} title={kind.title} titleEn={kind.titleEn} number={number} date={first.movement_date} />
              {cancelled && <CancelledStamp date={docDate(bangkokDate(cancelled.cancelled_at))} reason={cancelled.reason} />}
              <DocInfo
                rows={[
                  ["เลขที่อ้างอิง", first.ref_no],
                  ["หมายเหตุ", isAdjust ? null : sharedNote],
                ]}
              />
              <table className={docTableClassName}>
                <thead>
                  <tr>
                    <th className="w-[12mm]">ลำดับ</th>
                    <th className="w-[28mm]">รหัสสินค้า</th>
                    <th>รายการ</th>
                    {hasLot && <th className="w-[24mm]">Lot</th>}
                    {hasLot && <th className="w-[22mm]">วันหมดอายุ</th>}
                    <th className="w-[22mm]">{isAdjust ? "ปรับ (+/−)" : "จำนวน"}</th>
                    <th className="w-[16mm]">หน่วย</th>
                    {showNotes && <th className="w-[44mm]">หมายเหตุ</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, n) => (
                    <tr key={r.id}>
                      <td className="text-center">{n + 1}</td>
                      <td>{r.p?.sku}</td>
                      <td>{r.p?.name}</td>
                      {hasLot && <td>{r.lot_number}</td>}
                      {hasLot && <td className="text-center">{docDate(r.expiry_date)}</td>}
                      <td className="text-right font-semibold">
                        {isAdjust ? formatSignedQty(r.quantity) : formatQty(Math.abs(r.quantity))}
                      </td>
                      <td className="text-center">{r.p?.unit}</td>
                      {showNotes && <td className="text-[11px]">{r.note}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <DocSignatures labels={[...kind.signatures]} />
            </DocSheet>
          );
        })}
      </main>
    </>
  );
}
