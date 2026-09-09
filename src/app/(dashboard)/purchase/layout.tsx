import { PurchaseNav } from "./purchase-nav";

export default function PurchaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">🚚 ระบบจัดซื้อ</h1>
      <p className="mt-1 text-teal-700">
        ขอซื้อ → ใบสั่งซื้อ → รับสินค้า → บันทึกบิลซื้อ → จ่ายชำระ
      </p>
      <div className="mt-5">
        <PurchaseNav />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
