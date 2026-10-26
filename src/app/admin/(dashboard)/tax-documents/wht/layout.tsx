import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function WhtLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  return canAccess(roles, ["purchase"]) ? <>{children}</> : <AccessDenied moduleName="หนังสือรับรองหัก ณ ที่จ่าย" />;
}
