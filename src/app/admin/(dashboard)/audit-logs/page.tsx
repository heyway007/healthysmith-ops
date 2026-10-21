import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faClockRotateLeft, faXmark } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { selectClassName } from "@/lib/ui-classes";
import { bangkokToday } from "@/lib/thai-money";
import { MaskedValue } from "@/components/ui/masked-value";
import type { Database, Json } from "@/types/database.types";
import {
  ACTION_LABELS,
  NOISE_FIELDS,
  TABLE_GROUPS,
  TABLE_LABELS,
  isSensitiveField,
  recordHref,
} from "./labels";

const PAGE_SIZE = 50;

type Params = {
  from?: string;
  to?: string;
  table?: string;
  action?: string;
  actor?: string;
  q?: string;
  record?: string;
  page?: string;
};

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

const inputClassName =
  "mt-1 rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100";

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const isDate = (s: string | undefined): s is string => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

const timeFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const today = bangkokToday();
  const to = isDate(params.to) ? params.to : today;
  const from = isDate(params.from) ? params.from : shiftDate(to, -6);
  const table = params.table && (TABLE_LABELS[params.table] || params.table === "_auth") ? params.table : "";
  const action = params.action && ACTION_LABELS[params.action] ? params.action : "";
  // Strip characters that would break PostgREST's or()/ilike filter syntax.
  const clean = (s: string | undefined) => (s ?? "").replace(/[,()*%\\]/g, " ").trim();
  const actor = clean(params.actor);
  const q = clean(params.q);
  const record = clean(params.record);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  // A single record's history is shown in full, regardless of the date range.
  if (record) {
    query = query.eq("record_id", record);
  } else {
    query = query
      .gte("occurred_at", `${from}T00:00:00+07:00`)
      .lt("occurred_at", `${shiftDate(to, 1)}T00:00:00+07:00`);
  }
  if (table === "_auth") query = query.like("action", "auth.%");
  else if (table) query = query.eq("table_name", table);
  if (action) query = query.eq("action", action);
  if (actor) query = query.ilike("actor_email", `%${actor}%`);
  if (q) query = query.or(`record_label.ilike.*${q}*,record_id.eq.${q}`);
  const { data: logs, count, error } = await query;

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const link = (patch: Partial<Params>) => {
    const next: Params = { from, to, table, action, actor, q, record, page: undefined, ...patch };
    const sp = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/admin/audit-logs?${sp}`;
  };

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-teal-950">
        <FontAwesomeIcon icon={faClockRotateLeft} className="text-xl text-teal-600" />
        ประวัติการใช้งาน (Audit log)
      </h1>
      <p className="mt-1 text-teal-700">
        ใครเพิ่ม / แก้ไข / ลบข้อมูลอะไร เมื่อไหร่ รวมถึงการเข้า-ออกระบบ — บันทึกอัตโนมัติ แก้ไขหรือลบไม่ได้
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        {record && <input type="hidden" name="record" value={record} />}
        <Filter label="ตั้งแต่วันที่">
          <input type="date" name="from" defaultValue={from} className={inputClassName} />
        </Filter>
        <Filter label="ถึงวันที่">
          <input type="date" name="to" defaultValue={to} className={inputClassName} />
        </Filter>
        <Filter label="ข้อมูล">
          <select name="table" defaultValue={table} className={selectClassName}>
            <option value="">ทั้งหมด</option>
            <option value="_auth">การเข้า-ออกระบบ</option>
            {TABLE_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {Object.entries(g.tables).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Filter>
        <Filter label="การกระทำ">
          <select name="action" defaultValue={action} className={selectClassName}>
            <option value="">ทั้งหมด</option>
            {Object.entries(ACTION_LABELS).map(([key, a]) => (
              <option key={key} value={key}>
                {a.label}
              </option>
            ))}
          </select>
        </Filter>
        <Filter label="ผู้ใช้">
          <input name="actor" defaultValue={actor} placeholder="อีเมล" className={`${inputClassName} w-44`} />
        </Filter>
        <Filter label="ค้นหา">
          <input
            name="q"
            defaultValue={q}
            placeholder="เลขเอกสาร / ชื่อ"
            className={`${inputClassName} w-44`}
          />
        </Filter>
        <button
          type="submit"
          className="rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          กรอง
        </button>
      </form>

      {record && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm text-teal-800">
          แสดงประวัติทั้งหมดของรายการเดียว (ไม่จำกัดช่วงวันที่)
          <Link
            href={link({ record: undefined })}
            className="inline-flex items-center gap-1 font-medium text-orange-600 hover:underline"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
            ล้าง
          </Link>
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error.message}</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3 whitespace-nowrap">เวลา</th>
              <th className="px-4 py-3">ผู้ใช้</th>
              <th className="px-4 py-3">การกระทำ</th>
              <th className="px-4 py-3">ข้อมูล</th>
              <th className="px-4 py-3">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <LogRow key={log.id} log={log} historyHref={log.record_id ? link({ record: log.record_id }) : null} />
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-teal-400">
                  ไม่มีรายการในช่วงนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-teal-700">
        <span>
          ทั้งหมด {total.toLocaleString()} รายการ
          {total > 0 && ` · หน้า ${page.toLocaleString()} / ${lastPage.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <PageLink href={page > 1 ? link({ page: String(page - 1) }) : null} label="หน้าก่อน" icon={faChevronLeft} />
          <PageLink
            href={page < lastPage ? link({ page: String(page + 1) }) : null}
            label="หน้าถัดไป"
            icon={faChevronRight}
          />
        </div>
      </div>
    </div>
  );
}

