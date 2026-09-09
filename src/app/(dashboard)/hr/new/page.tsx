import { BackLink } from "@/components/ui/back-link";
import { createEmployee } from "../actions";
import { EmployeeForm } from "../employee-form";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <BackLink href="/hr" label="กลับไปหน้ารายชื่อพนักงาน" />
      <h1 className="mt-3 text-2xl font-semibold text-teal-950">เพิ่มพนักงานใหม่</h1>
      <div className="mt-6">
        <EmployeeForm action={createEmployee} submitLabel="เพิ่มพนักงาน" error={error} />
      </div>
    </div>
  );
}
