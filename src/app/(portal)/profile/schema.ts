import { z } from "zod";
import { PREFIX_NAMES } from "@/lib/prefix-names";

export const PROFILE_FIELDS = [
  "prefix_name",
  "first_name",
  "last_name",
  "nickname",
  "id_card_number",
  "phone",
  "email",
  "address",
  "bank_name",
  "bank_account_number",
  "bank_account_name",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileValues = Record<ProfileField, string>;

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<ProfileField, string>>;
  values?: ProfileValues;
};

// Users often type IDs / phone / account numbers with dashes or spaces.
const stripSeparators = (s: string) => s.replace(/[\s-]/g, "");

// Thai national ID: 13 digits, last digit is a mod-11 checksum of the first 12.
function isValidThaiId(id: string) {
  if (!/^\d{13}$/.test(id)) return false;
  const sum = [...id.slice(0, 12)].reduce((acc, d, i) => acc + Number(d) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}ยาวเกิน ${max} ตัวอักษร`);

export const profileSchema = z
  .object({
    prefix_name: z
      .string()
      .refine((v) => v === "" || (PREFIX_NAMES as readonly string[]).includes(v), "คำนำหน้าไม่ถูกต้อง"),
    first_name: z.string().trim().min(1, "กรุณากรอกชื่อจริง").max(100, "ชื่อจริงยาวเกิน 100 ตัวอักษร"),
    last_name: z.string().trim().min(1, "กรุณากรอกนามสกุล").max(100, "นามสกุลยาวเกิน 100 ตัวอักษร"),
    nickname: optionalText(50, "ชื่อเล่น"),
    id_card_number: z
      .string()
      .transform(stripSeparators)
      .refine((v) => v === "" || /^\d{13}$/.test(v), "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก")
      .refine((v) => v === "" || !/^\d{13}$/.test(v) || isValidThaiId(v), "เลขบัตรประชาชนไม่ถูกต้อง (ตรวจสอบหลักสุดท้าย)"),
    phone: z
      .string()
      .transform(stripSeparators)
      .refine((v) => v === "" || /^0\d{8,9}$/.test(v), "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก"),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, "รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com"),
    address: optionalText(500, "ที่อยู่"),
    bank_name: optionalText(100, "ชื่อธนาคาร"),
    bank_account_number: z
      .string()
      .transform(stripSeparators)
      .refine((v) => v === "" || /^\d{10,15}$/.test(v), "เลขบัญชีต้องเป็นตัวเลข 10–15 หลัก"),
    bank_account_name: optionalText(150, "ชื่อบัญชี"),
  })
  .superRefine((data, ctx) => {
    // Bank details are only useful for payroll when all three are present.
    const bankFields = ["bank_name", "bank_account_number", "bank_account_name"] as const;
    if (bankFields.some((f) => data[f] !== "")) {
      const labels = { bank_name: "ธนาคาร", bank_account_number: "เลขบัญชี", bank_account_name: "ชื่อบัญชี" };
      for (const f of bankFields) {
        if (data[f] === "") {
          ctx.addIssue({ code: "custom", path: [f], message: `กรุณากรอก${labels[f]}ให้ครบ` });
        }
      }
    }
  });
