import { BackLink } from "@/components/ui/back-link";
import { createCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <BackLink href="/sales" label="กลับไปหน้ารายชื่อลูกค้า" />
      <h1 className="mt-3 text-2xl font-semibold text-teal-950">เพิ่มลูกค้าใหม่</h1>
      <div className="mt-6">
        <CustomerForm action={createCustomer} submitLabel="เพิ่มลูกค้า" error={error} />
      </div>
    </div>
  );
}
