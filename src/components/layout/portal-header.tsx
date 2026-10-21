import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket } from "@fortawesome/free-solid-svg-icons";
import type { CurrentEmployee } from "@/lib/current-employee";
import { APP_VERSION } from "@/lib/version";
import { VersionBadge } from "@/components/ui/version-badge";
import { PortalNav } from "./portal-nav";
import { UserMenu } from "./user-menu";

const buttonClassName =
  "flex items-center gap-2 whitespace-nowrap rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-sm text-mist-700 transition-colors hover:border-mist-400 hover:text-mist-900";

/**
 * Header shared by the employee portal and the public holiday calendar.
 * Signed in: full menu + account dropdown (profile, sign out). Visitors: public menu + sign in.
 */
export function PortalHeader({ signedIn, employee }: { signedIn: boolean; employee: CurrentEmployee | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-mist-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur sm:px-8">
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex shrink-0 flex-col leading-tight sm:flex-row sm:items-center sm:gap-2">
          <Link href={signedIn ? "/" : "/holidays"} className="font-semibold text-mist-900">
            ระบบพนักงาน
          </Link>
          <VersionBadge version={APP_VERSION} />
        </div>
        <PortalNav signedIn={signedIn} />
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {signedIn ? (
            <UserMenu employee={employee} />
          ) : (
            <Link href="/login" className={buttonClassName} aria-label="เข้าสู่ระบบ" title="เข้าสู่ระบบ">
              <FontAwesomeIcon icon={faRightToBracket} />
              <span className="hidden sm:inline">เข้าสู่ระบบ</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
