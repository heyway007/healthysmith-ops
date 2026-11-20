import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { thaiDate } from "@/lib/thai-money";
import { BackLink } from "@/components/ui/back-link";
import { CancelStockDocumentButton } from "@/components/inventory/cancel-stock-document";
import { CancelledStamp } from "@/components/inventory/cancelled-stamp";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";
import { bangkokDate, formatQty, formatSignedQty } from "../../labels";

const KINDS = {
  in: { title: "ใบรับสินค้าเข้า", titleEn: "Goods received note" },
  out: { title: "ใบเบิกสินค้า", titleEn: "Stock issue note" },
  adjust: { title: "ใบปรับยอดสต๊อก", titleEn: "Stock adjustment" },
} as const;

/** One IN / OUT / CNT stock document, laid out as a form (the print version is a separate page). */
export default async function StockDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ doc: string }>;
  searchParams: Promise<{ cancelled?: string; error?: string }>;
}) {
  const { doc: rawDoc } = await params;
  const doc = decodeURIComponent(rawDoc).toUpperCase();
  const { cancelled: justCancelled, error } = await searchParams;
  if (!/^(IN|OUT|CNT)\d{2}-\d{4,}$/.test(doc)) notFound();

  const supabase = await createClient();
  const [{ data: rows }, { data: cancellation }] = await Promise.all([
    supabase
      .from("stock_movements")
      .select("*")
      .eq("doc_number", doc)
      .eq("is_reversal", false)
      .in("movement_type", ["in", "out", "adjust"])
      .order("created_at")
      .order("id"),
    supabase.from("stock_document_cancellations").select("*").eq("doc_number", doc).maybeSingle(),
  ]);
  if (!rows || rows.length === 0) notFound();

  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const { data: products } = await supabase.from("products").select("id, sku, name, unit").in("id", productIds);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const first = rows[0];
  const kind = KINDS[first.movement_type as keyof typeof KINDS];
  const isAdjust = first.movement_type === "adjust";
  const hasLot = rows.some((r) => r.lot_number || r.expiry_date);
  const sharedNote = rows.every((r) => r.note === first.note) ? first.note : null;
  const showLineNotes = isAdjust || (!sharedNote && rows.some((r) => r.note));
  const canCancel = !cancellation && !isAdjust;
  const printHref = `/admin/print/inventory/stock-documents?doc=${encodeURIComponent(doc)}`;
  const here = `/admin/inventory/movements/${doc}`;

  return (
    <div>
      <BackLink href="/admin/inventory/movements" label="กลับไปหน้ารับเข้า / เบิกออก" />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-teal-950">
              {kind.title} {doc}
            </h2>
            {cancellation && (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">ยกเลิกแล้ว</span>
            )}
          </div>
          <p className="mt-1 text-sm text-teal-700">{kind.titleEn}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={printHref} target="_blank" className={`flex items-center gap-2 ${submitButtonClassName}`}>
            <FontAwesomeIcon icon={faPrint} />
            พิมพ์
          </Link>
          {canCancel && <CancelStockDocumentButton docNumber={doc} returnTo={here} showLabel />}
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {justCancelled && !error && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ยกเลิกเอกสาร {justCancelled} แล้ว — ระบบบันทึกรายการกลับสต๊อกให้เรียบร้อย
        </p>
      )}

      {/* The document: the stamp sits in the middle of this box */}
      <div className={`relative mt-4 ${formCardClassName}`}>
        {cancellation && (
          <CancelledStamp date={thaiDate(bangkokDate(cancellation.cancelled_at))} reason={cancellation.reason} />
        )}

        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <Info label="เลขที่เอกสาร" value={doc} />
          <Info label="วันที่" value={thaiDate(first.movement_date)} />
          <Info label="เลขที่อ้างอิง" value={first.ref_no} />
          {!isAdjust && sharedNote && (
            <div className="sm:col-span-3">
              <Info label="หมายเหตุ" value={sharedNote} multiline />
            </div>
          )}
        </dl>

        <div className="mt-5 overflow-x-auto rounded-xl border border-teal-100">
          <table className="stack-table w-full text-sm md:min-w-[640px]">
            <thead>
              <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">สินค้า</th>
                {hasLot && <th className="px-4 py-3">Lot</th>}
                {hasLot && <th className="px-4 py-3">วันหมดอายุ</th>}
                <th className="px-4 py-3 text-right">{isAdjust ? "ปรับ (+/−)" : "จำนวน"}</th>
                {showLineNotes && <th className="px-4 py-3">หมายเหตุ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, n) => {
                const p = productById.get(r.product_id);
                return (
                  <tr key={r.id} className="border-t border-teal-100">
                    <td data-label="#" className="px-4 py-3 text-teal-500">{n + 1}</td>
                    <td data-label="สินค้า" className="px-4 py-3">
                      <Link href={`/admin/inventory/stock/${r.product_id}`} className="text-teal-900 hover:text-orange-600">
                        <span className="font-medium">{p?.sku}</span> {p?.name}
                      </Link>
                    </td>
                    {hasLot && <td data-label="Lot" className="px-4 py-3 text-teal-700">{r.lot_number ?? "-"}</td>}
                    {hasLot && (
                      <td data-label="วันหมดอายุ" className="whitespace-nowrap px-4 py-3 text-teal-700">
                        {r.expiry_date ? thaiDate(r.expiry_date, true) : "-"}
                      </td>
                    )}
                    <td
                      data-label={isAdjust ? "ปรับ (+/−)" : "จำนวน"}
                      className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${r.quantity > 0 ? "text-emerald-700" : "text-orange-600"}`}
                    >
                      {isAdjust ? formatSignedQty(r.quantity) : formatQty(Math.abs(r.quantity))}{" "}
                      <span className="text-xs font-normal text-teal-500">{p?.unit}</span>
                    </td>
                    {showLineNotes && <td data-label="หมายเหตุ" className="px-4 py-3 text-xs text-teal-600">{r.note}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {first.created_by_email && <p className="mt-3 text-xs text-teal-400">บันทึกในระบบโดย {first.created_by_email}</p>}
      </div>

      {cancellation && (
        <section className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-semibold">เอกสารนี้ถูกยกเลิกแล้ว</p>
          <p className="mt-1">เหตุผล: {cancellation.reason}</p>
          <p className="mt-0.5 text-xs text-rose-600">
            ยกเลิกเมื่อ {thaiDate(bangkokDate(cancellation.cancelled_at))}
            {cancellation.cancelled_by_email && ` โดย ${cancellation.cancelled_by_email}`} · ระบบบันทึกรายการกลับสต๊อกแล้ว ใบเดิมเก็บไว้เป็นประวัติ
          </p>
        </section>
      )}
    </div>
  );
}

function Info({ label, value, multiline }: { label: string; value: string | null | undefined; multiline?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-teal-500">{label}</dt>
      <dd className={`mt-0.5 text-teal-950 ${multiline ? "whitespace-pre-line" : ""}`}>{value || "-"}</dd>
    </div>
  );
}
