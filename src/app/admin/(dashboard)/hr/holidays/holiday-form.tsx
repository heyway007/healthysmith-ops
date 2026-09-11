import Link from "next/link";
import { Field } from "@/components/ui/field";
import {
  formCardClassName,
  secondaryButtonClassName,
  selectClassName,
  submitButtonClassName,
} from "@/lib/ui-classes";
import { HOLIDAY_TYPES } from "@/lib/holiday-types";
import type { Database } from "@/types/database.types";

type Holiday = Database["public"]["Tables"]["company_holidays"]["Row"];

export function HolidayForm({
  action,
  defaultValues,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Holiday;
  submitLabel: string;
  error?: string;
}) {
  return (
    <div className={`max-w-lg ${formCardClassName}`}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-4">
        <Field label="วันที่" name="holiday_date" type="date" required defaultValue={defaultValues?.holiday_date} />
        <Field label="ชื่อวันหยุด" name="name" required defaultValue={defaultValues?.name} />
        <div>
          <label className="block text-sm font-medium text-teal-800">ประเภท</label>
          <select name="type" defaultValue={defaultValues?.type ?? "holiday"} className={selectClassName}>
            {Object.entries(HOLIDAY_TYPES).map(([value, cfg]) => (
              <option key={value} value={value}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
        <Field label="หมายเหตุ (ถ้ามี)" name="note" defaultValue={defaultValues?.note} />

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" className={submitButtonClassName}>
            {submitLabel}
          </button>
          <Link href="/admin/hr/holidays" className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
