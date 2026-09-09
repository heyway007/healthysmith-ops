import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteRequest } from "./actions";
import { PR_STATUS } from "./status";

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: requests }, { data: employees }, { data: departments }] = await Promise.all([
    supabase.from("purchase_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("employees").select("id, first_name, last_name"),
    supabase.from("departments").select("id, name"),
  ]);

  const employeeNameById = new Map(
    (employees ?? []).map((e) => [e.id, `${e.first_name} ${e.last_name}`])
  );
  const departmentNameById = new Map((departments ?? []).map((d) => [d.id, d.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ใบขอซื้อ (Purchase Request)</h2>
          <p className="mt-1 text-sm text-teal-700">รายการขอซื้อจากแต่ละแผนก</p>
        </div>
        <Link
          href="/purchase/requests/new"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-linear-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 transition-colors hover:from-orange-600 hover:to-orange-700"
        >
          <FontAwesomeIcon icon={faPlus} />
          สร้างใบขอซื้อ
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เลขที่ PR</th>
              <th className="px-4 py-3">ผู้ขอซื้อ</th>
              <th className="px-4 py-3">แผนก</th>
              <th className="px-4 py-3">วันที่ขอ</th>
              <th className="px-4 py-3">ต้องการใช้</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {requests?.map((r) => (
              <tr key={r.id} className="border-t border-teal-100 hover:bg-teal-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/purchase/requests/${r.id}`}
                    className="font-medium text-teal-800 hover:text-orange-600"
                  >
                    {r.pr_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-teal-700">
                  {(r.requested_by && employeeNameById.get(r.requested_by)) ?? "-"}
                </td>
                <td className="px-4 py-3 text-teal-700">
                  {(r.department_id && departmentNameById.get(r.department_id)) ?? "-"}
                </td>
                <td className="px-4 py-3 text-teal-700">{r.request_date}</td>
                <td className="px-4 py-3 text-teal-700">{r.required_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} config={PR_STATUS} />
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "draft" && (
                    <DeleteButton
                      action={deleteRequest.bind(null, r.id)}
                      confirmMessage={`ลบใบขอซื้อ "${r.pr_number}"?`}
                    />
                  )}
                </td>
              </tr>
            ))}
            {(!requests || requests.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่มีใบขอซื้อ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
