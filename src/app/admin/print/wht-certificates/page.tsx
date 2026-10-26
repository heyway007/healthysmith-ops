import { createClient } from "@/lib/supabase/server";
import { WhtCertificateDocument, type WhtCopy } from "@/components/purchase/wht-certificate-document";
import type { Database } from "@/types/database.types";
import { WhtPrintControls, type WhtCopies } from "./print-controls";
import { parseDocFilters } from "@/lib/doc-list-filters";
import { logDocumentEvents } from "@/lib/audit";

// Printable หนังสือรับรองการหักภาษี ณ ที่จ่าย -- every copy on its own A4
// sheet. Opened from the certificate list (ticked ones) and a certificate's page.

type Line = Database["public"]["Tables"]["wht_certificate_lines"]["Row"];

const MAX = 300;

export default async function PrintWhtCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string | string[];
    copies?: string;
    month?: string;
    from?: string;
    to?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  let ids = [params.id ?? []].flat().filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, MAX);
  const copies: WhtCopies = params.copies === "1" || params.copies === "2" ? params.copies : "both";

  const supabase = await createClient();
  if (ids.length === 0 && (params.month || params.from || params.to)) {
    // "Print everything shown": the same filters as the list.
    const f = parseDocFilters(params);
    let query = supabase.from("wht_certificates").select("id").gte("issue_date", f.from).lte("issue_date", f.to).limit(MAX);
    if (f.status === "active") query = query.eq("is_cancelled", false);
    if (f.status === "cancelled") query = query.eq("is_cancelled", true);
    if (f.status === "pending") query = query.eq("is_cancelled", false).not("cancel_requested_at", "is", null);
    if (f.q) query = query.or(["certificate_number", "payee_name", "payee_tax_id"].map((c) => `${c}.ilike.*${f.q}*`).join(","));
    ids = ((await query).data ?? []).map((r) => r.id);
  }
  const certificates: Database["public"]["Tables"]["wht_certificates"]["Row"][] = [];
  const linesById = new Map<string, Line[]>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const [{ data }, { data: lines }] = await Promise.all([
      supabase.from("wht_certificates").select("*").in("id", chunk),
      supabase.from("wht_certificate_lines").select("*").in("certificate_id", chunk).order("sort_order"),
    ]);
    certificates.push(...(data ?? []));
    for (const l of lines ?? []) linesById.set(l.certificate_id, [...(linesById.get(l.certificate_id) ?? []), l]);
  }
  certificates.sort((a, b) => a.certificate_number.localeCompare(b.certificate_number));

  await logDocumentEvents(
    "document.print",
    "wht_certificates",
    certificates.map((c) => ({ id: c.id, label: c.certificate_number })),
    { copies: copies === "both" ? "ฉบับที่ 1 + 2" : `ฉบับที่ ${copies}` },
  );

  const copyList: WhtCopy[] = copies === "both" ? [1, 2] : [Number(copies) as WhtCopy];
  const sheets = certificates.flatMap((c) => copyList.map((copy) => ({ c, copy })));

  return (
    <>
      <style>{`@page { size: A4; margin: 10mm; }`}</style>
      <WhtPrintControls copies={copies} count={certificates.length} sheetCount={sheets.length} />
      <main className="py-6 print:py-0">
        {sheets.length === 0 && <p className="text-center text-gray-500">ไม่มีหนังสือรับรองที่จะพิมพ์</p>}
        {sheets.map(({ c, copy }) => (
          <div
            key={`${c.id}-${copy}`}
            className="mx-auto mb-6 w-[210mm] max-w-full break-after-page bg-white p-[10mm] shadow-md last:break-after-auto print:mb-0 print:w-auto print:p-0 print:shadow-none"
            aria-label={`${c.certificate_number} ฉบับที่ ${copy}`}
          >
            <WhtCertificateDocument certificate={c} lines={linesById.get(c.id) ?? []} copy={copy} />
          </div>
        ))}
      </main>
    </>
  );
}
