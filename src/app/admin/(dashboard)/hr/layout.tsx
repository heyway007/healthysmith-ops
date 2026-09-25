import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";
import { HrNav } from "./hr-nav";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  const allowed = canAccess(roles, ["hr"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">👥 ระบบพนักงาน & เงินเดือน</h1>
      <p className="mt-1 text-teal-700">ข้อมูลพนักงาน ทีม วันลา และเงินเดือน</p>
      {allowed && (
        <div className="mt-5">
          <HrNav />
        </div>
      )}
      <div className="mt-6">{allowed ? children : <AccessDenied moduleName="ระบบพนักงาน & เงินเดือน" />}</div>
    </div>
  );
}
