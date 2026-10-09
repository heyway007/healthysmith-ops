import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function PrintTaxInvoicesLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!canAccess(roles, ["sales"])) {
    return (
      <main className="p-8">
        <AccessDenied moduleName="พิมพ์ใบกำกับภาษี" />
      </main>
    );
  }
  return <>{children}</>;
}
