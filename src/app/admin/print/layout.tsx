import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";

// Print pages live outside the dashboard layout (no sidebar/header) but are
// still under /admin, so they use the back-office session and need the HR role.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const roles = await getCurrentRoles();
  if (!canAccess(roles, ["hr"])) {
    return (
      <main className="p-8">
        <AccessDenied moduleName="พิมพ์ปฏิทินวันหยุด" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-avoid-break { break-inside: avoid; }
        }
      `}</style>
      {children}
    </div>
  );
}
