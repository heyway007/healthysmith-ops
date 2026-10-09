import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function PrintHolidaysLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!canAccess(roles, ["hr"])) {
    return (
      <main className="p-8">
        <AccessDenied moduleName="พิมพ์ปฏิทินวันหยุด" />
      </main>
    );
  }
  return <>{children}</>;
}