function LogRow({ log, historyHref }: { log: AuditLog; historyHref: string | null }) {
  const action = ACTION_LABELS[log.action] ?? { label: log.action, className: "bg-gray-200 text-gray-600" };
  const details = asObject(log.details);
  const href = recordHref(log.table_name, log.record_id, log.action);
  const tableLabel = log.table_name ? (TABLE_LABELS[log.table_name] ?? log.table_name) : null;
  const changes = fieldChanges(log);

  return (
    <tr className="border-t border-teal-100 align-top hover:bg-teal-50/50">
      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-teal-700">
        {timeFormat.format(new Date(log.occurred_at))}
      </td>
      <td className="px-4 py-3">
        {log.actor_email ? (
          <span className="text-teal-950">{log.actor_email}</span>
        ) : log.action === "auth.login_failed" ? (
          <span className="text-teal-500">{String(details.email ?? "-")}</span>
        ) : (
          <span className="text-teal-400">ระบบ</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${action.className}`}>
          {action.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {tableLabel && <p className="text-xs text-teal-500">{tableLabel}</p>}
        {href ? (
          <Link href={href} className="font-medium text-teal-950 hover:text-orange-600">
            {log.record_label ?? "เปิดดู"}
          </Link>
        ) : (
          log.record_label && <span className="font-medium text-teal-950">{log.record_label}</span>
        )}
        {historyHref && (
          <Link href={historyHref} className="mt-0.5 block text-xs text-teal-500 hover:text-orange-600">
            ประวัติรายการนี้
          </Link>
        )}
      </td>
      <td className="px-4 py-3">
        {log.table_name && log.table_name !== "auth_users" ? (
          changes.length > 0 && (
            <details>
              <summary className="cursor-pointer text-teal-700 hover:text-orange-600">
                {summaryText(log, changes)}
              </summary>
              <ChangeTable log={log} changes={changes} />
            </details>
          )
        ) : (
          <EventDetails details={details} />
        )}
      </td>
    </tr>
  );
}

type Change = { key: string; before: Json | undefined; after: Json | undefined };

function fieldChanges(log: AuditLog): Change[] {
  const before = asObject(log.old_data);
  const after = asObject(log.new_data);
  if (log.action === "update") {
    return (log.changed_fields ?? Object.keys(after)).map((key) => ({ key, before: before[key], after: after[key] }));
  }
  const row = log.action === "delete" ? before : after;
  return Object.entries(row)
    .filter(([key, v]) => v !== null && v !== "" && !NOISE_FIELDS.has(key))
    .map(([key, v]) =>
      log.action === "delete" ? { key, before: v, after: undefined } : { key, before: undefined, after: v }
    );
}

function summaryText(log: AuditLog, changes: Change[]) {
  if (log.action !== "update") return `ดูข้อมูล ${changes.length} ช่อง`;
  const keys = changes.map((c) => c.key);
  return keys.length <= 3 ? keys.join(", ") : `${keys.slice(0, 3).join(", ")} +${keys.length - 3}`;
}

function ChangeTable({ log, changes }: { log: AuditLog; changes: Change[] }) {
  const showBefore = log.action !== "insert";
  const showAfter = log.action !== "delete";
  return (
    <table className="mt-2 w-full min-w-80 text-xs">
      <thead>
        <tr className="text-left text-teal-500">
          <th className="py-1 pr-3 font-medium">ช่อง</th>
          {showBefore && <th className="py-1 pr-3 font-medium">{showAfter ? "ก่อน" : "ค่า"}</th>}
          {showAfter && <th className="py-1 font-medium">{showBefore ? "หลัง" : "ค่า"}</th>}
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => {
          const sensitive = isSensitiveField(log.table_name, c.key);
          return (
            <tr key={c.key} className="border-t border-teal-50">
              <td className="py-1 pr-3 font-mono text-teal-600">{c.key}</td>
              {showBefore && (
                <td className={`py-1 pr-3 break-all ${showAfter ? "text-rose-700" : "text-teal-900"}`}>
                  <Value value={c.before} sensitive={sensitive} />
                </td>
              )}
              {showAfter && (
                <td className={`py-1 break-all ${showBefore ? "text-emerald-700" : "text-teal-900"}`}>
                  <Value value={c.after} sensitive={sensitive} />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EventDetails({ details }: { details: Record<string, Json | undefined> }) {
  const parts: string[] = [];
  if (details.area) parts.push(details.area === "admin" ? "หลังบ้าน" : "หน้าบ้าน");
  if (details.email_from !== undefined) parts.push(`อีเมล ${details.email_from ?? "-"} → ${details.email_to ?? "-"}`);
  if (details.password_changed) parts.push("เปลี่ยนรหัสผ่าน");
  if (details.reason) parts.push(`สาเหตุ: ${details.reason}`);
  return (
    <div className="text-xs text-teal-700">
      {parts.length > 0 && <p>{parts.join(" · ")}</p>}
      {typeof details.ip === "string" && <p className="mt-0.5 text-teal-400">IP {details.ip}</p>}
    </div>
  );
}

function Value({ value, sensitive }: { value: Json | undefined; sensitive: boolean }) {
  if (value === undefined || value === null || value === "") return <span className="text-teal-300">—</span>;
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (sensitive) return <MaskedValue value={text} />;
  return <span>{text.length > 300 ? `${text.slice(0, 300)}…` : text}</span>;
}

function asObject(value: Json | null): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-teal-700">{label}</label>
      {children}
    </div>
  );
}

function PageLink({ href, label, icon }: { href: string | null; label: string; icon: typeof faChevronLeft }) {
  const className = "rounded-lg border border-teal-200 bg-white p-2 text-teal-700";
  if (!href) {
    return (
      <span className={`${className} opacity-40`} aria-label={label}>
        <FontAwesomeIcon icon={icon} className="w-3" />
      </span>
    );
  }
  return (
    <Link href={href} className={`${className} hover:bg-teal-50`} aria-label={label}>
      <FontAwesomeIcon icon={icon} className="w-3" />
    </Link>
  );
}
