import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function PrintInventoryLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!canAccess(roles, ["warehouse"])) {
    return (
      <main className="p-8">
        <AccessDenied moduleName="พิมพ์เอกสารคลังสินค้า" />
      </main>
    );
  }
  return <>{children}</>;
}
