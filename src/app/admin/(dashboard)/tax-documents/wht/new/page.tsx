import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "@/lib/thai-money";
import { branchLabel } from "@/lib/wht";
import { WhtForm, type WhtDefaults } from "./wht-form";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * New หนังสือรับรองการหักภาษี ณ ที่จ่าย. Pre-fills from `?bill=<id>` (the
 * supplier and pre-VAT amount of a purchase bill), `?supplier=<id>`, or
 * `?from=<id>` (an earlier certificate, e.g. re-issuing a cancelled one).
 */
export default async function NewWhtPage({
  searchParams,
}: {
  searchParams: Promise<{ bill?: string; supplier?: string; from?: string; replace?: string }>;
}) {
  const params = await searchParams;
  const billId = UUID.test(params.bill ?? "") ? params.bill! : null;
  const fromId = UUID.test(params.from ?? "") ? params.from! : null;

  const supabase = await createClient();
  const [{ data: company }, { data: suppliers }, { data: last }, { data: bill }, { data: source }, { data: sourceLines }] =
    await Promise.all([
      supabase.from("companies").select("*").order("created_at").limit(1).maybeSingle(),
      supabase.from("suppliers").select("id, name, tax_id, address").eq("is_active", true).order("name"),
      supabase.from("wht_certificates").select("signer_name").not("signer_name", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      billId ? supabase.from("purchase_bills").select("*").eq("id", billId).maybeSingle() : Promise.resolve({ data: null }),
      fromId ? supabase.from("wht_certificates").select("*").eq("id", fromId).maybeSingle() : Promise.resolve({ data: null }),
      fromId
        ? supabase.from("wht_certificate_lines").select("*").eq("certificate_id", fromId).order("sort_order")
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const supplierId = bill?.supplier_id ?? source?.supplier_id ?? (UUID.test(params.supplier ?? "") ? params.supplier! : "");
  const supplier = (suppliers ?? []).find((s) => s.id === supplierId);
  // ?replace=1: correcting `from` (cancelled and linked on issue), unless already corrected.
  const replacing = params.replace === "1" && source && !source.replaced_by_id ? source : null;
  const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

  const defaults: WhtDefaults = {
    supplierId: supplier?.id ?? "",
    billId: bill?.id ?? "",
    payeeType: source?.payee_type ?? "juristic",
    payeeName: source?.payee_name ?? supplier?.name ?? "",
    payeeTaxId: source?.payee_tax_id ?? supplier?.tax_id ?? "",
    payeeAddress: source?.payee_address ?? supplier?.address ?? "",
    issueDate: bangkokToday(),
    signerName: source?.signer_name ?? last?.signer_name ?? "",
    lines: bill
      ? [{ type: "5", description: "", amount: String(bill.subtotal - bill.discount_amount), payDate: bill.bill_date }]
      : (sourceLines ?? []).map((l) => ({
          type: l.income_type,
          description: l.description ?? "",
          amount: String(l.amount),
          payDate: l.pay_date,
          tax: String(l.tax),
        })),
    formType: source?.form_type,
    payerCondition: source?.payer_condition,
    extra: source
      ? {
          sequence_label: str(source.sequence_label),
          book_number: str(source.book_number),
          payer_condition_other: str(source.payer_condition_other),
          pf_license_no: str(source.pf_license_no),
          pf_amount: str(source.pf_amount),
          sso_amount: str(source.sso_amount),
          sso_employer_no: str(source.sso_employer_no),
          sso_card_no: str(source.sso_card_no),
        }
      : undefined,
    replace: replacing ? { id: replacing.id, number: replacing.certificate_number } : undefined,
  };

  return (
    <div>
      <BackLink href="/admin/tax-documents/wht" label="กลับไปหน้ารายการหนังสือรับรองหัก ณ ที่จ่าย" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">
        {replacing ? `แก้ไขหนังสือรับรองเลขที่ ${replacing.certificate_number}` : "ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)"}
      </h2>
      {bill && (
        <p className="mt-3 rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800">
          ดึงข้อมูลจากรายการซื้อ <span className="font-mono">{bill.bill_number}</span> — ตรวจสอบยอดเงินที่จ่าย (ก่อน VAT) อีกครั้ง
        </p>
      )}
      {source && !replacing && (
        <p className="mt-3 rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800">
          คัดลอกข้อมูลจากหนังสือเลขที่ <span className="font-mono">{source.certificate_number}</span> — ใบใหม่จะได้เลขที่ใหม่
        </p>
      )}
      <div className="mt-6">
        <WhtForm
          payer={
            company
              ? { name: `${company.name} (${branchLabel(company.branch_code)})`, taxId: company.tax_id, address: company.address }
              : null
          }
          suppliers={suppliers ?? []}
          defaults={defaults}
        />
      </div>
    </div>
  );
}
