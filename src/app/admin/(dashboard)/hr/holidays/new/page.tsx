import { BackLink } from "@/components/ui/back-link";
import { createHoliday } from "../actions";
import { HolidayForm } from "../holiday-form";

export default async function NewHolidayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <BackLink href="/admin/hr/holidays" label="กลับไปหน้าวันหยุดบริษัท" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">เพิ่มวันหยุด</h2>
      <div className="mt-6">
        <HolidayForm action={createHoliday} submitLabel="เพิ่มวันหยุด" error={error} />
      </div>
    </div>
  );
}
