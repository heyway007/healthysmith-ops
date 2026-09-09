import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { Sidebar } from "@/components/layout/sidebar";
import { logout } from "@/app/login/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <header className="flex items-center justify-end border-b border-teal-100 bg-white/80 backdrop-blur px-8 py-3 shadow-sm">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-teal-700 hover:text-orange-600 transition-colors"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              ออกจากระบบ
            </button>
          </form>
        </header>
        <main className="p-6 sm:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
