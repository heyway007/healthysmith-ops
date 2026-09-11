import { BackLink } from "@/components/ui/back-link";
import { createSupplier } from "../actions";
import { SupplierForm } from "../supplier-form";

export default async function NewSupplierPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <BackLink href="/admin/purchase/suppliers" label="กลับไปหน้ารายชื่อซัพพลายเออร์" />
      <h1 className="mt-3 text-2xl font-semibold text-teal-950">เพิ่มซัพพลายเออร์ใหม่</h1>
      <div className="mt-6">
        <SupplierForm action={createSupplier} submitLabel="เพิ่มซัพพลายเออร์" error={error} />
      </div>
    </div>
  );
}
