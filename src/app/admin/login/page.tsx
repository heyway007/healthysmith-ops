import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SubmitButton } from "@/components/ui/submit-button";
import { faUserShield } from "@fortawesome/free-solid-svg-icons";
import { adminLogin } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-teal-100 via-teal-50 to-orange-50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-xl shadow-teal-900/10">
        <div className="h-1.5 bg-linear-to-r from-teal-500 via-cyan-500 to-orange-400" />
        <div className="p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-teal-600 to-teal-800 text-white shadow-md shadow-teal-900/20">
            <FontAwesomeIcon icon={faUserShield} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-teal-950">เข้าสู่ระบบหลังบ้าน</h1>
          <p className="mt-1 text-sm text-teal-700">สำหรับเจ้าหน้าที่ — ขาย · จัดซื้อ · บุคคล · ผู้ดูแลระบบ</p>

          <form action={adminLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-teal-800" htmlFor="email">
                อีเมล
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                placeholder="staff@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-teal-800" htmlFor="password">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-lg border border-teal-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-orange-600">{error}</p>}

            {/* Spinner + disabled while signing in, so a slow login is visible and can't be double-sent. */}
            <SubmitButton className="w-full rounded-lg border border-orange-600/40 bg-linear-to-r from-orange-500 to-orange-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 transition-colors hover:from-orange-600 hover:to-orange-700" pendingLabel="กำลังเข้าสู่ระบบ...">
              เข้าสู่ระบบหลังบ้าน
            </SubmitButton>
          </form>

          <p className="mt-4 text-xs text-teal-500">
            เป็นพนักงานทั่วไปใช่ไหม? เข้าสู่ระบบพนักงานได้ที่{" "}
            <a href="/login" className="font-medium underline hover:text-teal-700">
              หน้านี้
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
