import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouseLaptop } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { DeleteButton } from "@/components/ui/delete-button";
import { secondaryButtonClassName } from "@/lib/ui-classes";
import { deleteTeam, updateTeam } from "../actions";
import { TeamForm } from "../team-form";

export default async function EditTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const [{ data: team }, { data: members }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("employees")
      .select("id, employee_code, prefix_name, first_name, last_name, nickname")
      .eq("team_id", id)
      .order("first_name"),
  ]);
  if (!team) notFound();

  return (
    <div>
      <BackLink href="/admin/teams" label="กลับไปหน้าทีม" />
      <div className="mt-3 flex max-w-lg items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-teal-950">แก้ไขทีม — {team.name}</h1>
        <DeleteButton
          action={deleteTeam.bind(null, id, "/admin/teams")}
          confirmMessage={`ลบทีม "${team.name}"? สมาชิกจะถูกนำออกจากทีม และวัน WFH ของทีมนี้จะถูกลบด้วย`}
        />
      </div>

      <div className="mt-6">
        <TeamForm action={updateTeam.bind(null, id)} defaultName={team.name} submitLabel="บันทึก" error={error} />
      </div>

      <section className="mt-8 max-w-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-teal-950">สมาชิก ({members?.length ?? 0} คน)</h2>
          <Link href={`/admin/holidays/wfh?team=${id}`} className={`flex items-center gap-2 ${secondaryButtonClassName}`}>
            <FontAwesomeIcon icon={faHouseLaptop} />
            ตั้งวัน WFH ของทีม
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-4 py-2.5">รหัส</th>
                <th className="px-4 py-2.5">ชื่อ-นามสกุล</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
                <tr key={m.id} className="border-t border-teal-100 hover:bg-teal-50">
                  <td className="px-4 py-2.5 tabular-nums text-teal-700">{m.employee_code}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/hr/${m.id}`} className="text-teal-950 hover:text-orange-600">
                      {m.prefix_name}
                      {m.first_name} {m.last_name}
                      {m.nickname && <span className="text-teal-500"> ({m.nickname})</span>}
                    </Link>
                  </td>
                </tr>
              ))}
              {(members ?? []).length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-teal-400">
                    ยังไม่มีสมาชิก — เลือกทีมให้พนักงานได้ที่หน้าแก้ไขพนักงาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
