-- ============================================================================
-- 0019_inventory_production.sql
-- Module 3: คลังสินค้า & การผลิต (Inventory & Production)
--
--  * New role `warehouse` (ฝ่ายผลิต / คลังสินค้า) -- manages products, stock
--    and production orders. Admin has it implicitly, like every role.
--  * stock_movements is the stock ledger: every in / out / count adjustment /
--    production receipt is one signed row, and on-hand = sum(quantity).
--    Rows are never edited or deleted -- mistakes are corrected with a new
--    movement (or by cancelling the production receipt, which posts the
--    reversing rows), so the stock card always adds up.
--  * production_orders (ใบผลิตสินค้า) list what is to be produced; finished
--    goods can be received in several lots (production_receipts), each one
--    posting stock in. An order is open -> partial -> completed, or closed
--    short when the rest won't be produced.
--  * Stock can't go below zero through these RPCs: issuing, cancelling a
--    receipt or a count all check the balance under a per-product lock.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Role
-- ---------------------------------------------------------------------------
alter table public.user_roles drop constraint user_roles_roles_check;
alter table public.user_roles add constraint user_roles_roles_check
  check (roles <@ array['admin', 'sales', 'purchase', 'hr', 'warehouse']::text[]);

-- ---------------------------------------------------------------------------
-- 2. Products: reorder point, and the warehouse team may now maintain them
--    (0006 left products admin-only until this module existed).
-- ---------------------------------------------------------------------------
alter table public.products
  add column min_stock numeric(14, 3) not null default 0 check (min_stock >= 0),
  add column note      text;

drop policy if exists products_insert_admin on public.products;
drop policy if exists products_update_admin on public.products;
drop policy if exists products_delete_admin on public.products;
create policy products_insert_warehouse on public.products
  for insert to authenticated with check (public.has_role('warehouse'));
create policy products_update_warehouse on public.products
  for update to authenticated using (public.has_role('warehouse')) with check (public.has_role('warehouse'));
create policy products_delete_warehouse on public.products
  for delete to authenticated using (public.has_role('warehouse'));

-- ---------------------------------------------------------------------------
-- 3. Document numbers: MO26-0001 (ใบผลิต), FG26-0001 (ใบรับสินค้าจากการผลิต)
-- ---------------------------------------------------------------------------
insert into public.document_number_sequences (doc_type, prefix, reset_period) values
  ('production_order',   'MO', 'yearly'),
  ('production_receipt', 'FG', 'yearly')
