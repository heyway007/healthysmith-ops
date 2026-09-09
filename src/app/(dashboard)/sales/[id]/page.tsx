import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { updateCustomer } from "../actions";
import { CustomerForm } from "../customer-form";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).single();

  if (!customer) notFound();

  return (
    <div>
      <BackLink href="/sales" label="กลับไปหน้ารายชื่อลูกค้า" />
      <h1 className="mt-3 text-2xl font-semibold text-teal-950">
        แก้ไขลูกค้า — {customer.name}
      </h1>
      <div className="mt-6">
        <CustomerForm
          action={updateCustomer.bind(null, id)}
          defaultValues={customer}
          submitLabel="บันทึกการแก้ไข"
          error={error}
        />
      </div>
    </div>
  );
}
