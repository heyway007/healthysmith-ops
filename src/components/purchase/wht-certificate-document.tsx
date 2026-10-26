import { bahtText, formatMoney } from "@/lib/thai-money";
import { PAYER_CONDITIONS, WHT_FORM_TYPES, WHT_INCOME_ROWS, dmy, formatTaxId13 } from "@/lib/wht";
import type { Database } from "@/types/database.types";

type Certificate = Database["public"]["Tables"]["wht_certificates"]["Row"];
type Line = Database["public"]["Tables"]["wht_certificate_lines"]["Row"];

export const WHT_COPY_LABELS = {
  1: "สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี",
  2: "สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน",
} as const;
export type WhtCopy = keyof typeof WHT_COPY_LABELS;

const EMPTY_ID = "- ---- ----- -- -";
// Income table: ประเภทเงินได้ | วันที่จ่าย | จำนวนเงิน | ภาษีที่หัก
const COLS = "grid grid-cols-[1fr_27mm_29mm_25mm]";

/**
 * หนังสือรับรองการหักภาษี ณ ที่จ่าย ตามมาตรา 50 ทวิ, one A4 sheet per copy,
 * laid out like the Revenue Department form the company uses.
 */
export function WhtCertificateDocument({
  certificate: c,
  lines,
  copy,
}: {
  certificate: Certificate;
  lines: Line[];
  copy: WhtCopy;
}) {
  const byType = new Map<string, Line[]>();
  for (const l of lines) byType.set(l.income_type, [...(byType.get(l.income_type) ?? []), l]);

  return (
    <article className="relative mx-auto w-full max-w-[186mm] bg-white text-[11px] leading-snug text-black">
      {c.is_cancelled && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="-rotate-30 rounded-2xl border-8 border-rose-500/40 px-10 py-2 text-7xl font-bold text-rose-500/40">
            ยกเลิก
          </span>
        </div>
      )}

      <p className="text-center text-[11.5px]">
        <span className="font-bold">ฉบับที่ {copy}</span> ( {WHT_COPY_LABELS[copy]} )
      </p>

      <div className="border-2 border-black">
        {/* Title */}
        <div className="grid grid-cols-[1fr_50mm] border-b-2 border-black">
          <div className="py-1 pl-[40mm] text-center">
            <p className="text-[16px] font-bold">หนังสือรับรองการหักภาษี ณ ที่จ่าย</p>
            <p>ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] content-center gap-x-3 gap-y-0.5 py-1 pl-6">
            <dt>เล่มที่</dt>
            <dd className="text-[13px]">{c.book_number}</dd>
            <dt>เลขที่</dt>
            <dd className="text-[14px] font-bold">{c.certificate_number}</dd>
          </dl>
        </div>

        {/* Payer */}
        <Party
          title="ผู้มีหน้าที่หักภาษี ณ ที่จ่าย :-"
          name={c.payer_name}
          citizenId={null}
          taxId={c.payer_tax_id}
          address={c.payer_address}
        />

        {/* Payee */}
        <Party
          title="ผู้ถูกหักภาษี ณ ที่จ่าย :-"
          name={c.payee_name}
          citizenId={c.payee_type === "person" ? c.payee_tax_id : null}
          taxId={c.payee_type === "juristic" ? c.payee_tax_id : null}
          address={c.payee_address}
          borderless
        >
          <div className="mt-1 grid grid-cols-[52mm_1fr] items-start gap-2 pb-1.5">
            <div>
              <div className="flex items-center gap-2">
                <span>ลำดับที่</span>
                <span className="min-w-[22mm] border-2 border-red-600 px-2 text-center">{c.sequence_label}</span>
                <span>ในแบบ</span>
              </div>
              <p className="mt-0.5 text-[8.5px] italic leading-tight">
                (ให้สามารถอ้างอิงหรือสอบยันกันได้ระหว่างลำดับที่ตาม หนังสือรับรองฯ กับแบบยื่นรายการภาษีหักที่จ่าย)
              </p>
            </div>
            <div className="grid grid-cols-4 gap-x-2 gap-y-1">
              {WHT_FORM_TYPES.map((f, i) => (
                <Box key={f.value} on={c.form_type === f.value} label={`(${i + 1}) ${f.label}`} />
              ))}
            </div>
          </div>
        </Party>
      </div>

      {/* Income table */}
      <section className="relative mt-1.5 border-2 border-black">
        <div className={`pointer-events-none absolute inset-0 ${COLS}`} aria-hidden>
          <div className="border-r border-black" />
          <div className="border-r border-black" />
          <div className="border-r border-black" />
          <div />
        </div>
        <div className={`relative ${COLS} border-b border-black text-center leading-tight`}>
          <div className="flex items-center justify-center py-1.5 text-[12px] font-semibold">ประเภทเงินได้พึงประเมินที่จ่าย</div>
          <div className="py-1 font-semibold">
            วัน เดือน
            <br />
            หรือปีภาษี ที่จ่าย
          </div>
          <div className="flex items-center justify-center py-1 font-semibold">จำนวนเงินที่จ่าย</div>
          <div className="py-1 font-semibold">
            ภาษีที่หัก
            <br />
            และนำส่งไว้
          </div>
        </div>
        <div className="py-1">
          {WHT_INCOME_ROWS.map((row, idx) => {
            const rowLines = row.key ? (byType.get(row.key) ?? []) : [];
            const specify = rowLines.map((l) => l.description).filter(Boolean).join(", ");
            return (
              <div key={idx} className={`relative ${COLS} items-end`}>
                <div className="px-1.5" style={{ paddingLeft: `${1.5 + row.indent * 4}mm` }}>
                  {row.label}
                  {row.specify && (
                    <span className="ml-1 inline-block min-w-[24mm] border-b border-dashed border-red-600 px-1">{specify}</span>
                  )}
                  {row.key === "4b1_4" && " ของกำไรสุทธิ"}
                </div>
                <Cells values={rowLines.map((l) => dmy(l.pay_date))} center />
                <Cells values={rowLines.map((l) => formatMoney(l.amount))} />
                <Cells values={rowLines.map((l) => formatMoney(l.tax))} />
              </div>
            );
          })}
        </div>
        <div className={`relative ${COLS} border-t border-black`}>
          <div className="col-span-2 bg-white px-2 py-1 text-right font-semibold">รวมเงินที่จ่าย และ ภาษีที่นำส่ง</div>
          <div className="border-l-2 border-black px-2 py-1 text-right font-semibold">{formatMoney(c.total_paid)}</div>
          <div className="px-2 py-1 text-right font-semibold">{formatMoney(c.total_tax)}</div>
        </div>
      </section>

      <div className="mt-2 flex items-center gap-3 px-4">
        <span className="shrink-0 font-semibold">รวมเงินภาษีที่นำส่ง (ตัวอักษร)</span>
        <span className="flex-1 border-2 border-black py-1 text-center text-[12px] font-semibold">
          -- {bahtText(c.total_tax)} --
        </span>
      </div>

      {/* Provident fund / social security */}
      <section className="mt-2 space-y-1 border-y border-black py-1.5">
        <div className="flex items-end gap-2">
          <Box on={c.pf_amount != null} label="เงินสะสมจ่ายเข้ากองทุนสำรองเลี้ยงชีพ ใบอนุญาตเลขที่" />
          <Blank className="w-[40mm]">{c.pf_license_no}</Blank>
          <span className="ml-auto">จำนวนเงิน</span>
          <Blank className="w-[28mm] text-right">{c.pf_amount != null ? formatMoney(c.pf_amount) : ""}</Blank>
          <span>บาท</span>
        </div>
        <div className="flex items-end gap-2">
          <Box on={c.sso_amount != null} label="เงินสมทบจ่ายเข้ากองทุนประกันสังคม จำนวน" />
          <Blank className="w-[40mm] text-right">{c.sso_amount != null ? formatMoney(c.sso_amount) : ""}</Blank>
          <span>บาท</span>
        </div>
        <div className="flex items-end gap-2 pl-5">
          <span>เลขที่บัญชีนายจ้าง</span>
          <Blank className="w-[40mm]">{c.sso_employer_no}</Blank>
          <span className="ml-auto">เลขที่บัตรประกันสังคม ของผู้ถูกหักภาษี ณ ที่จ่าย</span>
          <Blank className="w-[32mm]">{c.sso_card_no}</Blank>
        </div>
      </section>

      {/* Payer condition + signature + seal */}
      <section className="grid grid-cols-[40mm_1fr_30mm] border-b-2 border-black">
        <div className="space-y-1 border-r border-black py-1.5 pr-2">
          <p>ผู้จ่ายเงิน</p>
          {PAYER_CONDITIONS.map((p) => (
            <Box
              key={p.value}
              on={c.payer_condition === p.value}
              label={p.value === "other" && c.payer_condition === "other" && c.payer_condition_other ? `อื่นๆ (${c.payer_condition_other})` : p.label}
            />
          ))}
        </div>
        <div className="px-3 py-1.5">
          <p className="text-center">ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้น ถูกต้องตรงกับความจริงทุกประการ</p>
          <div className="mt-7 grid grid-cols-[auto_1fr_auto] items-end gap-x-2 gap-y-3">
            <span>ลงชื่อ</span>
            <Blank className="text-center">{c.signer_name}</Blank>
            <span>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย</span>
            <span />
            <Blank className="text-center">{dmy(c.issue_date, "/")}</Blank>
            <span>วัน เดือน ปี ที่ออกหนังสือรับรองฯ</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-2">
          <div className="flex h-[24mm] w-[24mm] flex-col items-center justify-center rounded-full border border-black text-center text-[9px] leading-tight">
            <span>ประทับตรา</span>
            <span>นิติบุคคล</span>
            <span>(ถ้ามี)</span>
          </div>
        </div>
      </section>

      <footer className="mt-2 grid grid-cols-[1fr_1.15fr] gap-4 text-[8.5px] leading-snug">
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <span className="font-bold">คำเตือน</span>
          <p>
            ผู้มีหน้าที่ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย
            <br />
            ฝ่าฝืนไม่ปฏิบัติตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร
            <br />
            ต้องรับโทษทางอาญา ตามมาตรา 35 แห่งประมวลรัษฎากร
          </p>
        </div>
        <div>
          <p>
            <span className="font-bold">หมายเหตุ</span> เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)* หมายถึง
          </p>
          <p>1. กรณีบุคคลธรรมดาไทย ให้ใช้เลขประจำตัวประชาชนของกรมการปกครอง</p>
          <p>2. กรณีนิติบุคคล ให้ใช้เลขทะเบียนนิติบุคคลของกรมพัฒนาธุรกิจการค้า</p>
          <p>3. กรณีอื่น ๆ นอกเหนือจาก 1. และ 2. ให้ใช้เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)</p>
        </div>
      </footer>
    </article>
  );
}

