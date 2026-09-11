import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!canAccess(roles, ["sales"])) return <AccessDenied moduleName="ระบบขาย" />;
  return <>{children}</>;
}
