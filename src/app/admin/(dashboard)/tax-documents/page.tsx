import { redirect } from "next/navigation";
import { getCurrentRoles } from "@/lib/current-role";
import { canAccess } from "@/lib/role";

export default async function TaxDocumentsIndexPage() {
  const roles = await getCurrentRoles();
  redirect(canAccess(roles, ["sales"]) ? "/admin/tax-documents/tax-invoices" : "/admin/tax-documents/wht");
}
