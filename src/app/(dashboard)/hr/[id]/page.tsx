import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { updateEmployee } from "../actions";
import { EmployeeForm } from "../employee-form";

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: employee } = await supabase.from("employees").select("*").eq("id", id).single();

  if (!employee) notFound();

  return (
    <div>
      <BackLink href="/hr" label="กลับไปหน้ารายชื่อพนักงาน" />
      <h1 className="mt-3 text-2xl font-semibold text-teal-950">
        แก้ไขพนักงาน — {employee.first_name} {employee.last_name}
      </h1>
      <div className="mt-6">
        <EmployeeForm
          action={updateEmployee.bind(null, id)}
          defaultValues={employee}
          submitLabel="บันทึกการแก้ไข"
          error={error}
        />
      </div>
    </div>
  );
}
