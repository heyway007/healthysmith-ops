import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";
import { SectionTabs } from "@/components/layout/section-tabs";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  const allowed = canAccess(roles, ["warehouse"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">🏭 คลังสินค้า & ผลิต</h1>
      <p className="mt-1 text-teal-700">สั่งผลิต รับสินค้าเข้าคลังทีละล็อต และดูยอดสินค้าเข้า-ออก-คงเหลือ</p>
      {allowed && (
        <div className="mt-5">
          <SectionTabs group="inventory" roles={roles} />
        </div>
      )}
      <div className="mt-6">{allowed ? children : <AccessDenied moduleName="คลังสินค้า & ผลิต" />}</div>
    </div>
  );
}
