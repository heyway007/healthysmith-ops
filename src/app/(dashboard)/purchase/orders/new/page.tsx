import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { createOrder } from "../actions";
import { OrderForm } from "../order-form";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from_pr?: string }>;
}) {
  const { error, from_pr } = await searchParams;

  let defaultItems:
    | { description: string | null; quantity: number; unit_price: number; discount_amount: number }[]
    | undefined;
  let purchaseRequestId: string | undefined;

  if (from_pr) {
    const supabase = await createClient();
    const { data: pr } = await supabase
      .from("purchase_requests")
      .select("id, status")
      .eq("id", from_pr)
      .eq("status", "approved")
      .maybeSingle();

    if (pr) {
      purchaseRequestId = pr.id;
      const { data: items } = await supabase
        .from("purchase_request_items")
        .select("*")
        .eq("purchase_request_id", pr.id)
        .order("sort_order");
      defaultItems = (items ?? []).map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.estimated_unit_price,
        discount_amount: 0,
      }));
    }
  }

  return (
    <div>
      <BackLink href="/purchase/orders" label="กลับไปหน้าใบสั่งซื้อ" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">
        สร้างใบสั่งซื้อ{purchaseRequestId && " (แปลงจากใบขอซื้อ)"}
      </h2>
      <div className="mt-6">
        <OrderForm
          action={createOrder}
          defaultItems={defaultItems}
          purchaseRequestId={purchaseRequestId}
          submitLabel="บันทึกใบสั่งซื้อ"
          error={error}
        />
      </div>
    </div>
  );
}
