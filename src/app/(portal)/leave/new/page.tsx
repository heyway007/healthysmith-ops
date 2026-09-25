import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { cardClassName, inputClassName, primaryButtonClassName, secondaryButtonClassName } from "../../ui";
import { createLeaveRequest } from "../actions";

export default async function NewLeaveRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: leaveTypes } = await supabase.from("leave_types").select("*").order("name");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Link href="/leave" className="inline-flex items-center gap-2 text-sm font-medium text-mist-600 hover:text-mist-800">
        <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        กลับไปหน้าใบลาของฉัน
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-mist-900">ยื่นใบลาใหม่</h1>

      <div className={`mt-6 max-w-lg ${cardClassName}`}>
        {error && (
          <p className="mb-5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        <form action={createLeaveRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-mist-800">ประเภทการลา</label>
            <select name="leave_type_id" required defaultValue="" className={inputClassName}>
              <option value="" disabled>
                - เลือกประเภทการลา -
              </option>
              {leaveTypes?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                  {lt.max_days_per_year != null ? ` (สิทธิ์ ${lt.max_days_per_year} วัน/ปี)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-mist-800" htmlFor="start_date">
                วันที่เริ่มลา
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                defaultValue={today}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-mist-800" htmlFor="end_date">
                วันที่สิ้นสุด
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                required
                defaultValue={today}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-mist-800" htmlFor="reason">
              เหตุผล (ถ้ามี)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className={inputClassName}
              placeholder="ระบุเหตุผลการลา"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" className={primaryButtonClassName}>
              ยื่นใบลา
            </button>
            <Link href="/leave" className={secondaryButtonClassName}>
              ยกเลิก
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