function Party({
  title,
  name,
  citizenId,
  taxId,
  address,
  borderless,
  children,
}: {
  title: string;
  name: string;
  citizenId: string | null;
  taxId: string | null;
  address: string | null;
  borderless?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`px-1.5 pt-1 ${borderless ? "" : "border-b-2 border-black pb-1"}`}>
      <div className="grid grid-cols-[1fr_auto] items-end gap-x-3">
        <p className="font-bold">{title}</p>
        <IdLine label="เลขประจำตัวประชาชน" value={citizenId} />
        <div className="flex items-end gap-2">
          <span className="w-9 shrink-0 font-bold">ชื่อ</span>
          <span className="flex-1 border-b border-dashed border-red-600 px-1 text-[12px]">{name}</span>
        </div>
        <IdLine label="เลขประจำตัวผู้เสียภาษีอากร" value={taxId} />
      </div>
      <p className="pl-11 text-[8px]">( ให้ระบุว่าเป็น บุคคล นิติบุคคล บริษัท สมาคม หรือ คณะบุคคล )</p>
      <div className="mt-0.5 flex items-end gap-2">
        <span className="w-9 shrink-0 font-bold">ที่อยู่</span>
        <span className="flex-1 border-b border-dashed border-red-600 px-1">{address}</span>
      </div>
      <p className="pl-11 text-[8px]">( ให้ระบุ เลขที่ ตรอก/ซอย หมู่ที่ ถนน ตำบล/แขวง อำเภอ/เขต จังหวัด )</p>
      {children}
    </div>
  );
}

function IdLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-end justify-end gap-3">
      <span>{label}</span>
      <span className="w-[42mm] text-center text-[13px] tracking-wide">{value ? formatTaxId13(value) : EMPTY_ID}</span>
    </div>
  );
}

function Cells({ values, center }: { values: string[]; center?: boolean }) {
  return (
    <div className={`px-1.5 ${center ? "text-center" : "text-right"}`}>
      {values.map((v, i) => (
        <p key={i}>{v}</p>
      ))}
    </div>
  );
}

function Box({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center border-[1.5px] border-black text-[10px] font-bold leading-none">
        {on ? "X" : ""}
      </span>
      {label}
    </span>
  );
}

function Blank({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <span className={`min-h-4 border-b border-dashed border-black px-1 ${className}`}>{children}</span>;
}
