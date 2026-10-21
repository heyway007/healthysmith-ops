import { getCurrentRoles } from "@/lib/current-role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function AuditLogsLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!roles.includes("admin")) return <AccessDenied moduleName="หน้าประวัติการใช้งาน" />;
  return <>{children}</>;
}
