"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginErrorMessage } from "@/lib/auth-errors";
import { logAuditEvent } from "@/lib/audit";

export async function adminLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await logAuditEvent("auth.login_failed", {
      actor: null,
      details: { area: "admin", email, reason: error.code ?? error.message },
    });
    redirect(`/admin/login?error=${encodeURIComponent(loginErrorMessage(error))}`);
  }
  await logAuditEvent("auth.login", {
    actor: { id: data.user.id, email: data.user.email ?? null },
    details: { area: "admin" },
  });

  redirect("/admin");
}

export async function adminLogout() {
  await logAuditEvent("auth.logout", { details: { area: "admin" } });
  const supabase = await createClient();
  // "local": only this browser. The default ("global") would also sign the user
  // out of every other browser/device, which kicked people to the login page.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}
