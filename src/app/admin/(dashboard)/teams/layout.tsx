import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function TeamsLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  return canAccess(roles, ["hr"]) ? children : <AccessDenied moduleName="ทีม" />;
}
