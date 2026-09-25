import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { dangerButtonClassName } from "@/lib/ui-classes";
import { resetToHolidaysOnly } from "./actions";
import { ConfirmSubmit } from "./wfh/confirm-submit";

/**
 * "คืนค่าเริ่มต้น" button: opens a small panel (native <details>, no JS) that
 * shows how many WFH days will go, lets HR pick this year or every year, and
 * asks for confirmation before deleting. Public holidays are never touched.
 */
export function ResetPanel({
  year,
  month,
  wfhThisYear,
  wfhAllYears,
}: {
  year: number;
  month: number;
  wfhThisYear: number;
  wfhAllYears: number;
}) {
  const thaiYear = year + 543;
  return (
    <details className="group relative">
      <summary className={`flex cursor-pointer list-none items-center gap-2 ${dangerButtonClassName}`}>
        <FontAwesomeIcon icon={faRotateLeft} />
        คืนค่าเริ่มต้น
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-rose-200 bg-white p-4 shadow-lg">
        <p className="font-semibold text-rose-700">คืนค่าเริ่มต้น</p>
        <p className="mt-1 text-sm text-gray-600">
          ลบวัน WFH ทั้งหมด (ทั้งบริษัทและทุกทีม) ให้เหลือเฉพาะวันหยุด — ข้อมูลทีมและพนักงานไม่ถูกลบ
        </p>

        {wfhAllYears === 0 ? (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">ไม่มีวัน WFH ให้ลบ</p>
        ) : (
          <form action={resetToHolidaysOnly} className="mt-3 space-y-3">
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <fieldset className="space-y-2 text-sm text-gray-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="scope" value="year" defaultChecked className="accent-rose-600" />
                เฉพาะปี {thaiYear} <span className="text-gray-500">({wfhThisYear} วัน)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="scope" value="all" className="accent-rose-600" />
                ทุกปี <span className="text-gray-500">({wfhAllYears} วัน)</span>
              </label>
            </fieldset>
            <ConfirmSubmit
              message="ยืนยันลบวัน WFH ตามที่เลือก? ลบแล้วกู้คืนไม่ได้ (วันหยุดจะยังอยู่)"
              className={`w-full ${dangerButtonClassName}`}
            >
              ลบวัน WFH และคืนค่าเริ่มต้น
            </ConfirmSubmit>
          </form>
        )}
      </div>
    </details>
  );
}
