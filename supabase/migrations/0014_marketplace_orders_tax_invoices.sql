-- ============================================================================
-- 0014_marketplace_orders_tax_invoices.sql
-- นำเข้าออเดอร์จาก Shopee / Lazada / TikTok / ช่องทางอื่น แล้วออก
-- ใบเสร็จรับเงิน/ใบกำกับภาษี (เต็มรูป) แยกตาม order หรือรวมหลาย order
--
-- Conventions (standard Thai e-commerce practice):
--   * Marketplace prices include VAT 7%  -> vat = total * 7 / 107
--   * Tax-invoice value = goods price minus the SELLER-funded discount.
--     Platform-funded vouchers/coins are paid to us by the platform, so they
--     are recorded (platform_discount) but not deducted.
--   * Shipping the buyer pays on a marketplace goes to the platform/carrier
--     and is not our revenue -> left off the tax invoice. On direct channels
--     (website / LINE / หน้าร้าน) we collect it, so it becomes a line item.
--   * A tax invoice is never deleted -- only cancelled (number not reused),
--     after which the orders can be issued again.
--   * Several orders can share one tax invoice only when they belong to the
--     same calendar month (the tax point month).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Channels: which ones are marketplaces (platform collects the shipping fee)
-- ---------------------------------------------------------------------------
alter table public.sales_channels
  add column is_marketplace boolean not null default false;

update public.sales_channels set is_marketplace = true where code in ('shopee', 'lazada', 'tiktok');

insert into public.sales_channels (code, name) values
  ('line', 'LINE OA'),
  ('facebook', 'Facebook')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Import batches (one row per uploaded file)
-- ---------------------------------------------------------------------------
create table public.order_imports (
  id               uuid primary key default gen_random_uuid(),
  sales_channel_id uuid not null references public.sales_channels (id),
  file_name        text,
  order_count      integer not null default 0,
  inserted_count   integer not null default 0,
  updated_count    integer not null default 0,
  locked_count     integer not null default 0,
  imported_by      uuid references public.employees (id),
  created_at       timestamptz not null default now()
);

create index idx_order_imports_created on public.order_imports (created_at desc);

-- ---------------------------------------------------------------------------
-- Sales orders: platform order id + buyer snapshot taken at order time
-- ---------------------------------------------------------------------------
alter table public.sales_orders
  alter column customer_id drop not null,
  add column external_order_id  text,
  add column external_status    text,
  add column order_import_id    uuid references public.order_imports (id) on delete set null,
  add column buyer_username     text,
  add column buyer_name         text,
  add column buyer_phone        text,
  add column shipping_address   text,
  add column platform_discount  numeric(14, 2) not null default 0,
  add column prices_include_vat boolean not null default true,
  -- What the buyer typed when requesting a tax invoice (Lazada export / our
  -- template). Empty = no request; the tax invoice falls back to the
  -- shipping name/address.
  add column billing_name       text,
  add column billing_tax_id     text,
  add column billing_branch     text,
  add column billing_address    text;

-- Re-importing the same export must update, never duplicate.
create unique index uq_sales_orders_channel_external
  on public.sales_orders (sales_channel_id, external_order_id)
  where external_order_id is not null;

create index idx_sales_orders_order_date on public.sales_orders (order_date desc);
create index idx_sales_orders_buyer_name_trgm on public.sales_orders using gin (buyer_name gin_trgm_ops);

alter table public.sales_order_items
  add column external_sku text;

-- ---------------------------------------------------------------------------
-- Tax invoices: no longer require an invoice (marketplace orders are paid
-- up-front), keep their own item snapshot, and may cover several orders.
-- ---------------------------------------------------------------------------
alter table public.tax_invoices
  alter column invoice_id drop not null,
  add column customer_id      uuid references public.customers (id),
  add column buyer_branch     text,          -- 'สำนักงานใหญ่' / 'สาขา 00001' -- required for VAT-registered buyers
  add column buyer_phone      text,
  add column subtotal         numeric(14, 2) not null default 0,  -- sum of lines (incl. VAT)
  add column discount_amount  numeric(14, 2) not null default 0,  -- seller-funded order discount
  add column note             text,
  add column cancelled_at     timestamptz,
  add column cancel_reason    text,
  add column created_by       uuid references public.employees (id);

create index idx_tax_invoices_issue_date on public.tax_invoices (issue_date desc);

