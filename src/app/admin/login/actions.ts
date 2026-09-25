"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function adminLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin");
}

export async function adminLogout() {
  const supabase = await createClient();
  // "local": only this browser. The default ("global") would also sign the user
  // out of every other browser/device, which kicked people to the login page.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}
