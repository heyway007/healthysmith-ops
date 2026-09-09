import { BackLink } from "@/components/ui/back-link";
import { createRequest } from "../actions";
import { RequestForm } from "../request-form";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <BackLink href="/purchase/requests" label="กลับไปหน้ารายการขอซื้อ" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">สร้างใบขอซื้อ</h2>
      <div className="mt-6">
        <RequestForm action={createRequest} submitLabel="บันทึกใบขอซื้อ" error={error} />
      </div>
    </div>
  );
}
