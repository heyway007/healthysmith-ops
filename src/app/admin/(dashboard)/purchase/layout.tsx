import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";
import { PurchaseNav } from "./purchase-nav";

export default async function PurchaseLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  const allowed = canAccess(roles, ["purchase"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">🛍️ ซื้อของ / ค่าใช้จ่าย</h1>
      <p className="mt-1 text-teal-700">
        จดว่าซื้ออะไร จากร้านไหน เท่าไหร่ จ่ายแล้วหรือยัง
      </p>
      {allowed && (
        <div className="mt-5">
          <PurchaseNav />
        </div>
      )}
      <div className="mt-6">
        {allowed ? children : <AccessDenied moduleName="ซื้อของ / ค่าใช้จ่าย" />}
      </div>
    </div>
  );
}
