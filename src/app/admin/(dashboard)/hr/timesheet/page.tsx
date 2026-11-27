import { createClient } from "@/lib/supabase/server";
import { TimesheetViewer } from "./timesheet-viewer";

export default async function TimesheetPage() {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("scan_code, nickname, first_name")
    .order("first_name");

  // scan code (the "Code" column of the scanner log) -> nickname, set on the
  // employee form. Anyone without a code falls back to typing the name by hand.
  const roster: Record<number, string> = {};
  for (const e of employees ?? []) {
    if (e.scan_code != null) roster[e.scan_code] = e.nickname || e.first_name;
  }
  const nameHints = [...new Set((employees ?? []).map((e) => e.nickname || e.first_name).filter(Boolean))];

  return (
    <div>
      <h2 className="text-lg font-semibold text-teal-950">แปลงไฟล์สแกนนิ้ว</h2>
      <p className="mt-1 text-sm text-teal-700">
        นำเข้าไฟล์ .txt จากเครื่องสแกนนิ้ว แล้วแปลงเป็นตารางเวลาเข้า–ออก รายวัน พร้อมคำนวณมาสาย
      </p>
      <div className="mt-6">
        <TimesheetViewer nameHints={nameHints} roster={roster} />
      </div>
    </div>
  );
}
