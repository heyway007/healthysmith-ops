// Panels shared by the tax invoice and 50 ทวิ detail pages: state + actions
// (edit / cancel / approve), integrity check, what changed from the original,
// and the document's history. Server components.

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faClockRotateLeft,
  faHourglassHalf,
  faPenToSquare,
  faShieldHalved,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { canDoc } from "@/lib/doc-permissions";
import { dangerButtonClassName, formCardClassName, secondaryButtonClassName, submitButtonClassName } from "@/lib/ui-classes";
import { requestCancel, reviewCancel, type DocKind } from "@/app/admin/(dashboard)/tax-documents/doc-actions";
import type { Json } from "@/types/database.types";

/** The columns both document tables share for the cancel/replace workflow. */
export type DocState = {
  id: string;
  is_cancelled: boolean;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  cancel_requested_at: string | null;
  cancel_requested_by: string | null;
  cancel_request_reason: string | null;
  cancel_review_note: string | null;
  replaces_id: string | null;
  replaced_by_id: string | null;
  created_by_email: string | null;
  created_at: string;
};

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })
    : "-";

const textareaClassName =
  "mt-2 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

// ---------------------------------------------------------------------------
// Status banner + action panel
// ---------------------------------------------------------------------------

export function DocumentStatusBanner({
  doc,
  basePath,
  numbers,
}: {
  doc: DocState;
  basePath: string;
  /** document numbers of replaces_id / replaced_by_id, for the links */
  numbers: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      {doc.replaces_id && (
        <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <FontAwesomeIcon icon={faPenToSquare} className="mr-2" />
          ฉบับนี้ออกแทน (แก้ไข) เอกสารเลขที่{" "}
          <Link href={`${basePath}/${doc.replaces_id}`} className="font-mono font-medium underline">
            {numbers[doc.replaces_id] ?? "ฉบับเดิม"}
          </Link>
        </p>
      )}
      {!doc.is_cancelled && doc.cancel_requested_at && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FontAwesomeIcon icon={faHourglassHalf} className="mr-2" />
          รออนุมัติยกเลิก — ขอโดย {doc.cancel_requested_by ?? "-"} เมื่อ {when(doc.cancel_requested_at)} · เหตุผล:{" "}
          {doc.cancel_request_reason}
        </p>
      )}
      {!doc.is_cancelled && !doc.cancel_requested_at && doc.cancel_review_note && (
        <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">คำขอยกเลิกครั้งล่าสุด: {doc.cancel_review_note}</p>
      )}
      {doc.is_cancelled && (
        <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          <p>
            ยกเลิกเมื่อ {when(doc.cancelled_at)} โดย {doc.cancelled_by ?? "-"} — เหตุผล: {doc.cancel_reason ?? "-"}
          </p>
          {doc.cancel_requested_by && doc.cancel_requested_by !== doc.cancelled_by && (
            <p className="mt-0.5 text-xs">
              ขอยกเลิกโดย {doc.cancel_requested_by} เมื่อ {when(doc.cancel_requested_at)} · อนุมัติโดย {doc.cancelled_by}
              {doc.cancel_review_note && ` (${doc.cancel_review_note})`}
            </p>
          )}
          {doc.replaced_by_id && (
            <p className="mt-1">
              แก้ไขเป็นฉบับใหม่เลขที่{" "}
              <Link href={`${basePath}/${doc.replaced_by_id}`} className="font-mono font-medium underline">
                {numbers[doc.replaced_by_id] ?? "ฉบับใหม่"}
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentActionsPanel({
  kind,
  doc,
  perms,
  editHref,
}: {
  kind: DocKind;
  doc: DocState;
  perms: string[];
  /** where "แก้ไข" / "ออกใบใหม่แทน" goes (pre-filled form in replace mode) */
  editHref: string;
}) {
  const canEdit = canDoc(perms, "edit") && !doc.replaced_by_id;
  const approver = canDoc(perms, "approve");
  const canCancel = (canDoc(perms, "cancel") || approver) && !doc.is_cancelled && !doc.cancel_requested_at;
  const pending = !doc.is_cancelled && !!doc.cancel_requested_at;

  if (!canEdit && !canCancel && !(pending && approver)) return null;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className={formCardClassName}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">
            {doc.is_cancelled ? "ออกใบใหม่แทน" : "แก้ไขเอกสาร"}
          </h3>
          <p className="mt-2 text-xs text-teal-600">
            {doc.is_cancelled
              ? "ออกฉบับใหม่โดยคัดลอกข้อมูลจากใบนี้ ระบบจะอ้างอิงถึงกันทั้งสองฉบับ"
              : "ระบบจะออกฉบับใหม่ (เลขที่ใหม่) แล้วยกเลิกฉบับนี้พร้อมเก็บไว้ — ไม่มีการลบหรือเขียนทับข้อมูลเดิม"}
          </p>
          <Link href={editHref} className={`${secondaryButtonClassName} mt-3 inline-flex items-center gap-2`}>
            <FontAwesomeIcon icon={faPenToSquare} />
            {doc.is_cancelled ? "ออกใบใหม่แทน" : "แก้ไขเอกสาร"}
          </Link>
        </div>
      )}

      {canCancel && (
        <form action={requestCancel.bind(null, kind, doc.id)} className={formCardClassName}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">
            {approver ? "ยกเลิกเอกสาร" : "ขอยกเลิกเอกสาร"}
          </h3>
          <p className="mt-2 text-xs text-teal-600">
            {approver
              ? "เลขที่นี้จะไม่ถูกนำกลับมาใช้ และเอกสารยังเก็บไว้ในระบบพร้อมเหตุผล"
              : "คำขอจะส่งให้ผู้มีสิทธิ์อนุมัติ — ระหว่างรอ เอกสารยังมีผลอยู่"}
          </p>
          <textarea name="cancel_reason" required rows={2} placeholder="เหตุผล เช่น ลูกค้าแจ้งแก้ชื่อบริษัท" className={textareaClassName} />
          <SubmitButton className={`${dangerButtonClassName} mt-3`} pendingLabel="กำลังบันทึก...">
            {approver ? "ยกเลิกใบนี้" : "ส่งคำขอยกเลิก"}
          </SubmitButton>
        </form>
      )}

      {pending && approver && (
        <div className={formCardClassName}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">อนุมัติคำขอยกเลิก</h3>
          <form className="mt-2">
            <textarea name="review_note" rows={2} placeholder="หมายเหตุ (ถ้ามี)" className={textareaClassName} />
            <div className="mt-3 flex flex-wrap gap-2">
              <SubmitButton className={submitButtonClassName} pendingLabel="กำลังบันทึก..." formAction={reviewCancel.bind(null, kind, doc.id, true)}>
                อนุมัติยกเลิก
              </SubmitButton>
              <SubmitButton className={secondaryButtonClassName} pendingLabel="กำลังบันทึก..." formAction={reviewCancel.bind(null, kind, doc.id, false)}>
                ไม่อนุมัติ
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integrity: stored SHA-256 vs the document's current content
// ---------------------------------------------------------------------------

export async function IntegrityBadge({ kind, id }: { kind: DocKind; id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_document", { p_kind: kind, p_id: id });
  const v = data?.[0];
  if (!v?.stored_hash) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
        v.matches ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
      }`}
      title={`SHA-256 ${v.stored_hash}`}
    >
      <FontAwesomeIcon icon={v.matches ? faShieldHalved : faTriangleExclamation} className="mt-0.5" />
      <span>
        {v.matches ? "ข้อมูลตรงกับต้นฉบับที่ออก" : "ข้อมูลไม่ตรงกับต้นฉบับ — แจ้งผู้ดูแลระบบ"}
        <span className="block break-all font-mono text-[10px] opacity-70">SHA-256 {v.stored_hash.slice(0, 32)}…</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// What changed between the original and this correction
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  issue_date: "วันที่",
  buyer: "ผู้ซื้อ",
  payee: "ผู้ถูกหักภาษี",
  payer: "ผู้หักภาษี",
  seller: "ผู้ขาย",
  name: "ชื่อ",
  tax_id: "เลขผู้เสียภาษี",
  branch: "สาขา",
  branch_code: "รหัสสาขา",
  address: "ที่อยู่",
  phone: "โทร",
  payment: "การชำระเงิน",
  method: "วิธีชำระ",
  bank: "ธนาคาร",
  ref: "เลขอ้างอิง",
  date: "วันที่",
  subtotal: "รวมเป็นเงิน",
  discount: "ส่วนลด",
  total: "ยอดรวม",
  vat: "VAT",
  note: "หมายเหตุ",
  items: "รายการ",
  lines: "รายการเงินได้",
  description: "รายการ",
  quantity: "จำนวน",
  unit_price: "ราคา/หน่วย",
  amount: "จำนวนเงิน",
  type: "ประเภท",
  pay_date: "วันที่จ่าย",
  tax: "ภาษี",
  form_type: "แบบ ภ.ง.ด.",
  sequence: "ลำดับที่",
  condition: "ผู้จ่ายเงิน",
  condition_other: "ผู้จ่ายเงิน (ระบุ)",
  total_paid: "รวมเงินที่จ่าย",
  total_tax: "รวมภาษี",
  signer: "ผู้ลงนาม",
  book: "เล่มที่",
  license: "ใบอนุญาต",
  employer_no: "เลขบัญชีนายจ้าง",
  card_no: "เลขบัตรประกันสังคม",
  pf: "กองทุนสำรองเลี้ยงชีพ",
  sso: "ประกันสังคม",
};

function flatten(v: Json | undefined, path: string[] = [], out = new Map<string, string>()) {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) flatten(x, [...path, k], out);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => flatten(x, [...path, `#${i + 1}`], out));
  } else {
    out.set(path.join("."), v == null || v === "" ? "—" : String(v));
  }
  return out;
}

const labelPath = (p: string) =>
  p
    .split(".")
    .map((k) => (k.startsWith("#") ? `ที่ ${k.slice(1)}` : (FIELD_LABELS[k] ?? k)))
    .join(" › ");

export async function ReplacementDiff({ kind, originalId, currentId }: { kind: DocKind; originalId: string; currentId: string }) {
  const supabase = await createClient();
  const fn = kind === "tax_invoice" ? "tax_invoice_content" : "wht_certificate_content";
  const [{ data: before }, { data: after }] = await Promise.all([
    supabase.rpc(fn, { p_id: originalId }),
    supabase.rpc(fn, { p_id: currentId }),
  ]);
  if (!before || !after) return null;

  const a = flatten(before);
  const b = flatten(after);
  const keys = [...new Set([...a.keys(), ...b.keys()])].filter((k) => k !== "number" && (a.get(k) ?? "—") !== (b.get(k) ?? "—"));

  return (
    <div className={formCardClassName}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500">เปลี่ยนแปลงจากฉบับเดิม</h3>
      {keys.length === 0 ? (
        <p className="mt-2 text-sm text-teal-700">ข้อมูลเหมือนฉบับเดิมทุกช่อง</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {keys.map((k) => (
            <li key={k}>
              <p className="text-xs text-teal-500">{labelPath(k)}</p>
              <p>
                <span className="text-rose-600 line-through">{a.get(k) ?? "—"}</span>
                <span className="mx-1.5 text-teal-400">→</span>
                <span className="font-medium text-emerald-700">{b.get(k) ?? "—"}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History timeline (audit log entries for this document)
// ---------------------------------------------------------------------------

const EVENT_LABELS: Record<string, string> = {
  insert: "ออกเอกสาร",
  update: "ปรับปรุงสถานะ",
  delete: "ลบ",
  "document.print": "พิมพ์",
};

const FIELD_EVENT: [string, string][] = [
  ["is_cancelled", "ยกเลิกเอกสาร"],
  ["replaced_by_id", "แก้ไขเป็นฉบับใหม่"],
  ["cancel_requested_at", "คำขอยกเลิก"],
  ["cancel_review_note", "พิจารณาคำขอยกเลิก"],
];

export async function DocumentHistory({ table, id }: { table: "tax_invoices" | "wht_certificates"; id: string }) {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, occurred_at, actor_email, action, changed_fields, new_data, details")
    .eq("table_name", table)
    .eq("record_id", id)
    .order("occurred_at", { ascending: true })
    .limit(200);

  return (
    <div className={formCardClassName}>
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-500">
        <FontAwesomeIcon icon={faClockRotateLeft} />
        ประวัติเอกสาร
      </h3>
      {!logs || logs.length === 0 ? (
        <p className="mt-2 text-sm text-teal-600">ยังไม่มีประวัติ</p>
      ) : (
        <ol className="mt-3 space-y-3 border-l border-teal-200 pl-4">
          {logs.map((l) => {
            const fields = l.changed_fields ?? [];
            let label = EVENT_LABELS[l.action] ?? l.action;
            if (l.action === "update") {
              const hit = FIELD_EVENT.find(([f]) => fields.includes(f));
              if (hit) label = hit[1];
              const nd = (l.new_data ?? {}) as Record<string, Json>;
              if (hit?.[0] === "cancel_requested_at" && nd.cancel_requested_at == null) label = "ไม่อนุมัติคำขอยกเลิก";
            }
            const copies = (l.details as Record<string, Json> | null)?.copies;
            return (
              <li key={l.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-teal-500" />
                <p className="font-medium text-teal-900">
                  {label}
                  {l.action === "document.print" && copies ? ` (${copies})` : ""}
                </p>
                <p className="text-xs text-teal-600">
                  {when(l.occurred_at)} · {l.actor_email ?? "ระบบ"}
                </p>
                {l.action === "update" && fields.length > 0 && (
                  <p className="text-[11px] text-teal-500">ช่องที่เปลี่ยน: {fields.join(", ")}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-teal-500">
        <FontAwesomeIcon icon={faCircleCheck} />
        บันทึกอัตโนมัติ แก้ไขหรือลบไม่ได้
      </p>
    </div>
  );
}
