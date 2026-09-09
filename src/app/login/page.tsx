import { login } from "./actions";

export default async function LoginPage({
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
          <h1 className="text-lg font-semibold text-teal-950">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-teal-700">ระบบบัญชีและหลังบ้าน</p>

          <form action={login} className="mt-6 space-y-4">
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
                placeholder="you@company.com"
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

            <button
              type="submit"
              className="w-full rounded-lg bg-linear-to-r from-orange-500 to-orange-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-orange-500/30 transition-colors hover:from-orange-600 hover:to-orange-700"
            >
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="mt-4 text-xs text-teal-500">
            ผู้ใช้งานถูกสร้างผ่าน Supabase Auth (ตาราง employees.user_id ผูกไว้ให้แล้ว) —
            เพิ่มผู้ใช้ได้ที่ Supabase Dashboard → Authentication → Users
          </p>
        </div>
      </div>
    </div>
  );
}
