import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { createTeam, deleteTeam, renameTeam } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";

const inputClassName =
  "w-full rounded-lg border border-teal-300 px-3 py-2 text-sm transition-shadow focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: teams }, { data: members }, { data: wfh }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("employees").select("team_id").not("team_id", "is", null),
    supabase.from("company_holidays").select("team_id").not("team_id", "is", null),
  ]);

  const count = (rows: { team_id: string | null }[] | null, id: string) =>
    (rows ?? []).filter((r) => r.team_id === id).length;

  return (
    <div>
      <h2 className="text-lg font-semibold text-teal-950">ทีม</h2>
      <p className="mt-1 text-sm text-teal-700">
        ใช้กำหนดวัน WFH แยกตามทีม — กำหนดทีมให้พนักงานได้ที่หน้าแก้ไขพนักงาน
      </p>

      {error && <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>}

      <div className={`mt-6 max-w-2xl ${formCardClassName}`}>
        <form action={createTeam} className="flex gap-2">
          <input name="name" required placeholder="ชื่อทีมใหม่ เช่น ทีมขายออนไลน์" className={inputClassName} />
          <SubmitButton className={`shrink-0 ${submitButtonClassName}`}>
            <FontAwesomeIcon icon={faPlus} />
            เพิ่มทีม
          </SubmitButton>
        </form>

        <ul className="mt-5 divide-y divide-teal-100">
          {(teams ?? []).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
              <form action={renameTeam.bind(null, t.id)} className="flex min-w-0 flex-1 gap-2">
                <input name="name" defaultValue={t.name} required aria-label="ชื่อทีม" className={inputClassName} />
                <SubmitButton className={`shrink-0 ${secondaryButtonClassName}`}>บันทึก</SubmitButton>
              </form>
              <span className="text-xs text-teal-600">
                {count(members, t.id)} คน ·{" "}
                <Link href={`/admin/holidays?team=${t.id}`} className="hover:underline">
                  WFH {count(wfh, t.id)} วัน
                </Link>
              </span>
              <DeleteButton
                action={deleteTeam.bind(null, t.id)}
                confirmMessage={`ลบทีม "${t.name}"? สมาชิกจะถูกนำออกจากทีม และวัน WFH ของทีมนี้จะถูกลบด้วย`}
              />
            </li>
          ))}
          {(!teams || teams.length === 0) && (
            <li className="py-6 text-center text-sm text-teal-500">ยังไม่มีทีม — เพิ่มทีมแรกได้จากช่องด้านบน</li>
          )}
        </ul>
      </div>
    </div>
  );
}
