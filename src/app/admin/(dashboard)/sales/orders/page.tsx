import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faFileImport } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { bangkokToday, formatMoney, monthRange, thaiMonth } from "@/lib/thai-money";
import { OrdersTable, type OrderRow } from "./orders-table";

const LIMIT = 1000;

type Params = { month?: string; channel?: string; tax?: string; status?: string; q?: string };

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : bangkokToday().slice(0, 7);
  const tax = ["none", "issued", "requested"].includes(params.tax ?? "") ? params.tax! : "";
  const status = ["all", "cancelled"].includes(params.status ?? "") ? params.status! : "active";
  // Strip characters that would break PostgREST's or() filter syntax.
  const q = (params.q ?? "").replace(/[,()*%\\]/g, " ").trim();
  const [from, to] = monthRange(month);

  const supabase = await createClient();
  const { data: channels } = await supabase.from("sales_channels").select("code, name").eq("is_active", true).order("name");
  const channel = channels?.some((c) => c.code === params.channel) ? params.channel! : "";

  let query = supabase
    .from("sales_order_list")
    .select("*", { count: "exact" })
    .gte("order_date", from)
    .lte("order_date", to)
    .order("order_date", { ascending: false })
    .order("order_number", { ascending: false })
    .limit(LIMIT);
  if (channel) query = query.eq("channel_code", channel);
  if (status === "active") query = query.neq("status", "cancelled");
  if (status === "cancelled") query = query.eq("status", "cancelled");
  if (tax === "none") query = query.is("tax_invoice_id", null);
  if (tax === "issued") query = query.not("tax_invoice_id", "is", null);
  if (tax === "requested") query = query.or("billing_name.not.is.null,billing_tax_id.not.is.null");
  if (q) {
    query = query.or(
      ["external_order_id", "order_number", "buyer_name", "buyer_username", "billing_name"]
        .map((c) => `${c}.ilike.*${q}*`)
        .join(","),
    );
  }
  const { data: orders, count } = await query;

  const rows: OrderRow[] = (orders ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    externalId: o.external_order_id,
    date: o.order_date,
    channelCode: o.channel_code,
    channelName: o.channel_name,
    buyer: o.billing_name ?? o.buyer_name ?? o.buyer_username,
    requested: Boolean(o.billing_name || o.billing_tax_id),
    items: o.item_summary,
    total: o.total_amount,
    status: o.status,
    taxInvoiceId: o.tax_invoice_id,
    taxInvoiceNumber: o.tax_invoice_number,
  }));
  const active = rows.filter((r) => r.status !== "cancelled");
  const salesTotal = active.reduce((s, r) => s + r.total, 0);
  const pendingTax = active.filter((r) => !r.taxInvoiceId).length;

  const link = (patch: Partial<Params>) => {
    const next = { month, channel, tax, status: status === "active" ? "" : status, q, ...patch };
    const sp = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/admin/sales/orders?${sp}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-teal-950">ออเดอร์</h2>
          <p className="mt-1 text-sm text-teal-700">
            ติ๊กเลือกออเดอร์ แล้วออกใบกำกับภาษีแยกทีละออเดอร์ หรือรวมหลายออเดอร์ของลูกค้าคนเดียวกันเป็นใบเดียว
          </p>
        </div>
        <Link
          href="/admin/sales/orders/import"
          className={`flex shrink-0 items-center gap-2 ${submitButtonClassName}`}
        >
          <FontAwesomeIcon icon={faFileImport} />
          นำเข้าออเดอร์
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href={link({ month: shiftMonth(month, -1) })}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนก่อน"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-3" />
          </Link>
          <span className="min-w-36 text-center font-medium text-teal-900">{thaiMonth(month)}</span>
          <Link
            href={link({ month: shiftMonth(month, 1) })}
            className="rounded-lg border border-teal-200 bg-white p-2 text-teal-700 hover:bg-teal-50"
            aria-label="เดือนถัดไป"
          >
            <FontAwesomeIcon icon={faChevronRight} className="w-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          <Stat label="ออเดอร์" value={active.length.toLocaleString()} />
          <Stat label="ยอดขาย (รวม VAT)" value={`฿${formatMoney(salesTotal)}`} />
          <Stat
            label="ยังไม่ออกใบกำกับ"
            value={pendingTax.toLocaleString()}
            className={pendingTax > 0 ? "text-orange-600" : undefined}
          />
        </div>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="month" value={month} />
        <Filter label="ช่องทาง">
          <select name="channel" defaultValue={channel} className={selectClassName}>
            <option value="">ทุกช่องทาง</option>
            {channels?.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Filter>
        <Filter label="ใบกำกับภาษี">
          <select name="tax" defaultValue={tax} className={selectClassName}>
            <option value="">ทั้งหมด</option>
            <option value="none">ยังไม่ออก</option>
            <option value="issued">ออกแล้ว</option>
            <option value="requested">ลูกค้าขอใบกำกับ</option>
          </select>
        </Filter>
        <Filter label="สถานะ">
          <select name="status" defaultValue={status === "active" ? "" : status} className={selectClassName}>
            <option value="">ไม่รวมที่ยกเลิก</option>
            <option value="all">ทั้งหมด</option>
            <option value="cancelled">ยกเลิก / คืน</option>
          </select>
        </Filter>
        <Filter label="ค้นหา">
          <input
            name="q"
            defaultValue={q}
            placeholder="เลขออเดอร์ / ชื่อผู้ซื้อ"
            className="mt-1 w-56 rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </Filter>
        <button type="submit" className="rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
          กรอง
        </button>
      </form>

      <div className="mt-4">
        <OrdersTable rows={rows} />
      </div>
      {(count ?? 0) > LIMIT && (
        <p className="mt-2 text-sm text-orange-600">
          แสดง {LIMIT.toLocaleString()} จาก {count?.toLocaleString()} ออเดอร์ — ใช้ตัวกรองช่องทาง/ค้นหาเพื่อดูที่เหลือ
        </p>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-teal-700">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-teal-100 bg-white px-4 py-2 text-right shadow-sm">
      <p className="text-xs text-teal-500">{label}</p>
      <p className={`font-semibold text-teal-950 ${className ?? ""}`}>{value}</p>
    </div>
  );
}
