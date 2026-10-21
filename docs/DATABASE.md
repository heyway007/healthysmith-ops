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
| `0014_marketplace_orders_tax_invoices.sql` | นำเข้าออเดอร์ Shopee/Lazada/TikTok + ออกใบกำกับภาษีแยก/รวมออเดอร์ |
| `0015_audit_log.sql` | Audit log: บันทึกการเพิ่ม/แก้ไข/ลบทุกตาราง + การเข้า-ออกระบบ |

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

### นำเข้าออเดอร์ marketplace + ใบกำกับภาษี (`0014_marketplace_orders_tax_invoices.sql`)

```
order_imports                         (ประวัติอัปโหลดไฟล์ export)
sales_orders  + external_order_id     (เลขออเดอร์ของแพลตฟอร์ม — unique ต่อช่องทาง)
              + buyer_* / shipping_address / billing_* (ข้อมูลผู้ซื้อ ณ วันสั่ง + ข้อมูลขอใบกำกับ)
tax_invoices ← tax_invoice_orders → sales_orders   (1 ใบ ครอบคลุม 1 หรือหลายออเดอร์)
             → tax_invoice_items                     (รายการ ณ วันที่ออกใบ — ไม่ดึงจากออเดอร์สด)
views: sales_order_list, tax_invoice_list (security_invoker)
rpc:   import_sales_orders(), issue_tax_invoice()
```

กติกาที่ระบบบังคับ / ใช้ (ตามแนวปฏิบัติทั่วไปของร้านค้าออนไลน์ที่จด VAT):

- ราคาบน marketplace **รวม VAT 7% แล้ว** → `vat = ยอด × 7/107`
- ยอดในใบกำกับ = ราคาสินค้า − ส่วนลดที่**ร้านออกเงินเอง** (ส่วนลดสินค้า + โค้ดร้าน)
  ส่วนลด/โค้ด/เหรียญที่**แพลตฟอร์มออก**ไม่หัก (แพลตฟอร์มจ่ายส่วนนั้นให้ร้าน) เก็บไว้ที่ `platform_discount`
- ค่าส่งที่ผู้ซื้อจ่ายบน marketplace ไม่ใช่รายได้ร้าน → ไม่อยู่ในใบกำกับ;
  ช่องทางขายตรง (`sales_channels.is_marketplace = false`) ค่าส่งเป็นรายการ "ค่าจัดส่ง"
- ใบกำกับ**ห้ามลบ** — ยกเลิกได้ (เลขไม่นำกลับมาใช้) แล้วออกใบใหม่แทน
- 1 ออเดอร์มีใบกำกับที่ใช้งานได้ไม่เกิน 1 ใบ; รวมหลายออเดอร์ได้เฉพาะ**เดือนเดียวกัน**
- นำเข้าไฟล์ซ้ำ = อัปเดต; ออเดอร์ที่ออกใบกำกับแล้วอัปเดตเฉพาะสถานะ (ยอด/รายการล็อก)

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

## Audit log (`0015_audit_log.sql`)

ตาราง `audit_logs` เก็บว่าใครเพิ่ม / แก้ไข / ลบข้อมูลอะไร เมื่อไหร่ — ดูได้ที่
หลังบ้าน **ประวัติการใช้งาน** (`/admin/audit-logs`, เฉพาะ admin)

- **การเปลี่ยนแปลงข้อมูล** บันทึกโดย trigger `trg_audit` (ฟังก์ชัน
  `audit_row_change()`) ที่ติดไว้ทุกตาราง จึงครอบคลุมทั้ง server action, RPC
  และหน้าบ้านโดยไม่ต้องเขียนโค้ดเพิ่ม ผู้กระทำอ่านจาก JWT (`auth.uid()` + email)
  ถ้าเขียนด้วย service-role key จะไม่มีผู้กระทำ (แสดงเป็น "ระบบ")
  - update: เก็บเฉพาะคอลัมน์ที่เปลี่ยน (`old_data` / `new_data` / `changed_fields`)
    ถ้าเปลี่ยนแค่ `updated_at` จะไม่บันทึก
  - insert แล้ว update แถวเดิมใน transaction เดียวกัน (เช่น RPC ที่สร้างเอกสาร
    แล้วค่อยเติมยอดรวม) จะรวมเป็นรายการ insert เดียว
  - ไม่บันทึก: `document_number_sequences`, `sales_order_items` (สร้างใหม่ทุกครั้งที่
    นำเข้าซ้ำ), `tax_invoice_items` (คัดลอกจากออเดอร์ตอนออกใบ)
  - `sales_orders`: ถ้านำเข้าซ้ำแล้วเปลี่ยนแค่ `order_import_id` จะไม่บันทึก
- **การเข้า-ออกระบบ และบัญชีผู้ใช้ใน Supabase Auth** (สร้างบัญชี, เปลี่ยนอีเมล /
  รหัสผ่าน) บันทึกจากฝั่งแอปผ่าน `logAuditEvent()` ใน `src/lib/audit.ts`
- แก้ไข / ลบรายการ log ผ่าน API ไม่ได้ (admin อ่านได้อย่างเดียว)

**ตารางใหม่ต้องเปิด audit เอง** ใน migration ของตารางนั้น:

```sql
select public.enable_audit('public.<table>');
-- หรือระบุคอลัมน์ที่เปลี่ยนแล้วไม่ต้องบันทึก
select public.enable_audit('public.<table>', array['some_column']);
```

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
