import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function PrintWhtCertificatesLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!canAccess(roles, ["purchase"])) {
    return (
      <main className="p-8">
        <AccessDenied moduleName="พิมพ์หนังสือรับรองหัก ณ ที่จ่าย" />
      </main>
    );
  }
  return <>{children}</>;
}
