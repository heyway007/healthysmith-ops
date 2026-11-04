import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { bangkokToday } from "@/components/holidays/holiday-views";
import { ProductionForm } from "../production-form";
import { productionFormData } from "../form-data";

export default async function NewProductionOrderPage() {
  const supabase = await createClient();
  const { products, producers } = await productionFormData(supabase);

  return (
    <div>
      <BackLink href="/admin/inventory/production" label="กลับไปหน้ารายการใบผลิต" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">เปิดใบผลิตสินค้า</h2>
      <div className="mt-4">
        <ProductionForm
          id={null}
          defaults={{ order_date: bangkokToday(), due_date: null, producer_name: null, note: null }}
          products={products}
          producers={producers}
          submitLabel="บันทึกใบผลิต"
        />
      </div>
    </div>
  );
}
