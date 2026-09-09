# โครงสร้างฐานข้อมูล (Database Schema)

ไฟล์ migration อยู่ที่ `supabase/migrations/` รันตามลำดับเลขไฟล์ (0001 → 0005)
ครอบคลุม 3 โมดูลที่ทำก่อน ได้แก่ **ระบบขาย, ระบบจัดซื้อ, ระบบพนักงานและเงินเดือน**
พร้อมตารางกลางที่ทั้ง 3 ระบบใช้ร่วมกัน

| ไฟล์ | เนื้อหา |
|---|---|
| `0001_common.sql` | Extension, ฟังก์ชันช่วยเหลือ (เลขที่เอกสารอัตโนมัติ, updated_at), ตาราง `companies`, `products` (stub) |
| `0002_hr_payroll.sql` | โมดูล 7: พนักงานและเงินเดือน |
| `0003_sales.sql` | โมดูล 2: ระบบขาย |
| `0004_purchase.sql` | โมดูล 4: ระบบจัดซื้อ |
| `0005_rls_policies.sql` | เปิด Row Level Security ทุกตาราง (สิทธิ์เริ่มต้น: ผู้ใช้ที่ login แล้วทำได้ทุกอย่าง) |

> **หมายเหตุสำคัญ:** ตาราง `products` ใน `0001_common.sql` เป็นแค่โครงชั่วคราว
> (sku, ชื่อ, ราคา) ให้ Sales/Purchase อ้างอิงได้ก่อน เมื่อสร้างโมดูล 3
> (ระบบสินค้าและสต๊อก) จริง จะต้องขยายตารางนี้เพิ่ม (Lot, วันหมดอายุ,
> คลังสินค้า, ประวัติสต๊อกเข้า-ออก) — โครงสร้างตอนนี้ตั้งใจไม่ผูก logic
> stock เข้าไปเพื่อไม่ให้ชนกับตอนสร้างโมดูล Inventory ทีหลัง

## เลขที่เอกสารอัตโนมัติ

ตาราง `document_number_sequences` + ฟังก์ชัน `next_document_number(doc_type)`
ออกเลขที่เอกสารให้อัตโนมัติแบบ atomic (ล็อกแถวกันเลขซ้ำตอนใช้งานพร้อมกัน)
รูปแบบ: `PREFIX + YY หรือ YYMM + running 4 หลัก` เช่น `SO2506-0001`

ทุกตารางเอกสาร (quotations, sales_orders, invoices, purchase_orders, ...)
มี default ของคอลัมน์เลขที่เอกสารเรียกฟังก์ชันนี้อัตโนมัติ ไม่ต้องคำนวณเองฝั่ง frontend

## โมดูล 7 — พนักงานและเงินเดือน (HR & Payroll)

```
departments, positions
  └─ employees ──────────────┬─ employee_salary_history (ประวัติปรับเงินเดือน)
                              ├─ employee_deduction_settings (กยศ. / กองทุนสำรองเลี้ยงชีพ ฯลฯ)
                              ├─ leave_requests → leave_types
                              ├─ ot_records (OT)
                              └─ bonus_commission_records (Bonus / Commission)

payroll_periods → payroll_runs → payroll_items (1 แถวต่อพนักงานต่องวด)
                                    ├─ social_security_contributions
                                    ├─ payslips
                                    ├─ ot_records.payroll_item_id (ผูก OT ที่จ่ายแล้ว)
                                    └─ bonus_commission_records.payroll_item_id
```

- `payroll_items` คำนวณ `gross_income`, `total_deduction`, `net_pay` ด้วย
  **generated column** (Postgres คำนวณให้อัตโนมัติ ไม่ต้องเขียนทับเอง)
- ภาษีหัก ณ ที่จ่ายเก็บที่ `payroll_items.withholding_tax` ต่องวด (ยังไม่มีตาราง
  สะสมยอดทั้งปีสำหรับออกหนังสือรับรองหัก ณ ที่จ่าย/ภ.ง.ด.1 — เพิ่มได้ภายหลัง
  เมื่อทำรายงานภาษีจริงจัง)

