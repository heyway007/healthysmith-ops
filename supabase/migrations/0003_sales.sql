-- ============================================================================
-- 0003_sales.sql
-- Module 2: ระบบขาย (Sales)
-- Order / ลูกค้า / Website / Shopee / Lazada / TikTok / ใบเสนอราคา /
-- ใบแจ้งหนี้ / ใบเสร็จ / ใบกำกับภาษี / การชำระเงิน / การจัดส่ง / คืนสินค้า
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Sales channels (Website / Shopee / Lazada / TikTok / walk-in / ...)
-- ---------------------------------------------------------------------------
create table public.sales_channels (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,   -- 'website' | 'shopee' | 'lazada' | 'tiktok' | 'offline' | ...
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.sales_channels (code, name) values
  ('offline', 'หน้าร้าน / ขายตรง'),
  ('website', 'เว็บไซต์'),
  ('shopee', 'Shopee'),
  ('lazada', 'Lazada'),
  ('tiktok', 'TikTok Shop');

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id               uuid primary key default gen_random_uuid(),
  customer_code    text not null unique,
  customer_type    text not null default 'individual' check (customer_type in ('individual', 'company')),
  name             text not null,
  tax_id           varchar(13),
  phone            text,
  email            text,
  address          text,
  credit_limit     numeric(14, 2) not null default 0,
  credit_term_days integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index idx_customers_active on public.customers (is_active);
create index idx_customers_name_trgm on public.customers using gin (name gin_trgm_ops);

create table public.customer_addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id) on delete cascade,
  address_type text not null default 'shipping' check (address_type in ('billing', 'shipping')),
  address_line text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_customer_addresses_customer on public.customer_addresses (customer_id);

