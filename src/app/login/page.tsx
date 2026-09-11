import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-100 via-indigo-50 to-amber-50 px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-xl shadow-indigo-900/10">
        <div className="h-1.5 bg-linear-to-r from-indigo-500 via-indigo-400 to-amber-400" />
        <div className="p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-900/20">
            <FontAwesomeIcon icon={faUser} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-indigo-950">เข้าสู่ระบบพนักงาน</h1>
          <p className="mt-1 text-sm text-indigo-700">ยื่นใบลา ดูวันหยุด และสิทธิ์การลาของคุณ</p>

          <form action={login} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-800" htmlFor="email">
                อีเมล
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-indigo-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-800" htmlFor="password">
                รหัสผ่าน
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-lg border border-indigo-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-amber-700">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg border border-amber-600/40 bg-linear-to-r from-amber-500 to-amber-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/30 transition-colors hover:from-amber-600 hover:to-amber-700"
            >
              เข้าสู่ระบบพนักงาน
            </button>
          </form>

          <p className="mt-4 text-xs text-indigo-500">
            ยังไม่มีบัญชี? ติดต่อฝ่ายบุคคลให้สร้างบัญชีผูกกับข้อมูลพนักงานของคุณ
          </p>
        </div>
      </div>
    </div>
  );
}
