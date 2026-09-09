-- ============================================================================
-- 0001_common.sql
-- Extensions, shared helper functions, and cross-module reference tables.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy text search (customer/product search)

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Company profile
-- Single-tenant assumption for now. If multi-company/branch support is
-- needed later, add a company_id column to every table and revisit RLS.
-- ---------------------------------------------------------------------------
create table public.companies (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  tax_id                  varchar(13),
  branch_code             varchar(10) not null default '00000',
  address                 text,
  phone                   text,
  email                   text,
  logo_url                text,
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Document running-number sequences
-- Every module that issues numbered documents (SO, PO, INV, PR, payroll
-- runs, ...) draws its next number from here so numbering stays centralized
-- and gap-free per period.
-- ---------------------------------------------------------------------------
create table public.document_number_sequences (
  id              uuid primary key default gen_random_uuid(),
  doc_type        text not null unique,
  prefix          text not null,
  current_number  bigint not null default 0,
  reset_period    text not null default 'yearly' check (reset_period in ('never', 'yearly', 'monthly')),
  last_reset_at   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_document_number_sequences_updated_at
  before update on public.document_number_sequences
  for each row execute function public.set_updated_at();

-- Atomically issue the next formatted document number, e.g. SO2506-0001.
-- Row-level lock (`for update`) prevents duplicate numbers under concurrent use.
create or replace function public.next_document_number(p_doc_type text)
returns text
language plpgsql
as $$
declare
  v_prefix     text;
  v_number     bigint;
  v_reset      text;
  v_last_reset date;
  v_period_key text;
begin
  select prefix, current_number, reset_period, last_reset_at
    into v_prefix, v_number, v_reset, v_last_reset
    from public.document_number_sequences
    where doc_type = p_doc_type
    for update;

  if not found then
    raise exception 'Unknown document type for numbering: %', p_doc_type;
  end if;

  if v_reset = 'yearly'
     and (v_last_reset is null or extract(year from v_last_reset) <> extract(year from now())) then
    v_number := 0;
  elsif v_reset = 'monthly'
     and (v_last_reset is null or date_trunc('month', v_last_reset) <> date_trunc('month', now())) then
    v_number := 0;
  end if;

  v_number := v_number + 1;

  update public.document_number_sequences
    set current_number = v_number,
        last_reset_at  = now()::date
    where doc_type = p_doc_type;

  v_period_key := case v_reset
    when 'yearly'  then to_char(now(), 'YY')
    when 'monthly' then to_char(now(), 'YYMM')
    else ''
  end;

  return v_prefix || v_period_key || '-' || lpad(v_number::text, 4, '0');
end;
$$;

insert into public.document_number_sequences (doc_type, prefix, reset_period) values
  ('quotation',         'QT',     'yearly'),
  ('sales_order',       'SO',     'yearly'),
  ('invoice',           'INV',    'yearly'),
  ('receipt',           'RC',     'yearly'),
  ('tax_invoice',       'TX',     'yearly'),
  ('sales_return',      'SR',     'yearly'),
  ('purchase_request',  'PR',     'yearly'),
  ('purchase_order',    'PO',     'yearly'),
  ('goods_receipt',     'GR',     'yearly'),
  ('purchase_bill',     'PB',     'yearly'),
  ('ap_payment',        'PV',     'yearly'),
  ('payroll_run',       'PAY',    'monthly');

-- ---------------------------------------------------------------------------
-- Products (simplified placeholder)
-- Sales order items and purchase order items both need a product to point
-- to. Full inventory behaviour (stock movements, lots, expiry, warehouses)
-- belongs to module 3 (Inventory) and will replace/extend this table later
-- -- do not build stock-tracking logic against this table yet.
-- ---------------------------------------------------------------------------
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null unique,
  barcode      text,
  name         text not null,
  unit         text not null default 'ชิ้น',
  product_type text not null default 'finished_good'
               check (product_type in ('raw_material', 'finished_good', 'service')),
  cost_price   numeric(14, 2) not null default 0,
  sale_price   numeric(14, 2) not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index idx_products_active on public.products (is_active);
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
