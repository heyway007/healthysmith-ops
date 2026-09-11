import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";
import { PurchaseNav } from "./purchase-nav";

export default async function PurchaseLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  const allowed = canAccess(roles, ["purchase"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">🚚 ระบบจัดซื้อ</h1>
      <p className="mt-1 text-teal-700">
        ขอซื้อ → ใบสั่งซื้อ → รับสินค้า → บันทึกบิลซื้อ → จ่ายชำระ
      </p>
      {allowed && (
        <div className="mt-5">
          <PurchaseNav />
        </div>
      )}
      <div className="mt-6">
        {allowed ? children : <AccessDenied moduleName="ระบบจัดซื้อ" />}
      </div>
    </div>
  );
}
