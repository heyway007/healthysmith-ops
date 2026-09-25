import Link from "next/link";
import { PortalHeader } from "@/components/layout/portal-header";
import { getCurrentEmployee } from "@/lib/current-employee";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const employee = await getCurrentEmployee();

  return (
    <div className="flex min-h-screen flex-col bg-mist-100 text-mist-900">
      {/* Every portal page requires sign-in (see src/lib/supabase/middleware.ts). */}
      <PortalHeader signedIn employee={employee} />

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
          <div className="rounded-2xl border border-mist-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-mist-900">บัญชีนี้ยังไม่ได้ผูกกับข้อมูลพนักงาน</p>
            <p className="mt-2 text-sm text-mist-600">
              กรุณาติดต่อฝ่ายบุคคลให้ผูกบัญชีของคุณกับข้อมูลพนักงานในระบบก่อนใช้งาน
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
