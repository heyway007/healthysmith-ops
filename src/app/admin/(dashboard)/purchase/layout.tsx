import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";
import { SectionTabs } from "@/components/layout/section-tabs";

export default async function PurchaseLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  const allowed = canAccess(roles, ["purchase"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">🛍️ ภาษีซื้อ</h1>
      <p className="mt-1 text-teal-700">
        จดว่าซื้ออะไร จากร้านไหน เท่าไหร่ จ่ายแล้วหรือยัง
      </p>
      {allowed && (
        <div className="mt-5">
          <SectionTabs group="purchase" roles={roles} />
        </div>
      )}
      <div className="mt-6">
        {allowed ? children : <AccessDenied moduleName="ภาษีซื้อ" />}
      </div>
    </div>
  );
}
