// Labels and formatting for หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ). Client-safe.

export const WHT_FORM_TYPES = [
  { value: "pnd1a", label: "ภ.ง.ด. 1ก." },
  { value: "pnd1a_special", label: "ภ.ง.ด. 1ก.พิเศษ" },
  { value: "pnd2", label: "ภ.ง.ด. 2" },
  { value: "pnd2a", label: "ภ.ง.ด. 2ก." },
  { value: "pnd3", label: "ภ.ง.ด. 3" },
  { value: "pnd3a", label: "ภ.ง.ด. 3ก." },
  { value: "pnd53", label: "ภ.ง.ด. 53" },
] as const;
export type WhtFormType = (typeof WHT_FORM_TYPES)[number]["value"];

export const PAYER_CONDITIONS = [
  { value: "withhold", label: "หักภาษี ณ ที่จ่าย" },
  { value: "always", label: "ออกภาษีให้ตลอดไป" },
  { value: "once", label: "ออกภาษีให้ครั้งเดียว" },
  { value: "other", label: "อื่นๆ (ระบุ)" },
] as const;
export type PayerCondition = (typeof PAYER_CONDITIONS)[number]["value"];

/**
 * The income lines printed on the form, in order. `key` is set on the lines
 * that can carry an amount (income_type); headings have none. `specify`
 * lines print the user's "(ระบุ)" text. `short` is the label in the picker.
 */
export const WHT_INCOME_ROWS: {
  key?: string;
  label: string;
  indent: number;
  specify?: boolean;
  short?: string;
}[] = [
  { key: "1", indent: 0, label: "1. เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1)", short: "1. เงินเดือน ค่าจ้าง โบนัส — 40 (1)" },
  { key: "2", indent: 0, label: "2. ค่าธรรมเนียม ค่านายหน้า ฯลฯ ตามมาตรา 40 (2)", short: "2. ค่าธรรมเนียม ค่านายหน้า — 40 (2)" },
  { key: "3", indent: 0, label: "3. ค่าแห่งลิขสิทธิ์ ฯลฯ ตามมาตรา 40 (3)", short: "3. ค่าลิขสิทธิ์ — 40 (3)" },
  { key: "4a", indent: 0, label: "4. (ก) ค่าดอกเบี้ย ฯลฯ ตามมาตรา 40 (4) (ก)", short: "4 (ก) ดอกเบี้ย — 40 (4) (ก)" },
  { indent: 1, label: "(ข) เงินปันผล เงินส่วนแบ่งของกำไร ฯลฯ ตามมาตรา 40 (4) (ข)" },
  {
    indent: 1,
    label: "(1) กรณีผู้ได้รับเงินปันผลได้รับเครดิตภาษี โดยจ่ายจากกำไรสุทธิของกิจการที่ต้องเสียภาษีเงินได้นิติบุคคลในอัตราดังนี้",
  },
  { key: "4b1_1", indent: 2, label: "(1.1) อัตราร้อยละ 30 ของกำไรสุทธิ", short: "4 (ข)(1.1) ปันผล — กำไรสุทธิอัตรา 30%" },
  { key: "4b1_2", indent: 2, label: "(1.2) อัตราร้อยละ 25 ของกำไรสุทธิ", short: "4 (ข)(1.2) ปันผล — กำไรสุทธิอัตรา 25%" },
  { key: "4b1_3", indent: 2, label: "(1.3) อัตราร้อยละ 20 ของกำไรสุทธิ", short: "4 (ข)(1.3) ปันผล — กำไรสุทธิอัตรา 20%" },
  { key: "4b1_4", indent: 2, label: "(1.4) อัตราอื่น ๆ (ระบุ)", specify: true, short: "4 (ข)(1.4) ปันผล — อัตราอื่น (ระบุ)" },
  { indent: 1, label: "(2) กิจการที่ได้รับยกเว้นภาษีเงินได้นิติบุคคลซึ่งผู้รับเงินปันผลไม่ได้รับเครดิตภาษี" },
  { key: "4b2_1", indent: 2, label: "(2.1) กำไรสุทธิของกิจการที่ได้รับยกเว้นภาษีเงินได้นิติบุคคล", short: "4 (ข)(2.1) ปันผล — กิจการได้รับยกเว้น" },
  {
    key: "4b2_2",
    indent: 2,
    label: "(2.2) เงินปันผลหรือเงินส่วนแบ่งของกำไรที่ได้รับยกเว้นไม่ต้องนำมารวมคำนวณเป็นรายได้เพื่อเสียภาษีเงินได้นิติบุคคล",
    short: "4 (ข)(2.2) ปันผลที่ได้รับยกเว้น",
  },
  {
    key: "4b2_3",
    indent: 2,
    label: "(2.3) กำไรสุทธิส่วนที่ได้หักผลขาดทุนสุทธิยกมาไม่เกิน 5 ปี ก่อนรอบระยะเวลาบัญชีปัจจุบัน",
    short: "4 (ข)(2.3) กำไรหลังหักขาดทุนยกมา",
  },
  { key: "4b2_4", indent: 2, label: "(2.4) กำไรที่รับรู้ทางบัญชีโดยวิธีส่วนได้เสีย (equity method)", short: "4 (ข)(2.4) equity method" },
  { key: "4b2_5", indent: 2, label: "(2.5) อื่น ๆ (ระบุ)", specify: true, short: "4 (ข)(2.5) อื่น ๆ (ระบุ)" },
  {
    key: "5",
    indent: 0,
    label:
      "5. การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่าย ตามคำสั่งกรมสรรพากรที่ออกตามมาตรา 3 เตรส เช่น รางวัล ส่วนลดหรือประโยชน์ใดๆ เนื่องจากการส่งเสริมการขาย รางวัลในการประกวด การแข่งขัน การชิงโชค ค่าแสดงของนักแสดงสาธารณะ ค่าบริการ ค่าขนส่ง ค่าจ้างทำของ ค่าจ้างโฆษณา ค่าเช่า ค่าเบี้ยประกันวินาศภัย ฯลฯ",
    short: "5. ค่าบริการ ค่าขนส่ง ค่าจ้างทำของ ค่าโฆษณา ค่าเช่า ฯลฯ (3 เตรส)",
  },
  { key: "6", indent: 0, label: "6. อื่น ๆ (ระบุ)", specify: true, short: "6. อื่น ๆ (ระบุ)" },
];

export const WHT_INCOME_TYPES = WHT_INCOME_ROWS.filter((r) => r.key) as (typeof WHT_INCOME_ROWS[number] & { key: string })[];

/** Common withholding rates offered as quick picks (percent). */
export const WHT_RATES = [1, 2, 3, 5, 10, 15];

/** Branch code -> 'สำนักงานใหญ่' / 'สาขาที่ 00001', as printed after a company name. */
export function branchLabel(code: string | null | undefined) {
  if (!code || /^0+$/.test(code)) return "สำนักงานใหญ่";
  return `สาขาที่ ${code}`;
}

/** '0105560005206' -> '0-1055-60005-20-6' (the layout printed on Thai tax forms). */
export function formatTaxId13(id: string | null | undefined) {
  const d = (id ?? "").replace(/\D/g, "");
  if (d.length !== 13) return id ?? "";
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
}

/** '2026-10-16' -> '16-10-2026' (or '16/10/2026' with sep '/'), as on the company's form. */
export function dmy(iso: string | null | undefined, sep = "-") {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return [d, m, y].join(sep);
}
