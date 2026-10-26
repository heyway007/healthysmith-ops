import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { getDocPermissions } from "@/lib/current-role";
import { BackLink } from "@/components/ui/back-link";
import { WhtCertificateDocument } from "@/components/purchase/wht-certificate-document";
import {
  DocumentActionsPanel,
  DocumentHistory,
  DocumentStatusBanner,
  IntegrityBadge,
  ReplacementDiff,
} from "@/components/documents/document-panels";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";

const BASE = "/admin/tax-documents/wht";

export default async function WhtCertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { error, notice } = await searchParams;
  const supabase = await createClient();

  const [{ data: certificate }, { data: lines }, perms] = await Promise.all([
    supabase.from("wht_certificates").select("*").eq("id", id).maybeSingle(),
    supabase.from("wht_certificate_lines").select("*").eq("certificate_id", id).order("sort_order"),
    getDocPermissions(),
  ]);
  if (!certificate) notFound();

  const related = [certificate.replaces_id, certificate.replaced_by_id].filter((x): x is string => !!x);
  const [{ data: bill }, { data: relatedDocs }] = await Promise.all([
    certificate.purchase_bill_id
      ? supabase.from("purchase_bills").select("id, bill_number").eq("id", certificate.purchase_bill_id).maybeSingle()
      : Promise.resolve({ data: null }),
    related.length
      ? supabase.from("wht_certificates").select("id, certificate_number").in("id", related)
      : Promise.resolve({ data: [] as { id: string; certificate_number: string }[] }),
  ]);
  const numbers = Object.fromEntries((relatedDocs ?? []).map((d) => [d.id, d.certificate_number]));

  return (
    <div>
      <BackLink href={`${BASE}?month=${certificate.issue_date.slice(0, 7)}`} label="กลับไปหน้ารายการหนังสือรับรอง" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-teal-950">
          <span className="font-mono">{certificate.certificate_number}</span>
          {certificate.is_cancelled ? (
            <span className="ml-3 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">ยกเลิกแล้ว</span>
          ) : certificate.cancel_requested_at ? (
            <span className="ml-3 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">รออนุมัติยกเลิก</span>
          ) : null}
        </h2>
        <Link
          href={`/admin/print/wht-certificates?id=${certificate.id}`}
          target="_blank"
          className={`${submitButtonClassName} inline-flex items-center gap-2`}
        >
          <FontAwesomeIcon icon={faPrint} />
          พิมพ์
        </Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      <div className="mt-4">
        <DocumentStatusBanner doc={certificate} basePath={BASE} numbers={numbers} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
            <div className="min-w-[186mm]">
              <WhtCertificateDocument certificate={certificate} lines={lines ?? []} copy={1} />
            </div>
          </div>
          {certificate.replaces_id && (
            <ReplacementDiff kind="wht" originalId={certificate.replaces_id} currentId={certificate.id} />
          )}
        </div>

        <aside className="space-y-4">
          <div className={`${formCardClassName} space-y-3 text-sm`}>
            {bill && (
              <p>
                รายการซื้อ{" "}
                <Link href={`/admin/purchase/bills/${bill.id}`} className="font-mono text-teal-800 hover:text-orange-600">
                  {bill.bill_number}
                </Link>
              </p>
            )}
            {certificate.note && <p className="text-teal-800">หมายเหตุ: {certificate.note}</p>}
            <p className="text-xs text-teal-500">
              ออกเมื่อ{" "}
              {new Date(certificate.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}
              {certificate.created_by_email && ` โดย ${certificate.created_by_email}`}
            </p>
            <IntegrityBadge kind="wht" id={certificate.id} />
          </div>

          <DocumentActionsPanel kind="wht" doc={certificate} perms={perms} editHref={`${BASE}/new?from=${certificate.id}&replace=1`} />
          <DocumentHistory table="wht_certificates" id={certificate.id} />
        </aside>
      </div>
    </div>
  );
}
