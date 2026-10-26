import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";
import { SectionTabs } from "@/components/layout/section-tabs";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  const allowed = canAccess(roles, ["sales"]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">🛒 ระบบขาย</h1>
      <p className="mt-1 text-teal-700">
        ดึงออเดอร์จาก Shopee / Lazada / TikTok / ช่องทางอื่น — ออกใบกำกับภาษีได้ที่เมนู เอกสารภาษี
      </p>
      {allowed && (
        <div className="mt-5">
          <SectionTabs group="sales" roles={roles} />
        </div>
      )}
      <div className="mt-6">{allowed ? children : <AccessDenied moduleName="ระบบขาย" />}</div>
    </div>
  );
}
