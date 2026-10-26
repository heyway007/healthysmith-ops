import { getCurrentRoles, getDocPermissions } from "@/lib/current-role";
import { canAccess } from "@/lib/role";
import { AccessDenied } from "@/components/ui/access-denied";
import { SectionTabs } from "@/components/layout/section-tabs";

// Tax documents for both sides of the business: tax invoices we issue when
// selling (sales role) and 50 ทวิ certificates we issue when paying (purchase
// role). Each sub-area checks its own role in a nested layout.
export default async function TaxDocumentsLayout({ children }: { children: React.ReactNode }) {
  const [roles, docPermissions] = await Promise.all([getCurrentRoles(), getDocPermissions()]);
  const allowed = canAccess(roles, ["sales", "purchase"]) && docPermissions.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">🧾 เอกสารภาษี</h1>
      <p className="mt-1 text-teal-700">ใบเสร็จรับเงิน/ใบกำกับภาษี และหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)</p>
      {allowed && (
        <div className="mt-5">
          <SectionTabs group="tax" roles={roles} docPermissions={docPermissions} />
        </div>
      )}
      <div className="mt-6">{allowed ? children : <AccessDenied moduleName="เอกสารภาษี (ต้องได้รับสิทธิ์เอกสารภาษีจากผู้ดูแลระบบ)" />}</div>
    </div>
  );
}
