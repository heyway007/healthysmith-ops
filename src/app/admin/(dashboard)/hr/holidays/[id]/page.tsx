import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { updateHoliday } from "../actions";
import { HolidayForm } from "../holiday-form";

export default async function EditHolidayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: holiday } = await supabase.from("company_holidays").select("*").eq("id", id).single();

  if (!holiday) notFound();

  return (
    <div>
      <BackLink href="/admin/hr/holidays" label="กลับไปหน้าวันหยุดบริษัท" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">แก้ไขวันหยุด — {holiday.name}</h2>
      <div className="mt-6">
        <HolidayForm
          action={updateHoliday.bind(null, id)}
          defaultValues={holiday}
          submitLabel="บันทึกการแก้ไข"
          error={error}
        />
      </div>
    </div>
  );
}
