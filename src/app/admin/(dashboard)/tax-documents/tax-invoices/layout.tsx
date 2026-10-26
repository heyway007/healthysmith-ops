import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function TaxInvoicesLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  return canAccess(roles, ["sales"]) ? <>{children}</> : <AccessDenied moduleName="ใบกำกับภาษี" />;
}
