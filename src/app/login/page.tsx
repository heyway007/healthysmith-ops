import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SubmitButton } from "@/components/ui/submit-button";
import { faCalendarDays, faUser } from "@fortawesome/free-solid-svg-icons";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist-100 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-sm">
        <div className="h-1 bg-mist-800" />
        <div className="p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist-800 text-white">
            <FontAwesomeIcon icon={faUser} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-mist-900">เข้าสู่ระบบพนักงาน</h1>
          <p className="mt-1 text-sm text-mist-700">ยื่นใบลา ดูวันหยุด และสิทธิ์การลาของคุณ</p>

          <form action={login} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-mist-800" htmlFor="email">
                อีเมล
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-mist-300 px-3 py-2 text-sm focus:border-mist-600 focus:outline-none"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-mist-800" htmlFor="password">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-lg border border-mist-300 px-3 py-2 text-sm focus:border-mist-600 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-amber-700">{error}</p>}

            {/* Spinner + disabled while signing in, so a slow login is visible and can't be double-sent. */}
            <SubmitButton className="w-full rounded-lg border border-mist-800 bg-mist-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-mist-700" pendingLabel="กำลังเข้าสู่ระบบ...">
              เข้าสู่ระบบพนักงาน
            </SubmitButton>
          </form>

          <p className="mt-4 text-xs text-mist-500">
            ยังไม่มีบัญชี? ติดต่อฝ่ายบุคคลให้สร้างบัญชีผูกกับข้อมูลพนักงานของคุณ
          </p>
          <Link
            href="/holidays"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-mist-200 px-3 py-2 text-sm font-medium text-mist-700 transition-colors hover:bg-mist-100"
          >
            <FontAwesomeIcon icon={faCalendarDays} />
            ดูปฏิทินวันหยุด (ไม่ต้องเข้าสู่ระบบ)
          </Link>
        </div>
      </div>
    </div>
  );
}