on conflict (doc_type) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Production orders
-- ---------------------------------------------------------------------------
create table public.production_orders (
  id                 uuid primary key default gen_random_uuid(),
  production_number  text not null unique default public.next_document_number('production_order'),
  order_date         date not null default current_date,
  due_date           date,
  producer_name      text,                       -- ผู้ผลิต / โรงงาน (in-house or OEM)
  status             text not null default 'open'
                     check (status in ('open', 'partial', 'completed', 'closed', 'cancelled')),
  note               text,
  closed_at          timestamptz,                -- closed short or cancelled
  closed_by_email    text,
  close_reason       text,
  created_by_email   text default (auth.jwt() ->> 'email'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger trg_production_orders_updated_at
  before update on public.production_orders
  for each row execute function public.set_updated_at();

create index idx_production_orders_status on public.production_orders (status);
create index idx_production_orders_date on public.production_orders (order_date desc);

-- One line per product per order; received_quantity is maintained by the RPCs
-- below from the non-cancelled receipts.
create table public.production_order_items (
  id                   uuid primary key default gen_random_uuid(),
  production_order_id  uuid not null references public.production_orders (id) on delete cascade,
  product_id           uuid not null references public.products (id) on delete restrict,
  quantity             numeric(14, 3) not null check (quantity > 0),
  received_quantity    numeric(14, 3) not null default 0 check (received_quantity >= 0),
  sort_order           integer not null default 0,
  unique (production_order_id, product_id)
);

create index idx_production_order_items_product on public.production_order_items (product_id);

create table public.production_receipts (
  id                   uuid primary key default gen_random_uuid(),
  receipt_number       text not null unique default public.next_document_number('production_receipt'),
  production_order_id  uuid not null references public.production_orders (id) on delete restrict,
  receipt_date         date not null default current_date,
  note                 text,
  is_cancelled         boolean not null default false,
  cancelled_at         timestamptz,
  cancelled_by_email   text,
  cancel_reason        text,
  created_by_email     text default (auth.jwt() ->> 'email'),
  created_at           timestamptz not null default now()
);

create index idx_production_receipts_order on public.production_receipts (production_order_id);

create table public.production_receipt_items (
  id                        uuid primary key default gen_random_uuid(),
  production_receipt_id     uuid not null references public.production_receipts (id) on delete cascade,
  production_order_item_id  uuid not null references public.production_order_items (id) on delete restrict,
  product_id                uuid not null references public.products (id) on delete restrict,
  quantity                  numeric(14, 3) not null check (quantity > 0),
  lot_number                text,
  expiry_date               date
);

create index idx_production_receipt_items_receipt on public.production_receipt_items (production_receipt_id);
create index idx_production_receipt_items_order_item on public.production_receipt_items (production_order_item_id);

-- ---------------------------------------------------------------------------
-- 5. Stock ledger
--    in         รับเข้า (+)
--    out        เบิก / ตัดออก (-)
--    adjust     ปรับยอดจากการนับสต๊อก (+/-)
--    production รับจากการผลิต (+), or its reversal when a receipt is cancelled (-)
-- ---------------------------------------------------------------------------
create table public.stock_movements (
  id                     uuid primary key default gen_random_uuid(),
  movement_date          date not null default current_date,
  product_id             uuid not null references public.products (id) on delete restrict,
  movement_type          text not null check (movement_type in ('in', 'out', 'adjust', 'production')),
  quantity               numeric(14, 3) not null check (quantity <> 0),
  lot_number             text,
  expiry_date            date,
  ref_no                 text,                   -- เลขที่อ้างอิง: ใบส่งของ / ใบรับ / ออเดอร์ ...
  note                   text,
  production_receipt_id  uuid references public.production_receipts (id) on delete restrict,
  created_by_email       text default (auth.jwt() ->> 'email'),
  created_at             timestamptz not null default now()
);

create index idx_stock_movements_product on public.stock_movements (product_id, movement_date, created_at);
create index idx_stock_movements_date on public.stock_movements (movement_date desc, created_at desc);
create index idx_stock_movements_receipt on public.stock_movements (production_receipt_id);

-- ---------------------------------------------------------------------------
-- 6. RLS: warehouse role (+ admin). The ledger is insert-only.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['production_orders', 'production_order_items', 'production_receipts', 'production_receipt_items'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(''warehouse'')) with check (public.has_role(''warehouse''));',
      t || '_warehouse_all', t
    );
  end loop;
end $$;

alter table public.stock_movements enable row level security;
create policy stock_movements_warehouse_select on public.stock_movements
  for select to authenticated using (public.has_role('warehouse'));
create policy stock_movements_warehouse_insert on public.stock_movements
  for insert to authenticated with check (public.has_role('warehouse'));

-- The ledger records who/when on every row itself and is never changed, so
-- only the documents around it go to the audit log.
select public.enable_audit('public.production_orders');
select public.enable_audit('public.production_order_items');
select public.enable_audit('public.production_receipts');

-- ---------------------------------------------------------------------------
-- 7. product_stock: products + on-hand + quantity still to come from open
--    production orders. security_invoker so the ledger's RLS still applies.
-- ---------------------------------------------------------------------------
create view public.product_stock with (security_invoker = true) as
select p.*,
       coalesce(s.on_hand, 0)::numeric(14, 3)       as on_hand,
       coalesce(w.in_production, 0)::numeric(14, 3) as in_production,
       s.last_movement_date
  from public.products p
  left join (
    select product_id, sum(quantity) as on_hand, max(movement_date) as last_movement_date
      from public.stock_movements
     group by product_id
  ) s on s.product_id = p.id
  left join (
    select i.product_id, sum(greatest(i.quantity - i.received_quantity, 0)) as in_production
      from public.production_order_items i
      join public.production_orders o on o.id = i.production_order_id
     where o.status in ('open', 'partial')
     group by i.product_id
  ) w on w.product_id = p.id;

grant select on public.product_stock to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Helpers
-- ---------------------------------------------------------------------------

-- Serialize stock checks per product for the rest of the transaction (sorted,
-- so two transactions touching the same products can't deadlock).
create or replace function public._lock_products(p_ids uuid[])
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  for v_id in select distinct x from unnest(p_ids) x order by x loop
    perform pg_advisory_xact_lock(hashtext('stock:' || v_id::text));
  end loop;
end;
$$;

create or replace function public._stock_on_hand(p_product_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(quantity), 0) from stock_movements where product_id = p_product_id;
$$;

-- Raises if taking p_qty out of the product would leave less than zero.
create or replace function public._assert_stock_available(p_product_id uuid, p_qty numeric)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_on_hand numeric := public._stock_on_hand(p_product_id);
  v_name    text;
begin
  if v_on_hand - p_qty < 0 then
    select coalesce(sku || ' ' || name, name) into v_name from products where id = p_product_id;
    raise exception 'สต๊อก % ไม่พอ (คงเหลือ %, ต้องการ %)', v_name, trim_scale(v_on_hand), trim_scale(p_qty);
  end if;
end;
$$;

-- Status from received quantities; closed / cancelled orders keep theirs.
create or replace function public._refresh_production_status(p_order_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_all_done boolean;
  v_any      boolean;
begin
  select bool_and(received_quantity >= quantity), bool_or(received_quantity > 0)
    into v_all_done, v_any
    from production_order_items
   where production_order_id = p_order_id;

  update production_orders
     set status = case when v_all_done then 'completed' when v_any then 'partial' else 'open' end
   where id = p_order_id
     and status in ('open', 'partial', 'completed');
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. save_production_order: create (p_id null) or edit.
--    p_header { order_date, due_date, producer_name, note }
--    p_items  [{ product_id, quantity }]
--    Editing an order that has receipts: a product already received can't be
--    removed, and its quantity can't drop below what was received.
-- ---------------------------------------------------------------------------
create or replace function public.save_production_order(p_id uuid, p_header jsonb, p_items jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id     uuid := p_id;
  v_status text;
  v_bad    text;
begin
  if not public.has_role('warehouse') then
    raise exception 'ไม่มีสิทธิ์จัดการใบผลิต';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'กรุณาใส่สินค้าที่จะผลิตอย่างน้อย 1 รายการ';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
     where nullif(e ->> 'product_id', '') is null or coalesce((e ->> 'quantity')::numeric, 0) <= 0
  ) then
    raise exception 'ทุกรายการต้องเลือกสินค้าในระบบ และจำนวนต้องมากกว่า 0';
  end if;
  if (select count(*) <> count(distinct e ->> 'product_id') from jsonb_array_elements(p_items) e) then
    raise exception 'มีสินค้าซ้ำกันในใบเดียว — รวมเป็นรายการเดียว';
  end if;
  if nullif(p_header ->> 'due_date', '') is not null
     and (p_header ->> 'due_date')::date < coalesce(nullif(p_header ->> 'order_date', '')::date, current_date) then
    raise exception 'วันที่ต้องการต้องไม่ก่อนวันที่สั่งผลิต';
  end if;

  if v_id is null then
    insert into production_orders (order_date, due_date, producer_name, note)
    values (
      coalesce(nullif(p_header ->> 'order_date', '')::date, current_date),
      nullif(p_header ->> 'due_date', '')::date,
      nullif(trim(p_header ->> 'producer_name'), ''),
      nullif(trim(p_header ->> 'note'), '')
    )
    returning id into v_id;
  else
    select status into v_status from production_orders where id = v_id for update;
    if not found then
      raise exception 'ไม่พบใบผลิต';
    end if;
    if v_status not in ('open', 'partial') then
      raise exception 'ใบผลิตที่ปิดหรือยกเลิกแล้วแก้ไขไม่ได้';
    end if;

    select coalesce(p.sku || ' ' || p.name, p.name) into v_bad
      from production_order_items i
      join products p on p.id = i.product_id
     where i.production_order_id = v_id
       and i.received_quantity > 0
       and not exists (
         select 1 from jsonb_array_elements(p_items) e
          where (e ->> 'product_id')::uuid = i.product_id
            and (e ->> 'quantity')::numeric >= i.received_quantity
       )
     limit 1;
    if v_bad is not null then
      raise exception 'ลบ % หรือลดจำนวนให้น้อยกว่าที่รับเข้าแล้วไม่ได้', v_bad;
    end if;

    update production_orders
       set order_date    = coalesce(nullif(p_header ->> 'order_date', '')::date, order_date),
           due_date      = nullif(p_header ->> 'due_date', '')::date,
           producer_name = nullif(trim(p_header ->> 'producer_name'), ''),
           note          = nullif(trim(p_header ->> 'note'), '')
     where id = v_id;

    delete from production_order_items i
     where i.production_order_id = v_id
       and not exists (select 1 from jsonb_array_elements(p_items) e where (e ->> 'product_id')::uuid = i.product_id);
  end if;

  insert into production_order_items (production_order_id, product_id, quantity, sort_order)
  select v_id, (e ->> 'product_id')::uuid, (e ->> 'quantity')::numeric, (o.n - 1)::int
    from jsonb_array_elements(p_items) with ordinality o(e, n)
  on conflict (production_order_id, product_id)
  do update set quantity = excluded.quantity, sort_order = excluded.sort_order;

  perform public._refresh_production_status(v_id);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. receive_production: receive part (or all) of an order into stock.
--     p_lines [{ item_id, quantity, lot_number, expiry_date }] -- lines with
--     quantity 0/blank are skipped; each line can't exceed what's still due.
-- ---------------------------------------------------------------------------
create or replace function public.receive_production(p_order_id uuid, p_date date, p_note text, p_lines jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_order   production_orders%rowtype;
  v_receipt production_receipts%rowtype;
  v_line    record;
  v_count   integer := 0;
begin
  if not public.has_role('warehouse') then
    raise exception 'ไม่มีสิทธิ์รับสินค้าเข้าคลัง';
  end if;

  select * into v_order from production_orders where id = p_order_id for update;
  if not found then
    raise exception 'ไม่พบใบผลิต';
  end if;
  if v_order.status not in ('open', 'partial') then
    raise exception 'ใบผลิตนี้ปิดแล้ว รับสินค้าเพิ่มไม่ได้';
  end if;
  if (select count(*) <> count(distinct e ->> 'item_id') from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) e) then
    raise exception 'มีรายการซ้ำในการรับครั้งเดียว';
  end if;

  insert into production_receipts (production_order_id, receipt_date, note)
  values (p_order_id, coalesce(p_date, current_date), nullif(trim(p_note), ''))
  returning * into v_receipt;

  for v_line in
    select i.id as item_id, i.product_id, i.quantity as ordered, i.received_quantity as received,
           (e ->> 'quantity')::numeric as qty,
           nullif(trim(e ->> 'lot_number'), '') as lot_number,
           nullif(e ->> 'expiry_date', '')::date as expiry_date,
           coalesce(p.sku || ' ' || p.name, p.name) as product_label
      from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) e
      join production_order_items i
        on i.id = (e ->> 'item_id')::uuid and i.production_order_id = p_order_id
      join products p on p.id = i.product_id
     where coalesce(nullif(e ->> 'quantity', '')::numeric, 0) <> 0
  loop
    if v_line.qty < 0 then
      raise exception 'จำนวนรับของ % ต้องมากกว่า 0', v_line.product_label;
    end if;
    if v_line.received + v_line.qty > v_line.ordered then
      raise exception '% รับเกินจำนวนที่สั่งผลิต (ค้างรับ %) — ถ้าผลิตได้เกิน ให้แก้จำนวนในใบผลิตก่อน',
        v_line.product_label, trim_scale(v_line.ordered - v_line.received);
    end if;

    insert into production_receipt_items
      (production_receipt_id, production_order_item_id, product_id, quantity, lot_number, expiry_date)
    values (v_receipt.id, v_line.item_id, v_line.product_id, v_line.qty, v_line.lot_number, v_line.expiry_date);

    update production_order_items set received_quantity = received_quantity + v_line.qty where id = v_line.item_id;

    insert into stock_movements
      (movement_date, product_id, movement_type, quantity, lot_number, expiry_date, ref_no, production_receipt_id)
    values (v_receipt.receipt_date, v_line.product_id, 'production', v_line.qty, v_line.lot_number,
            v_line.expiry_date, v_receipt.receipt_number || ' / ' || v_order.production_number, v_receipt.id);

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'กรุณาใส่จำนวนที่รับอย่างน้อย 1 รายการ';
  end if;

  perform public._refresh_production_status(p_order_id);
  return v_receipt.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. cancel_production_receipt: posts the reversing stock rows and gives the
--     quantity back to the order (a completed order becomes partial again).
-- ---------------------------------------------------------------------------
create or replace function public.cancel_production_receipt(p_receipt_id uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_receipt production_receipts%rowtype;
  v_status  text;
  v_item    record;
begin
  if not public.has_role('warehouse') then
    raise exception 'ไม่มีสิทธิ์ยกเลิกการรับสินค้า';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'กรุณาระบุเหตุผลที่ยกเลิก';
  end if;

  select * into v_receipt from production_receipts where id = p_receipt_id;
  if not found then
    raise exception 'ไม่พบใบรับสินค้า';
  end if;
  select status into v_status from production_orders where id = v_receipt.production_order_id for update;
  -- re-read under the order lock so two cancels can't both pass
  select * into v_receipt from production_receipts where id = p_receipt_id;
  if v_receipt.is_cancelled then
    raise exception 'ใบรับนี้ยกเลิกไปแล้ว';
  end if;
  if v_status = 'cancelled' then
    raise exception 'ใบผลิตถูกยกเลิกแล้ว';
  end if;

  perform public._lock_products(array(
    select product_id from production_receipt_items where production_receipt_id = p_receipt_id));

  for v_item in
    select product_id, production_order_item_id, quantity, lot_number, expiry_date
      from production_receipt_items
     where production_receipt_id = p_receipt_id
  loop
    perform public._assert_stock_available(v_item.product_id, v_item.quantity);

    update production_order_items
       set received_quantity = greatest(received_quantity - v_item.quantity, 0)
     where id = v_item.production_order_item_id;

    insert into stock_movements
      (product_id, movement_type, quantity, lot_number, expiry_date, ref_no, note, production_receipt_id)
    values (v_item.product_id, 'production', -v_item.quantity, v_item.lot_number, v_item.expiry_date,
            v_receipt.receipt_number, 'ยกเลิกการรับ: ' || trim(p_reason), p_receipt_id);
  end loop;

  update production_receipts
     set is_cancelled = true,
         cancelled_at = now(),
         cancelled_by_email = auth.jwt() ->> 'email',
         cancel_reason = trim(p_reason)
   where id = p_receipt_id;

  perform public._refresh_production_status(v_receipt.production_order_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. set_production_order_status
--     close   ปิดใบ -- the rest won't be produced (open / partial)
--     reopen  เปิดใบอีกครั้ง (closed)
--     cancel  ยกเลิกใบ -- only while nothing has been received
-- ---------------------------------------------------------------------------
create or replace function public.set_production_order_status(p_id uuid, p_action text, p_reason text default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.has_role('warehouse') then
    raise exception 'ไม่มีสิทธิ์จัดการใบผลิต';
  end if;
  select status into v_status from production_orders where id = p_id for update;
  if not found then
    raise exception 'ไม่พบใบผลิต';
  end if;

  if p_action = 'close' then
    if v_status not in ('open', 'partial') then
      raise exception 'ปิดได้เฉพาะใบผลิตที่ยังรับไม่ครบ';
    end if;
    update production_orders
       set status = 'closed', closed_at = now(), closed_by_email = auth.jwt() ->> 'email',
           close_reason = nullif(trim(p_reason), '')
     where id = p_id;
  elsif p_action = 'reopen' then
    if v_status <> 'closed' then
      raise exception 'เปิดใหม่ได้เฉพาะใบผลิตที่ปิดไว้';
    end if;
    update production_orders
       set status = 'open', closed_at = null, closed_by_email = null, close_reason = null
     where id = p_id;
    perform public._refresh_production_status(p_id);
  elsif p_action = 'cancel' then
    if v_status in ('cancelled', 'completed') then
      raise exception 'ใบผลิตนี้ยกเลิกไม่ได้';
    end if;
    if exists (select 1 from production_receipts where production_order_id = p_id and not is_cancelled) then
      raise exception 'มีการรับสินค้าเข้าคลังแล้ว — ยกเลิกใบรับก่อน หรือใช้ "ปิดใบ" แทน';
    end if;
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'กรุณาระบุเหตุผลที่ยกเลิก';
    end if;
    update production_orders
       set status = 'cancelled', closed_at = now(), closed_by_email = auth.jwt() ->> 'email',
           close_reason = trim(p_reason)
     where id = p_id;
  else
    raise exception 'คำสั่งไม่ถูกต้อง: %', p_action;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. post_stock_movements: manual รับเข้า ('in') / เบิกออก ('out').
--     p_lines [{ product_id, quantity, lot_number, expiry_date, note }]
--     quantity is always entered positive; 'out' is stored negative.
-- ---------------------------------------------------------------------------
create or replace function public.post_stock_movements(
  p_type text, p_date date, p_ref_no text, p_note text, p_lines jsonb
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_line  record;
  v_count integer := 0;
begin
  if not public.has_role('warehouse') then
    raise exception 'ไม่มีสิทธิ์บันทึกสินค้าเข้า-ออก';
  end if;
  if p_type not in ('in', 'out') then
    raise exception 'ประเภทรายการไม่ถูกต้อง';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'กรุณาใส่สินค้าอย่างน้อย 1 รายการ';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_lines) e
     where nullif(e ->> 'product_id', '') is null or coalesce((e ->> 'quantity')::numeric, 0) <= 0
  ) then
    raise exception 'ทุกรายการต้องเลือกสินค้าในระบบ และจำนวนต้องมากกว่า 0';
  end if;

  if p_type = 'out' then
    perform public._lock_products(array(select (e ->> 'product_id')::uuid from jsonb_array_elements(p_lines) e));
    -- the same product on several lines is checked against their total
    for v_line in
      select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'quantity')::numeric) as qty
        from jsonb_array_elements(p_lines) e
       group by 1
    loop
      perform public._assert_stock_available(v_line.product_id, v_line.qty);
    end loop;
  end if;

  insert into stock_movements (movement_date, product_id, movement_type, quantity, lot_number, expiry_date, ref_no, note)
  select coalesce(p_date, current_date),
         (e ->> 'product_id')::uuid,
         p_type,
         case when p_type = 'out' then -1 else 1 end * (e ->> 'quantity')::numeric,
         nullif(trim(e ->> 'lot_number'), ''),
         nullif(e ->> 'expiry_date', '')::date,
         nullif(trim(p_ref_no), ''),
         coalesce(nullif(trim(e ->> 'note'), ''), nullif(trim(p_note), ''))
    from jsonb_array_elements(p_lines) e;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. post_stock_count: นับสต๊อก. For each counted product, posts an 'adjust'
--     row for the difference between the count and the current balance.
--     p_lines [{ product_id, counted }]. Returns how many were adjusted.
-- ---------------------------------------------------------------------------
create or replace function public.post_stock_count(p_date date, p_note text, p_lines jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_line    record;
  v_on_hand numeric;
  v_count   integer := 0;
begin
  if not public.has_role('warehouse') then
    raise exception 'ไม่มีสิทธิ์ปรับยอดสต๊อก';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'ยังไม่ได้กรอกจำนวนที่นับได้';
  end if;
  if exists (select 1 from jsonb_array_elements(p_lines) e where coalesce((e ->> 'counted')::numeric, -1) < 0) then
    raise exception 'จำนวนที่นับได้ต้องไม่ติดลบ';
  end if;
  if (select count(*) <> count(distinct e ->> 'product_id') from jsonb_array_elements(p_lines) e) then
    raise exception 'มีสินค้าซ้ำในการนับ';
  end if;

  perform public._lock_products(array(select (e ->> 'product_id')::uuid from jsonb_array_elements(p_lines) e));

  for v_line in
    select (e ->> 'product_id')::uuid as product_id, (e ->> 'counted')::numeric as counted
      from jsonb_array_elements(p_lines) e
  loop
    v_on_hand := public._stock_on_hand(v_line.product_id);
    if v_line.counted <> v_on_hand then
      insert into stock_movements (movement_date, product_id, movement_type, quantity, ref_no, note)
      values (coalesce(p_date, current_date), v_line.product_id, 'adjust', v_line.counted - v_on_hand,
              'นับสต๊อก',
              concat_ws(' · ', 'นับได้ ' || trim_scale(v_line.counted) || ' (ในระบบ ' || trim_scale(v_on_hand) || ')',
                        nullif(trim(p_note), '')));
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

grant execute on function public.save_production_order(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.receive_production(uuid, date, text, jsonb) to authenticated;
grant execute on function public.cancel_production_receipt(uuid, text) to authenticated;
grant execute on function public.set_production_order_status(uuid, text, text) to authenticated;
grant execute on function public.post_stock_movements(text, date, text, text, jsonb) to authenticated;
grant execute on function public.post_stock_count(date, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 15. Audit labels: production / receipt numbers, and products by SKU.
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old       jsonb;
  v_new       jsonb;
  v_row       jsonb;
  v_ignored   text[] := array['updated_at'] || coalesce(tg_argv::text[], array[]::text[]);
  v_changed   text[];
  v_label     text;
  v_record_id text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);
  -- user_roles is keyed by the login (same id the app's account events use);
  -- tax_invoice_orders has no id of its own -- file it under the invoice.
  v_record_id := case
    when tg_table_name = 'user_roles' then v_row ->> 'user_id'
    else coalesce(v_row ->> 'id', v_row ->> 'tax_invoice_id')
  end;

  v_label := left(coalesce(
    v_row ->> 'order_number', v_row ->> 'tax_invoice_number', v_row ->> 'certificate_number', v_row ->> 'invoice_number',
    v_row ->> 'bill_number', v_row ->> 'quotation_number', v_row ->> 'receipt_number',
    v_row ->> 'payment_number', v_row ->> 'po_number', v_row ->> 'pr_number',
    v_row ->> 'gr_number', v_row ->> 'return_number', v_row ->> 'run_number',
    v_row ->> 'production_number',
    v_row ->> 'external_order_id', v_row ->> 'customer_code', v_row ->> 'supplier_code',
    nullif(concat_ws(' ', v_row ->> 'employee_code', v_row ->> 'first_name', v_row ->> 'last_name'), ''),
    case when tg_table_name = 'user_roles'
      then (select u.email from auth.users u where u.id = (v_row ->> 'user_id')::uuid)::text
    end,
    case when tg_table_name = 'products' then concat_ws(' ', v_row ->> 'sku', v_row ->> 'name') end,
    case when tg_table_name = 'production_order_items'
      then (select o.production_number || ' · ' || coalesce(p.sku || ' ' || p.name, p.name)
              from production_orders o, products p
             where o.id = (v_row ->> 'production_order_id')::uuid and p.id = (v_row ->> 'product_id')::uuid)
    end,
    v_row ->> 'file_name', v_row ->> 'name', v_row ->> 'description'
  ), 200);

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key)
      into v_changed
      from jsonb_each(v_new) n
     where n.value is distinct from v_old -> n.key
       and n.key <> all(v_ignored);

    if v_changed is null then
      return null;
    end if;

    -- Inserted earlier in this same transaction (e.g. an RPC that inserts a
    -- document and then fills in its totals): fold the update into that
    -- insert entry instead of logging a second row.
    update public.audit_logs
       set new_data = v_new, record_label = coalesce(v_label, record_label)
     where table_name = tg_table_name
       and record_id = v_record_id
       and action = 'insert'
       and txid = txid_current();
    if found then
      return null;
    end if;

    -- Keep only what changed (ignored columns that changed alongside are kept
    -- for context, e.g. which import batch touched the order).
    select jsonb_object_agg(n.key, v_old -> n.key), jsonb_object_agg(n.key, n.value)
      into v_old, v_new
      from jsonb_each(v_new) n
     where n.value is distinct from v_old -> n.key
       and n.key <> 'updated_at';
  end if;

  insert into public.audit_logs (
    actor_user_id, actor_email, action, table_name, record_id, record_label,
    old_data, new_data, changed_fields
  )
  values (
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    lower(tg_op),
    tg_table_name,
    v_record_id,
    v_label,
    v_old,
    v_new,
    v_changed
  );

  return null;
end;
$$;