-- ---------------------------------------------------------------------------
-- Quotations (ใบเสนอราคา)
-- ---------------------------------------------------------------------------
create table public.quotations (
  id                uuid primary key default gen_random_uuid(),
  quotation_number  text not null unique default public.next_document_number('quotation'),
  customer_id       uuid not null references public.customers (id) on delete restrict,
  sales_channel_id  uuid references public.sales_channels (id),
  quotation_date    date not null default current_date,
  valid_until       date,
  status            text not null default 'draft'
                    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  subtotal          numeric(14, 2) not null default 0,
  discount_amount   numeric(14, 2) not null default 0,
  vat_amount        numeric(14, 2) not null default 0,
  total_amount      numeric(14, 2) not null default 0,
  note              text,
  created_by        uuid references public.employees (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trg_quotations_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

create index idx_quotations_customer on public.quotations (customer_id);
create index idx_quotations_status on public.quotations (status);

create table public.quotation_items (
  id              uuid primary key default gen_random_uuid(),
  quotation_id    uuid not null references public.quotations (id) on delete cascade,
  product_id      uuid references public.products (id),
  description     text,
  quantity        numeric(14, 3) not null default 1,
  unit_price      numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  amount          numeric(14, 2) generated always as (quantity * unit_price - discount_amount) stored,
  sort_order      integer not null default 0
);

create index idx_quotation_items_quotation on public.quotation_items (quotation_id);

-- ---------------------------------------------------------------------------
-- Sales orders (Order)
-- ---------------------------------------------------------------------------
create table public.sales_orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default public.next_document_number('sales_order'),
  quotation_id     uuid references public.quotations (id),
  customer_id      uuid not null references public.customers (id) on delete restrict,
  sales_channel_id uuid references public.sales_channels (id),
  salesperson_id   uuid references public.employees (id),
  order_date       date not null default current_date,
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled')),
  payment_status   text not null default 'unpaid'
                   check (payment_status in ('unpaid', 'partial', 'paid')),
  subtotal         numeric(14, 2) not null default 0,
  discount_amount  numeric(14, 2) not null default 0,
  vat_amount       numeric(14, 2) not null default 0,
  shipping_fee     numeric(14, 2) not null default 0,
  total_amount     numeric(14, 2) not null default 0,
  note             text,
  created_by       uuid references public.employees (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_sales_orders_updated_at
  before update on public.sales_orders
  for each row execute function public.set_updated_at();

create index idx_sales_orders_customer on public.sales_orders (customer_id);
create index idx_sales_orders_status on public.sales_orders (status);
create index idx_sales_orders_channel on public.sales_orders (sales_channel_id);

create table public.sales_order_items (
  id              uuid primary key default gen_random_uuid(),
  sales_order_id  uuid not null references public.sales_orders (id) on delete cascade,
  product_id      uuid references public.products (id),
  description     text,
  quantity        numeric(14, 3) not null default 1,
  unit_price      numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  amount          numeric(14, 2) generated always as (quantity * unit_price - discount_amount) stored,
  sort_order      integer not null default 0
);

create index idx_sales_order_items_order on public.sales_order_items (sales_order_id);

-- ---------------------------------------------------------------------------
-- Invoices (ใบแจ้งหนี้)
-- ---------------------------------------------------------------------------
create table public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  invoice_number     text not null unique default public.next_document_number('invoice'),
  sales_order_id     uuid references public.sales_orders (id),
  customer_id        uuid not null references public.customers (id) on delete restrict,
  invoice_date       date not null default current_date,
  due_date           date,
  status             text not null default 'draft'
                     check (status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  subtotal           numeric(14, 2) not null default 0,
  discount_amount    numeric(14, 2) not null default 0,
  vat_amount         numeric(14, 2) not null default 0,
  total_amount       numeric(14, 2) not null default 0,
  paid_amount        numeric(14, 2) not null default 0,
  outstanding_amount numeric(14, 2) generated always as (total_amount - paid_amount) stored,
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create index idx_invoices_customer on public.invoices (customer_id);
create index idx_invoices_status on public.invoices (status);
create index idx_invoices_sales_order on public.invoices (sales_order_id);

create table public.invoice_items (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices (id) on delete cascade,
  product_id      uuid references public.products (id),
  description     text,
  quantity        numeric(14, 3) not null default 1,
  unit_price      numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  amount          numeric(14, 2) generated always as (quantity * unit_price - discount_amount) stored,
  sort_order      integer not null default 0
);

create index idx_invoice_items_invoice on public.invoice_items (invoice_id);

-- ---------------------------------------------------------------------------
-- Tax invoices (ใบกำกับภาษี)
-- ---------------------------------------------------------------------------
create table public.tax_invoices (
  id                  uuid primary key default gen_random_uuid(),
  tax_invoice_number  text not null unique default public.next_document_number('tax_invoice'),
  invoice_id          uuid not null references public.invoices (id) on delete restrict,
  issue_date          date not null default current_date,
  buyer_tax_id        varchar(13),
  buyer_name          text not null,
  buyer_address       text,
  total_amount        numeric(14, 2) not null default 0,
  vat_amount          numeric(14, 2) not null default 0,
  is_cancelled        boolean not null default false,
  created_at          timestamptz not null default now()
);

create index idx_tax_invoices_invoice on public.tax_invoices (invoice_id);

-- ---------------------------------------------------------------------------
-- Receipts / payments received (ใบเสร็จ / การชำระเงิน)
-- ---------------------------------------------------------------------------
create table public.receipts (
  id               uuid primary key default gen_random_uuid(),
  receipt_number   text not null unique default public.next_document_number('receipt'),
  customer_id      uuid not null references public.customers (id) on delete restrict,
  invoice_id       uuid references public.invoices (id),
  receipt_date     date not null default current_date,
  payment_method   text not null default 'bank_transfer'
                   check (payment_method in ('cash', 'bank_transfer', 'credit_card', 'cheque', 'other')),
  amount           numeric(14, 2) not null,
  reference_number text,
  note             text,
  created_by       uuid references public.employees (id),
  created_at       timestamptz not null default now()
);

create index idx_receipts_customer on public.receipts (customer_id);
create index idx_receipts_invoice on public.receipts (invoice_id);

-- ---------------------------------------------------------------------------
-- Shipments (การจัดส่ง)
-- ---------------------------------------------------------------------------
create table public.shipments (
  id              uuid primary key default gen_random_uuid(),
  sales_order_id  uuid not null references public.sales_orders (id) on delete cascade,
  shipment_date   date,
  carrier         text,
  tracking_number text,
  shipping_status text not null default 'pending'
                  check (shipping_status in ('pending', 'packed', 'shipped', 'delivered', 'failed_delivery', 'returned')),
  delivered_at    timestamptz,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_shipments_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

create index idx_shipments_sales_order on public.shipments (sales_order_id);
create index idx_shipments_status on public.shipments (shipping_status);

-- ---------------------------------------------------------------------------
-- Sales returns (คืนสินค้า)
-- ---------------------------------------------------------------------------
create table public.sales_returns (
  id                  uuid primary key default gen_random_uuid(),
  return_number       text not null unique default public.next_document_number('sales_return'),
  sales_order_id      uuid not null references public.sales_orders (id) on delete restrict,
  customer_id         uuid not null references public.customers (id) on delete restrict,
  return_date         date not null default current_date,
  reason              text,
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected', 'completed')),
  total_refund_amount numeric(14, 2) not null default 0,
  created_by          uuid references public.employees (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_sales_returns_updated_at
  before update on public.sales_returns
  for each row execute function public.set_updated_at();

create index idx_sales_returns_order on public.sales_returns (sales_order_id);
create index idx_sales_returns_customer on public.sales_returns (customer_id);

create table public.sales_return_items (
  id                   uuid primary key default gen_random_uuid(),
  sales_return_id      uuid not null references public.sales_returns (id) on delete cascade,
  sales_order_item_id  uuid references public.sales_order_items (id),
  product_id           uuid references public.products (id),
  quantity             numeric(14, 3) not null default 1,
  unit_price           numeric(14, 2) not null default 0,
  amount               numeric(14, 2) generated always as (quantity * unit_price) stored
);

create index idx_sales_return_items_return on public.sales_return_items (sales_return_id);
