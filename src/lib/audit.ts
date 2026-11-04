import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

// Row changes (insert/update/delete on business tables) are logged by the
// database trigger in 0015_audit_log.sql. This is only for events that never
// touch a public table -- signing in/out and changes to Supabase Auth
// accounts -- so they show up in the same log. Server-only.

export type AuditEvent =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "account.create"
  | "account.update"
  | "document.print"
  | "data.export"
  | "data.backup";

type Actor = { id: string; email: string | null };

/** Never throws: a failed audit write must not break the action itself. */
export async function logAuditEvent(
  action: AuditEvent,
  opts: {
    /** Defaults to the signed-in user of this request. Pass null when there is none (failed login). */
    actor?: Actor | null;
    /** The auth account the event is about (account.* events). */
    accountId?: string;
    accountEmail?: string | null;
    details?: Record<string, Json | undefined>;
  } = {}
) {
  try {
    const actor = opts.actor !== undefined ? opts.actor : await currentActor();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");

    const { error } = await createAdminClient()
      .from("audit_logs")
      .insert({
        action,
        actor_user_id: actor?.id ?? null,
        actor_email: actor?.email ?? null,
        table_name: opts.accountId ? "auth_users" : null,
        record_id: opts.accountId ?? null,
        record_label: opts.accountEmail ?? null,
        details: { ...opts.details, ip, user_agent: h.get("user-agent") },
      });
    if (error) throw error;
  } catch (err) {
    console.error("audit log write failed", action, err);
  }
}

/**
 * One entry per document for things done *to* issued documents that don't
 * change them (printing). Filed under the document's table/id so it shows in
 * that document's history. Never throws.
 */
export async function logDocumentEvents(
  action: "document.print",
  table: "tax_invoices" | "wht_certificates" | "production_orders" | "production_receipts" | "stock_movements",
  docs: { id: string; label: string }[],
  details: Record<string, Json | undefined> = {}
) {
  if (docs.length === 0) return;
  try {
    const actor = await currentActor();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
    const rows = docs.map((d) => ({
      action,
      actor_user_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      table_name: table,
      record_id: d.id,
      record_label: d.label,
      details: { ...details, ip, user_agent: h.get("user-agent") },
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await createAdminClient().from("audit_logs").insert(rows.slice(i, i + 500));
      if (error) throw error;
    }
  } catch (err) {
    console.error("audit log write failed", action, err);
  }
}

async function currentActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}
