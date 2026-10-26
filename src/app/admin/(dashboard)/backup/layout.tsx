import { getCurrentRoles } from "@/lib/current-role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function BackupLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!roles.includes("admin")) return <AccessDenied moduleName="สำรองข้อมูล" />;
  return <>{children}</>;
}