create table public.tax_invoice_orders (
  tax_invoice_id uuid not null references public.tax_invoices (id) on delete cascade,
  sales_order_id uuid not null references public.sales_orders (id) on delete restrict,
  primary key (tax_invoice_id, sales_order_id)
);

create index idx_tax_invoice_orders_order on public.tax_invoice_orders (sales_order_id);

create table public.tax_invoice_items (
  id              uuid primary key default gen_random_uuid(),
  tax_invoice_id  uuid not null references public.tax_invoices (id) on delete cascade,
  product_id      uuid references public.products (id),
  description     text not null,
  quantity        numeric(14, 3) not null default 1,
  unit_price      numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  amount          numeric(14, 2) generated always as (quantity * unit_price - discount_amount) stored,
  sort_order      integer not null default 0
);

create index idx_tax_invoice_items_invoice on public.tax_invoice_items (tax_invoice_id);

-- ---------------------------------------------------------------------------
-- RLS: same as the other sales tables (sales role + admin)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['order_imports', 'tax_invoice_orders', 'tax_invoice_items'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(''sales'')) with check (public.has_role(''sales''));',
      t || '_sales_all', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- import_sales_orders: upsert a parsed export file in one transaction.
--
-- p_orders is a JSON array of
--   { external_order_id, order_date, external_status, status, payment_status,
--     buyer_username, buyer_name, buyer_phone, shipping_address,
--     billing_name, billing_tax_id, billing_branch, billing_address,
--     discount_amount, platform_discount, shipping_fee,
--     items: [{ external_sku, description, quantity, unit_price, discount_amount }] }
--
-- Orders that already have an active tax invoice keep their amounts/items
-- (the issued document must keep matching them); only status is refreshed.
-- ---------------------------------------------------------------------------
create or replace function public.import_sales_orders(
  p_channel_id uuid,
  p_file_name  text,
  p_orders     jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_import_id uuid;
  v_order     jsonb;
  v_item      jsonb;
  v_order_id  uuid;
  v_locked    boolean;
  v_subtotal  numeric(14, 2);
  v_total     numeric(14, 2);
  v_sort      integer;
  v_inserted  integer := 0;
  v_updated   integer := 0;
  v_locked_n  integer := 0;
begin
  insert into order_imports (sales_channel_id, file_name, order_count, imported_by)
  values (p_channel_id, p_file_name, jsonb_array_length(p_orders), current_employee_id())
  returning id into v_import_id;

  for v_order in select * from jsonb_array_elements(p_orders) loop
    v_order_id := null;
    select o.id into v_order_id
      from sales_orders o
      where o.sales_channel_id = p_channel_id
        and o.external_order_id = v_order->>'external_order_id'
      for update;

    v_locked := v_order_id is not null and exists (
      select 1 from tax_invoice_orders tio
      join tax_invoices ti on ti.id = tio.tax_invoice_id
      where tio.sales_order_id = v_order_id and not ti.is_cancelled
    );

    select coalesce(sum(
             coalesce((i->>'quantity')::numeric, 1) * coalesce((i->>'unit_price')::numeric, 0)
             - coalesce((i->>'discount_amount')::numeric, 0)
           ), 0)
      into v_subtotal
      from jsonb_array_elements(v_order->'items') i;
    v_total := v_subtotal - coalesce((v_order->>'discount_amount')::numeric, 0);

    if v_order_id is not null and v_locked then
      update sales_orders set
        status          = coalesce(v_order->>'status', status),
        payment_status  = coalesce(v_order->>'payment_status', payment_status),
        external_status = v_order->>'external_status',
        order_import_id = v_import_id
      where id = v_order_id;
      v_locked_n := v_locked_n + 1;
      continue;
    end if;

    if v_order_id is null then
      insert into sales_orders (sales_channel_id, external_order_id, order_date, created_by)
      values (
        p_channel_id,
        v_order->>'external_order_id',
        coalesce((v_order->>'order_date')::date, current_date),
        current_employee_id()
      )
      returning id into v_order_id;
      v_inserted := v_inserted + 1;
    else
      delete from sales_order_items where sales_order_id = v_order_id;
      v_updated := v_updated + 1;
    end if;

    update sales_orders set
      order_date        = coalesce((v_order->>'order_date')::date, order_date),
      status            = coalesce(v_order->>'status', 'confirmed'),
      payment_status    = coalesce(v_order->>'payment_status', 'paid'),
      external_status   = v_order->>'external_status',
      order_import_id   = v_import_id,
      buyer_username    = v_order->>'buyer_username',
      buyer_name        = v_order->>'buyer_name',
      buyer_phone       = v_order->>'buyer_phone',
      shipping_address  = v_order->>'shipping_address',
      billing_name      = v_order->>'billing_name',
      billing_tax_id    = v_order->>'billing_tax_id',
      billing_branch    = v_order->>'billing_branch',
      billing_address   = v_order->>'billing_address',
      subtotal          = v_subtotal,
      discount_amount   = coalesce((v_order->>'discount_amount')::numeric, 0),
      platform_discount = coalesce((v_order->>'platform_discount')::numeric, 0),
      shipping_fee      = coalesce((v_order->>'shipping_fee')::numeric, 0),
      total_amount      = v_total,
      vat_amount        = round(v_total * 7 / 107, 2),
      prices_include_vat = true
    where id = v_order_id;

    v_sort := 0;
    for v_item in select * from jsonb_array_elements(v_order->'items') loop
      insert into sales_order_items (
        sales_order_id, product_id, external_sku, description,
        quantity, unit_price, discount_amount, sort_order
      )
      values (
        v_order_id,
        (select p.id from products p where p.sku = v_item->>'external_sku' limit 1),
        v_item->>'external_sku',
        v_item->>'description',
        coalesce((v_item->>'quantity')::numeric, 1),
        coalesce((v_item->>'unit_price')::numeric, 0),
        coalesce((v_item->>'discount_amount')::numeric, 0),
        v_sort
      );
      v_sort := v_sort + 1;
    end loop;
  end loop;

  update order_imports set
    inserted_count = v_inserted,
    updated_count  = v_updated,
    locked_count   = v_locked_n
  where id = v_import_id;

  return jsonb_build_object(
    'import_id', v_import_id,
    'inserted', v_inserted,
    'updated', v_updated,
    'locked', v_locked_n
  );
end;
$$;

grant execute on function public.import_sales_orders(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- issue_tax_invoice: one tax invoice covering one or more orders.
-- Copies the order lines (product name when the SKU is mapped), adds a
-- shipping line for non-marketplace orders, and refuses orders that are
-- cancelled, already covered by an active tax invoice, or span months.
-- ---------------------------------------------------------------------------
create or replace function public.issue_tax_invoice(
  p_order_ids     uuid[],
  p_issue_date    date,
  p_buyer_name    text,
  p_buyer_tax_id  text,
  p_buyer_branch  text,
  p_buyer_address text,
  p_buyer_phone   text,
  p_customer_id   uuid default null,
  p_note          text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id        uuid;
  v_count     integer;
  v_months    integer;
  v_subtotal  numeric(14, 2);
  v_discount  numeric(14, 2);
  v_total     numeric(14, 2);
begin
  if coalesce(array_length(p_order_ids, 1), 0) = 0 then
    raise exception 'ไม่ได้เลือกออเดอร์';
  end if;
  if coalesce(trim(p_buyer_name), '') = '' then
    raise exception 'กรุณากรอกชื่อผู้ซื้อ';
  end if;
  if p_buyer_tax_id is not null and p_buyer_tax_id !~ '^[0-9]{13}$' then
    raise exception 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก';
  end if;

  -- Lock the orders so two people can't issue for the same order at once.
  perform 1 from sales_orders where id = any(p_order_ids) for update;

  select count(*), count(distinct date_trunc('month', order_date))
    into v_count, v_months
    from sales_orders where id = any(p_order_ids);

  if v_count <> array_length(p_order_ids, 1) then
    raise exception 'ไม่พบออเดอร์บางรายการ';
  end if;
  if v_months > 1 then
    raise exception 'รวมเป็นใบเดียวได้เฉพาะออเดอร์ในเดือนเดียวกัน';
  end if;
  if exists (select 1 from sales_orders where id = any(p_order_ids) and status = 'cancelled') then
    raise exception 'มีออเดอร์ที่ถูกยกเลิกอยู่ในรายการ';
  end if;
  if exists (
    select 1 from tax_invoice_orders tio
    join tax_invoices ti on ti.id = tio.tax_invoice_id
    where tio.sales_order_id = any(p_order_ids) and not ti.is_cancelled
  ) then
    raise exception 'มีออเดอร์ที่ออกใบกำกับภาษีไปแล้ว';
  end if;

  insert into tax_invoices (
    issue_date, customer_id, buyer_name, buyer_tax_id, buyer_branch,
    buyer_address, buyer_phone, note, created_by
  )
  values (
    coalesce(p_issue_date, current_date), p_customer_id, trim(p_buyer_name),
    nullif(trim(p_buyer_tax_id), ''), nullif(trim(p_buyer_branch), ''),
    nullif(trim(p_buyer_address), ''), nullif(trim(p_buyer_phone), ''),
    nullif(trim(p_note), ''), current_employee_id()
  )
  returning id into v_id;

  insert into tax_invoice_orders (tax_invoice_id, sales_order_id)
  select v_id, unnest(p_order_ids);

  insert into tax_invoice_items (
    tax_invoice_id, product_id, description, quantity, unit_price, discount_amount, sort_order
  )
  select v_id, i.product_id, coalesce(p.name, i.description, '-'),
         i.quantity, i.unit_price, i.discount_amount,
         row_number() over (order by o.order_date, o.order_number, i.sort_order)
    from sales_order_items i
    join sales_orders o on o.id = i.sales_order_id
    left join products p on p.id = i.product_id
   where o.id = any(p_order_ids);

  -- Shipping we collected ourselves (direct channels) is part of the sale.
  insert into tax_invoice_items (tax_invoice_id, description, quantity, unit_price, sort_order)
  select v_id, 'ค่าจัดส่ง', 1, sum(o.shipping_fee), 100000
    from sales_orders o
    join sales_channels c on c.id = o.sales_channel_id
   where o.id = any(p_order_ids) and not c.is_marketplace and o.shipping_fee > 0
  having sum(o.shipping_fee) > 0;

  select coalesce(sum(amount), 0) into v_subtotal from tax_invoice_items where tax_invoice_id = v_id;
  select coalesce(sum(discount_amount), 0) into v_discount from sales_orders where id = any(p_order_ids);
  v_total := v_subtotal - v_discount;

  update tax_invoices set
    subtotal        = v_subtotal,
    discount_amount = v_discount,
    total_amount    = v_total,
    vat_amount      = round(v_total * 7 / 107, 2)
  where id = v_id;

  return v_id;
end;
$$;

grant execute on function public.issue_tax_invoice(uuid[], date, text, text, text, text, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- List views (security_invoker so the underlying tables' RLS still applies)
-- ---------------------------------------------------------------------------

-- Orders + channel + the active tax invoice covering them (if any).
create view public.sales_order_list with (security_invoker = true) as
select o.*,
       c.code           as channel_code,
       c.name           as channel_name,
       c.is_marketplace as is_marketplace,
       t.id             as tax_invoice_id,
       t.tax_invoice_number,
       i.item_summary
  from public.sales_orders o
  left join public.sales_channels c on c.id = o.sales_channel_id
  left join lateral (
    select string_agg(coalesce(it.description, '-') || ' ×' || trim_scale(it.quantity)::text, ', '
                      order by it.sort_order) as item_summary
      from public.sales_order_items it
     where it.sales_order_id = o.id
  ) i on true
  left join lateral (
    select ti.id, ti.tax_invoice_number
      from public.tax_invoice_orders tio
      join public.tax_invoices ti on ti.id = tio.tax_invoice_id
     where tio.sales_order_id = o.id and not ti.is_cancelled
     limit 1
  ) t on true;

-- Tax invoices + the orders they cover, as display strings.
create view public.tax_invoice_list with (security_invoker = true) as
select ti.*,
       r.order_count,
       r.order_refs,
       r.channel_names
  from public.tax_invoices ti
  left join lateral (
    select count(*)::int as order_count,
           string_agg(coalesce(o.external_order_id, o.order_number), ', '
                      order by o.order_date, o.order_number) as order_refs,
           string_agg(distinct c.name, ', ') as channel_names
      from public.tax_invoice_orders tio
      join public.sales_orders o on o.id = tio.sales_order_id
      left join public.sales_channels c on c.id = o.sales_channel_id
     where tio.tax_invoice_id = ti.id
  ) r on true;

grant select on public.sales_order_list to authenticated;
grant select on public.tax_invoice_list to authenticated;
