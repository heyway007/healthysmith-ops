import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { holidayListUrl } from "@/lib/holiday-types";
import { createHoliday } from "../actions";
import { HolidayForm } from "../holiday-form";

export default async function NewHolidayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; date?: string; view?: string; team?: string }>;
}) {
  const { error, date, view, team } = await searchParams;
  const returnView = view === "list" ? "list" : "calendar";
  const defaultDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  const supabase = await createClient();
  const { data: teams } = await supabase.from("teams").select("id, name").order("name");
  const defaultTeamId = teams?.some((t) => t.id === team) ? team : undefined;

  return (
    <div>
      <BackLink href={holidayListUrl(returnView, defaultDate)} label="กลับไปหน้าวันหยุดบริษัท" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">เพิ่มวันหยุด</h2>
      <div className="mt-6">
        <HolidayForm
          action={createHoliday}
          defaultDate={defaultDate}
          defaultTeamId={defaultTeamId}
          teams={teams ?? []}
          returnView={returnView}
          submitLabel="เพิ่มวันหยุด"
          error={error}
        />
      </div>
    </div>
  );
}
