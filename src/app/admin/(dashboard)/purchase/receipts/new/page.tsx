import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/back-link";
import { Field } from "@/components/ui/field";
import { formCardClassName, selectClassName, submitButtonClassName } from "@/lib/ui-classes";
import { employeeLabel } from "@/lib/employee-picker";
import { createReceipt } from "../actions";

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; po?: string }>;
}) {
  const { error, po } = await searchParams;
  const supabase = await createClient();

  if (!po) {
    const { data: orders } = await supabase
      .from("purchase_orders")
      .select("id, po_number, supplier_id")
      .in("status", ["approved", "sent", "partially_received"])
      .order("order_date", { ascending: false });
    const { data: suppliers } = await supabase.from("suppliers").select("id, name");
    const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

    return (
      <div>
        <BackLink href="/admin/purchase/receipts" label="กลับไปหน้าใบรับสินค้า" />
        <h2 className="mt-3 text-lg font-semibold text-teal-950">สร้างใบรับสินค้า</h2>
        <div className={`mt-6 max-w-lg ${formCardClassName}`}>
          {error && (
            <p className="mb-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
          )}
          <form method="GET" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-teal-800">
                เลือกใบสั่งซื้อที่ต้องการรับของ
              </label>
              <select name="po" required defaultValue="" className={selectClassName}>
                <option value="" disabled>
                  - เลือกใบสั่งซื้อ -
                </option>
                {orders?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.po_number} — {supplierNameById.get(o.supplier_id) ?? "-"}
                  </option>
                ))}
              </select>
              {(!orders || orders.length === 0) && (
                <p className="mt-2 text-xs text-teal-500">
                  ไม่มีใบสั่งซื้อที่พร้อมรับของ (ต้องอนุมัติ/ส่งให้ผู้ขายก่อน)
                </p>
              )}
            </div>
            <button type="submit" className={submitButtonClassName}>
              ถัดไป
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { data: order } = await supabase
    .from("purchase_orders")
    .select("id, po_number, supplier_id")
    .eq("id", po)
    .maybeSingle();

  if (!order) {
    return (
      <div>
        <BackLink href="/admin/purchase/receipts/new" label="เลือกใบสั่งซื้อใหม่" />
        <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">
          ไม่พบใบสั่งซื้อ หรือใบสั่งซื้อนี้ยังไม่พร้อมรับของ
        </p>
      </div>
    );
  }

  const [{ data: supplier }, { data: items }, { data: employees }] = await Promise.all([
    supabase.from("suppliers").select("name, supplier_code").eq("id", order.supplier_id).single(),
    supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", order.id)
      .order("sort_order"),
    supabase.from("employee_directory").select("id, first_name, last_name, employee_code").order("first_name"),
  ]);

  const openItems = (items ?? []).filter((i) => i.quantity - i.received_quantity > 0);

  return (
    <div>
      <BackLink href="/admin/purchase/receipts/new" label="เลือกใบสั่งซื้อใหม่" />
      <h2 className="mt-3 text-lg font-semibold text-teal-950">
        รับสินค้า — {order.po_number} ({supplier?.name})
      </h2>

      <div className={`mt-6 ${formCardClassName}`}>
        {error && (
          <p className="mb-5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-600">{error}</p>
        )}

        <form action={createReceipt} className="space-y-6">
          <input type="hidden" name="purchase_order_id" value={order.id} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="วันที่รับสินค้า"
              name="receipt_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <Field
              label="ผู้รับสินค้า"
              name="received_by_label"
              list="received-by-options"
              listOptions={(employees ?? []).map(employeeLabel)}
            />
            <Field label="หมายเหตุ" name="note" />
          </div>

          {openItems.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              ใบสั่งซื้อนี้รับสินค้าครบทุกรายการแล้ว
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-teal-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-50 text-left text-xs font-medium uppercase text-teal-700">
                    <th className="px-3 py-2">รายละเอียด</th>
                    <th className="px-3 py-2">สั่งซื้อ</th>
                    <th className="px-3 py-2">รับแล้ว</th>
                    <th className="px-3 py-2">เหลือรับ</th>
                    <th className="px-3 py-2">รับครั้งนี้</th>
                  </tr>
                </thead>
                <tbody>
                  {openItems.map((item) => {
                    const remaining = item.quantity - item.received_quantity;
                    return (
                      <tr key={item.id} className="border-t border-teal-100">
                        <td className="px-3 py-2 text-teal-900">{item.description ?? "-"}</td>
                        <td className="px-3 py-2 text-teal-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-teal-700">{item.received_quantity}</td>
                        <td className="px-3 py-2 text-teal-700">{remaining}</td>
                        <td className="px-2 py-1.5">
                          <input type="hidden" name="po_item_id" value={item.id} />
                          <input
                            name="quantity_received"
                            type="number"
                            step="0.001"
                            min="0"
                            max={remaining}
                            defaultValue="0"
                            className="w-28 rounded-md border border-teal-200 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4 border-t border-teal-100 pt-5">
            <button type="submit" className={submitButtonClassName} disabled={openItems.length === 0}>
              ยืนยันรับสินค้า
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
