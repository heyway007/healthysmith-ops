import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentEmployee } from "@/lib/current-employee";
import { cardClassName, dangerButtonClassName } from "../../ui";
import { withdrawLeaveRequest } from "../actions";
import { LEAVE_STATUS } from "../status";

export default async function LeaveRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .eq("employee_id", employee.id)
    .maybeSingle();
  if (!request) notFound();

  const { data: leaveType } = await supabase
    .from("leave_types")
    .select("name")
    .eq("id", request.leave_type_id)
    .maybeSingle();

  return (
    <div>
      <Link href="/leave" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        กลับไปหน้าใบลาของฉัน
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-indigo-950">{leaveType?.name ?? "ใบลา"}</h1>
        <StatusBadge status={request.status} config={LEAVE_STATUS} />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}

      <div className={`mt-6 max-w-lg ${cardClassName}`}>
        <dl className="grid grid-cols-2 gap-4">
          <Info label="วันที่เริ่มลา" value={request.start_date} />
          <Info label="วันที่สิ้นสุด" value={request.end_date} />
          <Info label="จำนวนวัน" value={String(request.days_count)} />
          <Info label="ยื่นคำขอเมื่อ" value={new Date(request.created_at).toLocaleDateString("th-TH")} />
          <div className="col-span-2">
            <Info label="เหตุผล" value={request.reason ?? "-"} />
          </div>
        </dl>

        {request.status === "pending" && (
          <div className="mt-6 border-t border-indigo-100 pt-5">
            <form action={withdrawLeaveRequest.bind(null, id)}>
              <button type="submit" className={dangerButtonClassName}>
                ถอนคำขอลานี้
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-indigo-500">{label}</dt>
      <dd className="mt-1 text-sm text-indigo-900">{value}</dd>
    </div>
  );
}
