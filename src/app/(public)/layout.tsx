import { PortalHeader } from "@/components/layout/portal-header";
import { getCurrentEmployee } from "@/lib/current-employee";
import { createClient } from "@/lib/supabase/server";

// Public pages (no sign-in needed) share the employee portal's header: signed-in
// employees get the full menu, visitors only the public pages + "sign in".
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    employee,
  ] = await Promise.all([supabase.auth.getUser(), getCurrentEmployee()]);

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-indigo-50 via-white to-amber-50 text-indigo-950">
      <PortalHeader signedIn={!!user} employee={employee} />
      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
