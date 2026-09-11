import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  dangerButtonClassName,
  formCardClassName,
  secondaryButtonClassName,
  submitButtonClassName,
} from "@/lib/ui-classes";
import {
  updateRequest,
  submitRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
} from "../actions";
import { RequestForm } from "../request-form";
import { PR_STATUS } from "../status";

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("purchase_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (!request) notFound();

  const { data: items } = await supabase
    .from("purchase_request_items")
    .select("*")
    .eq("purchase_request_id", id)
    .order("sort_order");

  if (request.status === "draft") {
    return (
      <div>
        <BackLink href="/admin/purchase/requests" label="กลับไปหน้ารายการขอซื้อ" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-teal-950">แก้ไขใบขอซื้อ — {request.pr_number}</h2>
            <StatusBadge status={request.status} config={PR_STATUS} />
          </div>
          <form action={submitRequest.bind(null, id)}>
            <button type="submit" className={secondaryButtonClassName}>
              ส่งอนุมัติ
            </button>
          </form>
        </div>
        <div className="mt-6">
          <RequestForm
            action={updateRequest.bind(null, id)}
            defaultValues={request}
            defaultItems={items ?? []}
            submitLabel="บันทึกการแก้ไข"
            error={error}
          />
        </div>
      </div>
    );
  }

  const [{ data: requester }, { data: department }, { data: approver }] = await Promise.all([
    request.requested_by
      ? supabase.from("employee_directory").select("first_name, last_name").eq("id", request.requested_by).maybeSingle()
      : Promise.resolve({ data: null }),
    request.department_id
      ? supabase.from("departments").select("name").eq("id", request.department_id).maybeSingle()
      : Promise.resolve({ data: null }),
    request.approved_by
      ? supabase.from("employee_directory").select("first_name, last_name").eq("id", request.approved_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div>
      <BackLink href="/admin/purchase/requests" label="กลับไปหน้ารายการขอซื้อ" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-teal-950">ใบขอซื้อ — {request.pr_number}</h2>
        <StatusBadge status={request.status} config={PR_STATUS} />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
      )}

      <div className={`mt-6 ${formCardClassName}`}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="ผู้ขอซื้อ" value={requester ? `${requester.first_name} ${requester.last_name}` : "-"} />
          <Info label="แผนก" value={department?.name ?? "-"} />
          <Info label="วันที่ขอ" value={request.request_date} />
          <Info label="วันที่ต้องการใช้" value={request.required_date ?? "-"} />
          <Info
            label="ผู้อนุมัติ/พิจารณา"
            value={approver ? `${approver.first_name} ${approver.last_name}` : "-"}
          />
          <Info label="หมายเหตุ" value={request.note ?? "-"} />
        </dl>

        <div className="mt-6 overflow-x-auto rounded-lg border border-teal-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                <th className="px-3 py-2">รายละเอียด</th>
                <th className="px-3 py-2">จำนวน</th>
                <th className="px-3 py-2">ราคาประเมิน/หน่วย</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-t border-teal-100">
                  <td className="px-3 py-2 text-teal-900">{item.description ?? "-"}</td>
                  <td className="px-3 py-2 text-teal-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-teal-700">{item.estimated_unit_price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-teal-100 pt-5">
          {request.status === "pending_approval" && (
            <>
              <form action={approveRequest.bind(null, id)}>
                <button type="submit" className={submitButtonClassName}>
                  อนุมัติ
                </button>
              </form>
              <form action={rejectRequest.bind(null, id)}>
                <button type="submit" className={dangerButtonClassName}>
                  ไม่อนุมัติ
                </button>
              </form>
              <form action={cancelRequest.bind(null, id)}>
                <button type="submit" className={secondaryButtonClassName}>
                  ยกเลิกใบขอซื้อ
                </button>
              </form>
            </>
          )}

          {request.status === "approved" && (
            <Link
              href={`/admin/purchase/orders/new?from_pr=${id}`}
              className={`inline-flex items-center gap-2 ${submitButtonClassName}`}
            >
              แปลงเป็นใบสั่งซื้อ (PO)
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-teal-500">{label}</dt>
      <dd className="mt-1 text-sm text-teal-900">{value}</dd>
    </div>
  );
}