## โมดูล 2 — ระบบขาย (Sales)

```
sales_channels (Website / Shopee / Lazada / TikTok / หน้าร้าน)
customers → customer_addresses

quotations → quotation_items          (ใบเสนอราคา)
    ↓ convert
sales_orders → sales_order_items      (ออเดอร์)
    ↓
invoices → invoice_items              (ใบแจ้งหนี้)
    ↓
tax_invoices                          (ใบกำกับภาษี ผูกกับ invoice)
receipts                              (ใบเสร็จ / รับชำระเงิน ผูกกับ invoice)
shipments                             (การจัดส่ง ผูกกับ sales_order)
sales_returns → sales_return_items    (คืนสินค้า อ้างอิง sales_order)
```

- `invoices.outstanding_amount` และ `purchase_bills.outstanding_amount` เป็น
  generated column จาก `total_amount - paid_amount` — ใช้ query หายอดค้างชำระ
  ได้ทันทีโดยไม่ต้องคำนวณฝั่งแอป
- `sales_orders.salesperson_id` อ้างอิง `employees` (สำหรับคำนวณค่าคอมมิชชั่นใน
  โมดูล HR ภายหลัง)

## โมดูล 4 — ระบบจัดซื้อ (Purchase)

```
suppliers

purchase_requests (PR) → purchase_request_items
    ↓ approve + convert
purchase_orders (PO) → purchase_order_items
    ↓ รับของ
goods_receipts (GR) → goods_receipt_items
    ↓ รับบิล
purchase_bills (IR/บิลซื้อ) → purchase_bill_items
    ↓ จ่ายเงิน
ap_payments

purchase_approvals   -- ประวัติอนุมัติ ใช้ร่วมกับ PR / PO / purchase_bills
                          (document_type + document_id แทนการทำ FK แยกตาราง)
```

- `supplier_purchase_history` เป็น **view** สรุปประวัติการซื้อต่อ supplier
  (ตาม requirement "ประวัติการซื้อ") ไม่ต้องสร้างตารางแยก
- `purchase_order_items.received_quantity` และ `goods_receipt_items` ใช้ตรวจสอบ
  สถานะรับของบางส่วน (partially_received) ได้

## Row Level Security (RLS)

`0005_rls_policies.sql` เปิด RLS ทุกตารางและอนุญาตให้ authenticated user
ทำได้ทุกอย่าง (`using (true) with check (true)`) — เป็นจุดเริ่มต้นที่ปลอดภัย
กว่าไม่เปิด RLS เลย แต่ **ยังไม่ใช่ระบบสิทธิ์จริง** เมื่อสร้างโมดูล 8
(ระบบผู้ใช้งานและสิทธิ์) ให้กลับมาแก้ policy พวกนี้ให้ตรวจสอบ role/สิทธิ์
ของผู้ใช้แต่ละคน เช่น พนักงานทั่วไปเห็นได้แค่ payslip ของตัวเอง,
เฉพาะฝ่ายบัญชีอนุมัติ purchase_bills ได้ ฯลฯ

## การรันบนเครื่อง (local development)

ต้องมี [Supabase CLI](https://supabase.com/docs/guides/local-development)
และ Docker:

```bash
npx supabase init        # ครั้งแรกครั้งเดียว ถ้ายังไม่มี supabase/config.toml
npx supabase start       # เปิด Postgres + Studio ในเครื่อง
npx supabase db reset    # รัน migrations ทั้งหมด + seed.sql
```

จากนั้นคัดลอกค่า `API URL` และ `anon key` ที่ `supabase start` แสดงออกมาใส่ใน
`.env.local` (ดู `.env.local.example`)

เมื่อพร้อม deploy ขึ้น Supabase Cloud จริง ใช้ `npx supabase link` +
`npx supabase db push` เพื่อรัน migration ชุดเดียวกันนี้กับโปรเจกต์บน cloud
