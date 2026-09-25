import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faRightToBracket } from "@fortawesome/free-solid-svg-icons";
import { logout } from "@/app/login/actions";
import type { CurrentEmployee } from "@/lib/current-employee";
import { PortalNav } from "./portal-nav";

const buttonClassName =
  "flex items-center gap-2 whitespace-nowrap rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-indigo-700 transition-colors hover:border-amber-300 hover:text-amber-700";

/**
 * Header shared by the employee portal and the public holiday calendar.
 * Signed in: full menu + name + sign out. Visitors: public menu + sign in.
 */
export function PortalHeader({ signedIn, employee }: { signedIn: boolean; employee: CurrentEmployee | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-indigo-100 bg-white/85 px-4 py-3 shadow-sm backdrop-blur sm:px-8">
      <div className="flex items-center gap-5">
        <Link href={signedIn ? "/" : "/holidays"} className="shrink-0 font-semibold text-indigo-900">
          ระบบพนักงาน
        </Link>
        <PortalNav signedIn={signedIn} />
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {employee && (
            <span className="hidden text-sm text-indigo-700 md:inline">
              {employee.prefix_name}
              {employee.first_name} {employee.last_name}
            </span>
          )}
          {signedIn ? (
            <form action={logout}>
              <button type="submit" className={buttonClassName}>
                <FontAwesomeIcon icon={faRightFromBracket} />
                ออกจากระบบ
              </button>
            </form>
          ) : (
            <Link href="/login" className={buttonClassName}>
              <FontAwesomeIcon icon={faRightToBracket} />
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
