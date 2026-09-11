import { getCurrentRoles } from "@/lib/current-role";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!roles.includes("admin")) return <AccessDenied moduleName="หน้าผู้ใช้งานและสิทธิ์" />;
  return <>{children}</>;
}
