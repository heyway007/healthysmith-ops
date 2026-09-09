-- ============================================================================
-- seed.sql
-- Sample data for local development only. Safe to re-run against a fresh
-- database (supabase db reset runs this automatically after migrations).
-- ============================================================================

insert into public.companies (name, tax_id, address, phone, email)
values ('บริษัท ตัวอย่าง จำกัด', '0105561000000', '123 ถนนตัวอย่าง กรุงเทพฯ', '02-000-0000', 'info@example.com');

-- HR ---------------------------------------------------------------------
insert into public.departments (id, name) values
  ('11111111-1111-1111-1111-111111111101', 'ขาย'),
  ('11111111-1111-1111-1111-111111111102', 'จัดซื้อ'),
  ('11111111-1111-1111-1111-111111111103', 'บัญชีและการเงิน'),
  ('11111111-1111-1111-1111-111111111104', 'บุคคล');

insert into public.positions (department_id, name) values
  ('11111111-1111-1111-1111-111111111101', 'พนักงานขาย'),
  ('11111111-1111-1111-1111-111111111102', 'เจ้าหน้าที่จัดซื้อ'),
  ('11111111-1111-1111-1111-111111111103', 'เจ้าหน้าที่บัญชี'),
  ('11111111-1111-1111-1111-111111111104', 'เจ้าหน้าที่บุคคล');

insert into public.employees (id, employee_code, prefix_name, first_name, last_name, department_id, employment_type, start_date, base_salary, phone, email) values
  ('22222222-2222-2222-2222-222222222201', 'EMP001', 'นาย', 'สมชาย', 'ใจดี', '11111111-1111-1111-1111-111111111101', 'full_time', '2023-01-05', 18000, '081-000-0001', 'somchai@example.com'),
  ('22222222-2222-2222-2222-222222222202', 'นางสาว', 'สมหญิง', 'รักงาน', '11111111-1111-1111-1111-111111111102', 'full_time', '2022-06-01', 22000, '081-000-0002', 'somying@example.com'),
  ('22222222-2222-2222-2222-222222222203', 'นาย', 'วิชัย', 'ตั้งใจ', '11111111-1111-1111-1111-111111111103', 'full_time', '2021-03-15', 25000, '081-000-0003', 'wichai@example.com');

insert into public.leave_types (name, max_days_per_year, is_paid) values
  ('ลาป่วย', 30, true),
  ('ลากิจ', 6, true),
  ('ลาพักร้อน', 6, true),
  ('ลาคลอด', 98, true);

-- Products (placeholder catalogue) ---------------------------------------
insert into public.products (sku, name, unit, product_type, cost_price, sale_price) values
  ('SKU-001', 'สินค้าตัวอย่าง A', 'ชิ้น', 'finished_good', 100, 150),
  ('SKU-002', 'สินค้าตัวอย่าง B', 'กล่อง', 'finished_good', 300, 450),
  ('RM-001',  'วัตถุดิบตัวอย่าง C', 'กก.', 'raw_material', 50, 0);

-- Sales --------------------------------------------------------------------
insert into public.customers (customer_code, customer_type, name, phone, email, credit_term_days) values
  ('CUS-0001', 'individual', 'คุณลูกค้า ทดสอบ', '089-000-0001', 'customer1@example.com', 0),
  ('CUS-0002', 'company', 'บริษัท ลูกค้า จำกัด', '02-111-1111', 'ap@customerco.com', 30);

-- Purchase -------------------------------------------------------------------
insert into public.suppliers (supplier_code, name, phone, email, payment_term_days) values
  ('SUP-0001', 'บริษัท ซัพพลายเออร์ จำกัด', '02-222-2222', 'sales@supplier.com', 30),
  ('SUP-0002', 'ร้านวัตถุดิบ ทดสอบ', '089-999-9999', 'contact@rawmaterial.com', 15);
