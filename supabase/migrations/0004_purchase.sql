-- ============================================================================
-- 0004_purchase.sql
-- Module 4: ระบบจัดซื้อ (Purchase)
-- Supplier / PR ใบขอซื้อ / PO ใบสั่งซื้อ / GR ใบรับสินค้า-บริการ /
-- IR ใบรับเอกสารเจ้าหนี้ / บิลซื้อ / เจ้าหนี้ / กำหนดชำระ / Approval / ประวัติการซื้อ
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id                  uuid primary key default gen_random_uuid(),
  supplier_code       text not null unique,
  name                text not null,
  tax_id              varchar(13),
  phone               text,
  email               text,
  address             text,
  contact_person      text,
  payment_term_days   integer not null default 30,
  bank_name           text,
  bank_account_number text,
  bank_account_name   text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create index idx_suppliers_active on public.suppliers (is_active);
create index idx_suppliers_name_trgm on public.suppliers using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Purchase requests / PR (ขอซื้อ)
-- ---------------------------------------------------------------------------
create table public.purchase_requests (
  id             uuid primary key default gen_random_uuid(),
  pr_number      text not null unique default public.next_document_number('purchase_request'),
  requested_by   uuid references public.employees (id),
  department_id  uuid references public.departments (id),
  request_date   date not null default current_date,
  required_date  date,
  status         text not null default 'draft'
                 check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'converted', 'cancelled')),
  note           text,
  approved_by    uuid references public.employees (id),
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_purchase_requests_updated_at
  before update on public.purchase_requests
  for each row execute function public.set_updated_at();

create index idx_purchase_requests_status on public.purchase_requests (status);
create index idx_purchase_requests_requester on public.purchase_requests (requested_by);

create table public.purchase_request_items (
  id                     uuid primary key default gen_random_uuid(),
  purchase_request_id    uuid not null references public.purchase_requests (id) on delete cascade,
  product_id             uuid references public.products (id),
  description             text,
  quantity                numeric(14, 3) not null default 1,
  estimated_unit_price    numeric(14, 2) not null default 0,
  sort_order              integer not null default 0
);

create index idx_pr_items_request on public.purchase_request_items (purchase_request_id);

