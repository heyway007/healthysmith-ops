import { BackLink } from "@/components/ui/back-link";
import { createBill } from "../actions";
import { BillForm } from "../bill-form";

export default async function NewBillPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <BackLink href="/admin/purchase/bills" label="กลับไปหน้าบิลซื้อ" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">บันทึกบิลซื้อ</h2>
      <div className="mt-6">
        <BillForm action={createBill} submitLabel="บันทึกบิลซื้อ" error={error} />
      </div>
    </div>
  );
}
