import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { DeleteButton } from "@/components/ui/delete-button";
import { holidayListUrl } from "@/lib/holiday-types";
import { deleteHoliday, updateHoliday } from "../actions";
import { HolidayForm } from "../holiday-form";

export default async function EditHolidayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; view?: string }>;
}) {
  const { id } = await params;
  const { error, view } = await searchParams;
  const returnView = view === "list" ? "list" : "calendar";

  const supabase = await createClient();
  const [{ data: holiday }, { data: teams }] = await Promise.all([
    supabase.from("company_holidays").select("*").eq("id", id).single(),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  if (!holiday) notFound();

  const backHref = holidayListUrl(returnView, holiday.holiday_date);

  return (
    <div>
      <BackLink href={backHref} label="กลับไปหน้าวันหยุดบริษัท" />
      <div className="mt-3 flex max-w-lg items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-teal-950">แก้ไขวันหยุด — {holiday.name}</h2>
        <DeleteButton
          action={deleteHoliday.bind(null, id, backHref)}
          confirmMessage={`ลบวันหยุด "${holiday.name}"?`}
        />
      </div>
      <div className="mt-6">
        <HolidayForm
          action={updateHoliday.bind(null, id)}
          defaultValues={holiday}
          teams={teams ?? []}
          returnView={returnView}
          submitLabel="บันทึกการแก้ไข"
          error={error}
        />
      </div>
    </div>
  );
}
