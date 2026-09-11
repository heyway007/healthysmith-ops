import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { updateSupplier } from "../actions";
import { SupplierForm } from "../supplier-form";

export default async function EditSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: supplier } = await supabase.from("suppliers").select("*").eq("id", id).single();

  if (!supplier) notFound();

  return (
    <div>
      <BackLink href="/admin/purchase/suppliers" label="กลับไปหน้ารายชื่อซัพพลายเออร์" />
      <h1 className="mt-3 text-2xl font-semibold text-teal-950">
        แก้ไขซัพพลายเออร์ — {supplier.name}
      </h1>
      <div className="mt-6">
        <SupplierForm
          action={updateSupplier.bind(null, id)}
          defaultValues={supplier}
          submitLabel="บันทึกการแก้ไข"
          error={error}
        />
      </div>
    </div>
  );
}
