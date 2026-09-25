import { BackLink } from "@/components/ui/back-link";
import { createTeam } from "../actions";
import { TeamForm } from "../team-form";

export default async function NewTeamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div>
      <BackLink href="/admin/teams" label="กลับไปหน้าทีม" />
      <h1 className="mt-3 text-2xl font-semibold text-teal-950">เพิ่มทีม</h1>
      <div className="mt-6">
        <TeamForm action={createTeam} submitLabel="เพิ่มทีม" error={error} />
      </div>
    </div>
  );
}
