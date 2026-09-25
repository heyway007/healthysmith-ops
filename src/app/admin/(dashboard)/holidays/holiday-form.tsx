import Link from "next/link";
import { Field } from "@/components/ui/field";
import {
  formCardClassName,
  secondaryButtonClassName,
  selectClassName,
  submitButtonClassName,
} from "@/lib/ui-classes";
import { HOLIDAY_TYPES, holidayListUrl } from "@/lib/holiday-types";
import type { Database } from "@/types/database.types";
import { HolidayDateFields } from "./holiday-date-fields";
import { SubmitButton } from "@/components/ui/submit-button";

type Holiday = Database["public"]["Tables"]["company_holidays"]["Row"];

export function HolidayForm({
  action,
  defaultValues,
  defaultDate,
  defaultTeamId,
  teams,
  returnView,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Holiday;
  /** Pre-filled date when adding from a calendar cell. */
  defaultDate?: string;
  defaultTeamId?: string;
  teams: { id: string; name: string }[];
  returnView: string;
  submitLabel: string;
  error?: string;
}) {
  const date = defaultValues?.holiday_date ?? defaultDate;

  return (
    <div className={`max-w-lg ${formCardClassName}`}>
      {error && (
        <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="return_view" value={returnView} />
        <HolidayDateFields defaultDate={defaultDate} originalDate={defaultValues?.holiday_date} />
        <Field label="ชื่อวันหยุด" name="name" required defaultValue={defaultValues?.name} />
        <div>
          <label className="block text-sm font-medium text-teal-800">ประเภท</label>
          <select name="type" defaultValue={defaultValues?.type ?? (defaultTeamId ? "wfh" : "holiday")} className={selectClassName}>
            {Object.entries(HOLIDAY_TYPES).map(([value, cfg]) => (
              <option key={value} value={value}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-teal-800" htmlFor="team_id">
            ทีม (เฉพาะ WFH)
          </label>
          <select
            id="team_id"
            name="team_id"
            defaultValue={defaultValues?.team_id ?? defaultTeamId ?? ""}
            className={selectClassName}
          >
            <option value="">ทั้งบริษัท</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-teal-500">วันหยุดจะใช้กับทั้งบริษัทเสมอ ช่องนี้มีผลเฉพาะประเภท WFH</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-teal-800" htmlFor="note">
            หมายเหตุ (ถ้ามี)
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={defaultValues?.note ?? ""}
            placeholder="เช่น วันหยุดชดเชย, WFH เฉพาะฝ่ายขาย, เข้างานครึ่งวัน"
            className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <p className="mt-1 text-xs text-teal-500">พนักงานจะเห็นหมายเหตุนี้ในหน้าวันหยุดของหน้าบ้าน</p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <SubmitButton className={submitButtonClassName}>{submitLabel}</SubmitButton>
          <Link href={holidayListUrl(returnView, date)} className={secondaryButtonClassName}>
            ยกเลิก
          </Link>
        </div>
      </form>
    </div>
  );
}