-- ---------------------------------------------------------------------------
-- Purchase orders / PO (สั่งซื้อ)
-- ---------------------------------------------------------------------------
create table public.purchase_orders (
  id                   uuid primary key default gen_random_uuid(),
  po_number            text not null unique default public.next_document_number('purchase_order'),
  purchase_request_id  uuid references public.purchase_requests (id),
  supplier_id          uuid not null references public.suppliers (id) on delete restrict,
  order_date           date not null default current_date,
  expected_date        date,
  status               text not null default 'draft'
                       check (status in
                         ('draft', 'pending_approval', 'approved', 'sent',
                          'partially_received', 'received', 'closed', 'cancelled')),
  subtotal             numeric(14, 2) not null default 0,
  discount_amount      numeric(14, 2) not null default 0,
  vat_amount           numeric(14, 2) not null default 0,
  total_amount         numeric(14, 2) not null default 0,
  note                 text,
  created_by           uuid references public.employees (id),
  approved_by          uuid references public.employees (id),
  approved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger trg_purchase_orders_updated_at
  before update on public.purchase_orders
  for each row execute function public.set_updated_at();

create index idx_purchase_orders_supplier on public.purchase_orders (supplier_id);
create index idx_purchase_orders_status on public.purchase_orders (status);
create index idx_purchase_orders_request on public.purchase_orders (purchase_request_id);

create table public.purchase_order_items (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references public.purchase_orders (id) on delete cascade,
  product_id          uuid references public.products (id),
  description         text,
  quantity            numeric(14, 3) not null default 1,
  unit_price          numeric(14, 2) not null default 0,
  discount_amount     numeric(14, 2) not null default 0,
  amount              numeric(14, 2) generated always as (quantity * unit_price - discount_amount) stored,
  received_quantity   numeric(14, 3) not null default 0,
  sort_order          integer not null default 0
);

create index idx_po_items_order on public.purchase_order_items (purchase_order_id);

-- ---------------------------------------------------------------------------
-- Goods receipts / GR (รับสินค้า-บริการ)
-- ---------------------------------------------------------------------------
create table public.goods_receipts (
  id                  uuid primary key default gen_random_uuid(),
  gr_number           text not null unique default public.next_document_number('goods_receipt'),
  purchase_order_id   uuid not null references public.purchase_orders (id) on delete restrict,
  supplier_id         uuid not null references public.suppliers (id) on delete restrict,
  receipt_date        date not null default current_date,
  status              text not null default 'draft' check (status in ('draft', 'confirmed', 'cancelled')),
  note                text,
  received_by         uuid references public.employees (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_goods_receipts_updated_at
  before update on public.goods_receipts
  for each row execute function public.set_updated_at();

create index idx_goods_receipts_po on public.goods_receipts (purchase_order_id);
create index idx_goods_receipts_supplier on public.goods_receipts (supplier_id);

create table public.goods_receipt_items (
  id                       uuid primary key default gen_random_uuid(),
  goods_receipt_id         uuid not null references public.goods_receipts (id) on delete cascade,
  purchase_order_item_id   uuid references public.purchase_order_items (id),
  product_id               uuid references public.products (id),
  quantity_received        numeric(14, 3) not null default 0,
  unit_price               numeric(14, 2) not null default 0,
  amount                   numeric(14, 2) generated always as (quantity_received * unit_price) stored,
  note                     text
);

create index idx_gr_items_receipt on public.goods_receipt_items (goods_receipt_id);
create index idx_gr_items_po_item on public.goods_receipt_items (purchase_order_item_id);

-- ---------------------------------------------------------------------------
-- Purchase bills / IR (รับเอกสารเจ้าหนี้ + บิลซื้อ + เจ้าหนี้ + กำหนดชำระ)
-- ---------------------------------------------------------------------------
create table public.purchase_bills (
  id                      uuid primary key default gen_random_uuid(),
  bill_number             text not null unique default public.next_document_number('purchase_bill'),
  supplier_invoice_number text,                       -- the supplier's own document number
  purchase_order_id       uuid references public.purchase_orders (id),
  supplier_id             uuid not null references public.suppliers (id) on delete restrict,
  bill_date               date not null default current_date,
  due_date                date,
  status                  text not null default 'draft'
                          check (status in
                            ('draft', 'pending_approval', 'approved', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  subtotal                numeric(14, 2) not null default 0,
  discount_amount         numeric(14, 2) not null default 0,
  vat_amount              numeric(14, 2) not null default 0,
  wht_amount              numeric(14, 2) not null default 0,
  total_amount            numeric(14, 2) not null default 0,
  paid_amount             numeric(14, 2) not null default 0,
  outstanding_amount      numeric(14, 2) generated always as (total_amount - paid_amount) stored,
  note                    text,
  created_by              uuid references public.employees (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger trg_purchase_bills_updated_at
  before update on public.purchase_bills
  for each row execute function public.set_updated_at();

create index idx_purchase_bills_supplier on public.purchase_bills (supplier_id);
create index idx_purchase_bills_status on public.purchase_bills (status);
create index idx_purchase_bills_due_date on public.purchase_bills (due_date);

create table public.purchase_bill_items (
  id                      uuid primary key default gen_random_uuid(),
  purchase_bill_id        uuid not null references public.purchase_bills (id) on delete cascade,
  goods_receipt_item_id   uuid references public.goods_receipt_items (id),
  product_id              uuid references public.products (id),
  description             text,
  quantity                numeric(14, 3) not null default 1,
  unit_price              numeric(14, 2) not null default 0,
  discount_amount         numeric(14, 2) not null default 0,
  amount                  numeric(14, 2) generated always as (quantity * unit_price - discount_amount) stored,
  sort_order              integer not null default 0
);

create index idx_bill_items_bill on public.purchase_bill_items (purchase_bill_id);

-- ---------------------------------------------------------------------------
-- Accounts payable payments (จ่ายชำระเจ้าหนี้)
-- ---------------------------------------------------------------------------
create table public.ap_payments (
  id                uuid primary key default gen_random_uuid(),
  payment_number    text not null unique default public.next_document_number('ap_payment'),
  supplier_id       uuid not null references public.suppliers (id) on delete restrict,
  purchase_bill_id  uuid references public.purchase_bills (id),
  payment_date      date not null default current_date,
  payment_method    text not null default 'bank_transfer'
                    check (payment_method in ('cash', 'bank_transfer', 'cheque', 'other')),
  amount            numeric(14, 2) not null,
  reference_number  text,
  note              text,
  created_by        uuid references public.employees (id),
  created_at        timestamptz not null default now()
);

create index idx_ap_payments_supplier on public.ap_payments (supplier_id);
create index idx_ap_payments_bill on public.ap_payments (purchase_bill_id);

-- ---------------------------------------------------------------------------
-- Approval trail, shared across PR / PO / purchase bill
-- (multi-level approval; module 8 will add role-based routing on top of this)
-- ---------------------------------------------------------------------------
create table public.purchase_approvals (
  id              uuid primary key default gen_random_uuid(),
  document_type   text not null check (document_type in ('purchase_request', 'purchase_order', 'purchase_bill')),
  document_id     uuid not null,
  approver_id     uuid not null references public.employees (id),
  approval_level  integer not null default 1,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment         text,
  approved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_purchase_approvals_document on public.purchase_approvals (document_type, document_id);
create index idx_purchase_approvals_approver on public.purchase_approvals (approver_id);

-- ---------------------------------------------------------------------------
-- Convenience view: purchase history per supplier (ประวัติการซื้อ)
-- ---------------------------------------------------------------------------
create view public.supplier_purchase_history as
select
  s.id            as supplier_id,
  s.name          as supplier_name,
  pb.id           as purchase_bill_id,
  pb.bill_number,
  pb.bill_date,
  pb.status,
  pb.total_amount,
  pb.outstanding_amount
from public.suppliers s
join public.purchase_bills pb on pb.supplier_id = s.id
order by pb.bill_date desc;
