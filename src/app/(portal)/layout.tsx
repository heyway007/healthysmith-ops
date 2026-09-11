import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { logout } from "@/app/login/actions";
import { getCurrentEmployee } from "@/lib/current-employee";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const employee = await getCurrentEmployee();

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-indigo-50 via-white to-amber-50 text-indigo-950">
      <header className="border-b border-indigo-100 bg-white/80 backdrop-blur px-4 py-3 shadow-sm sm:px-8">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-semibold text-indigo-900">
            ระบบพนักงาน
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/leave"
              className="rounded-lg px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50"
            >
              ใบลาของฉัน
            </Link>
            <Link
              href="/holidays"
              className="rounded-lg px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50"
            >
              วันหยุดบริษัท
            </Link>
            <Link
              href="/profile"
              className="rounded-lg px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50"
            >
              โปรไฟล์ของฉัน
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {employee && (
              <span className="hidden text-sm text-indigo-700 sm:inline">
                {employee.prefix_name}
                {employee.first_name} {employee.last_name}
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm text-indigo-700 transition-colors hover:border-amber-300 hover:text-amber-700"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-8">
        {employee ? (
          <>
            {employee.first_name === "พนักงานใหม่" && (
              <Link
                href="/profile"
                className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition-colors hover:bg-amber-100"
              >
                <p className="text-sm font-medium text-amber-800">
                  ยังไม่ได้กรอกข้อมูลส่วนตัว — กดเพื่อกรอกชื่อ-นามสกุลจริงของคุณ
                </p>
                <span className="shrink-0 text-sm font-medium text-amber-700">ไปที่โปรไฟล์ →</span>
              </Link>
            )}
            {children}
          </>
        ) : (
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-indigo-950">บัญชีนี้ยังไม่ได้ผูกกับข้อมูลพนักงาน</p>
            <p className="mt-2 text-sm text-indigo-600">
              กรุณาติดต่อฝ่ายบุคคลให้ผูกบัญชีของคุณกับข้อมูลพนักงานในระบบก่อนใช้งาน
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
