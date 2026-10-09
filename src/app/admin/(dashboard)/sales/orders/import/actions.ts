"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { IMPORT_FORMATS, type ImportFormat } from "@/lib/order-import/formats";
import { orderTotal, parseOrderRows, type ParsedOrder } from "@/lib/order-import/parse";
import { readSheet } from "@/lib/order-import/read-sheet";

export type ImportPreview = {
  fileName: string;
  channelName: string;
  orderCount: number;
  itemCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  totalAmount: number;
  cancelledCount: number;
  billingCount: number;
  /** orders already in the system (will be updated, not duplicated) */
  existingCount: number;
  sample: { id: string; date: string | null; buyer: string | null; items: string; total: number; status: string }[];
  warnings: string[];
};

export type ImportResult = { inserted: number; updated: number; locked: number; month: string | null; channel: string };

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function parseUpload(supabase: Supabase, formData: FormData) {
  const roles = await getCurrentRoles();
  if (!canAccess(roles, ["sales"])) throw new Error("ไม่มีสิทธิ์ใช้งานระบบขาย");

  const format = String(formData.get("format") ?? "") as ImportFormat;
  const spec = IMPORT_FORMATS[format];
  if (!spec) throw new Error("กรุณาเลือกช่องทาง");

  const channelCode = spec.channelCode ?? String(formData.get("channel") ?? "");
  const { data: channel } = await supabase
    .from("sales_channels")
    .select("id, code, name")
    .eq("code", channelCode)
    .maybeSingle();
  if (!channel) throw new Error("กรุณาเลือกช่องทางการขาย");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("กรุณาเลือกไฟล์");

  const rows = await readSheet(file);
  const { orders, warnings } = parseOrderRows(rows, format);
  return { channel, file, orders, warnings };
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "เกิดข้อผิดพลาด");

export async function previewOrderImport(formData: FormData): Promise<ActionResult<ImportPreview>> {
  try {
    const supabase = await createClient();
    const { channel, file, orders, warnings } = await parseUpload(supabase, formData);

    // How many of these are already in the system (re-import = update).
    let existingCount = 0;
    const ids = orders.map((o) => o.external_order_id);
    for (let i = 0; i < ids.length; i += 200) {
      const { count } = await supabase
        .from("sales_orders")
        .select("id", { count: "exact", head: true })
        .eq("sales_channel_id", channel.id)
        .in("external_order_id", ids.slice(i, i + 200));
      existingCount += count ?? 0;
    }

    const dates = orders.map((o) => o.order_date).filter((d): d is string => Boolean(d)).sort();
    const active = orders.filter((o) => o.status !== "cancelled");
    return {
      ok: true,
      data: {
        fileName: file.name,
        channelName: channel.name,
        orderCount: orders.length,
        itemCount: orders.reduce((s, o) => s + o.items.length, 0),
        dateFrom: dates[0] ?? null,
        dateTo: dates[dates.length - 1] ?? null,
        totalAmount: active.reduce((s, o) => s + orderTotal(o), 0),
        cancelledCount: orders.length - active.length,
        billingCount: orders.filter((o) => o.billing_name || o.billing_tax_id).length,
        existingCount,
        sample: orders.slice(0, 8).map((o: ParsedOrder) => ({
          id: o.external_order_id,
          date: o.order_date,
          buyer: o.buyer_name,
          items: o.items.map((i) => `${i.description} ×${i.quantity}`).join(", "),
          total: orderTotal(o),
          status: o.status,
        })),
        warnings: warnings.slice(0, 30),
      },
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function commitOrderImport(formData: FormData): Promise<ActionResult<ImportResult>> {
  try {
    const supabase = await createClient();
    const { channel, file, orders } = await parseUpload(supabase, formData);
    if (orders.length === 0) throw new Error("ไม่พบออเดอร์ที่นำเข้าได้");

    const { data, error } = await supabase.rpc("import_sales_orders", {
      p_channel_id: channel.id,
      p_file_name: file.name,
      p_orders: orders,
    });
    if (error) throw new Error(error.message);

    const result = data as { inserted: number; updated: number; locked: number };
    const months = orders.map((o) => o.order_date?.slice(0, 7)).filter(Boolean).sort();
    revalidatePath("/admin/sales/orders");
    return {
      ok: true,
      data: { ...result, month: months[months.length - 1] ?? null, channel: channel.code },
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
