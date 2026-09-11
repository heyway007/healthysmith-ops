import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faBars } from "@fortawesome/free-solid-svg-icons";
import { Sidebar } from "@/components/layout/sidebar";
import { AccessDenied } from "@/components/ui/access-denied";
import { adminLogout } from "@/app/admin/login/actions";
import { getCurrentRoles } from "@/lib/current-role";
import { ROLE_LABELS } from "@/lib/role";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();

  return (
    <div className="flex min-h-screen bg-linear-to-br from-teal-50 via-cyan-50 to-teal-100 text-teal-950">
      {/* Pure-CSS mobile drawer toggle: Sidebar's <aside> and the backdrop
          below both react to this via peer-checked, no JS state needed. */}
      <input type="checkbox" id="mobile-nav" className="peer hidden" />
      <label
        htmlFor="mobile-nav"
        className="fixed inset-0 z-40 hidden bg-black/40 peer-checked:block lg:hidden"
        aria-hidden="true"
      />

      <Sidebar roles={roles} />

      <div className="flex-1">
        <header className="flex items-center gap-4 border-b border-teal-100 bg-white/80 backdrop-blur px-4 sm:px-8 py-3 shadow-sm">
          <label
            htmlFor="mobile-nav"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-200 text-teal-700 lg:hidden"
            aria-label="เปิดเมนู"
          >
            <FontAwesomeIcon icon={faBars} />
          </label>

          <div className="ml-auto flex items-center gap-4">
            {roles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700"
                  >
                    {ROLE_LABELS[r]}
                  </span>
                ))}
              </div>
            )}
            <form action={adminLogout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-teal-700 transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                ออกจากระบบ
              </button>
            </form>
          </div>
        </header>
        <main className="p-6 sm:p-8">
          {roles.length > 0 ? children : <AccessDenied moduleName="ระบบหลังบ้าน" />}
        </main>
      </div>
    </div>
  );
}
