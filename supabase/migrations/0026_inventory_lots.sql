-- ============================================================================
-- 0026_inventory_lots.sql
-- คลังสินค้า: stock by lot.
--
--  * products.track_lot -- per product. A lot-tracked product must have a Lot
--    on every receipt (manual รับเข้า and production receipts), and issuing
--    (เบิกออก) must name the lot and can't exceed that lot's balance.
--    Products without it behave exactly as before (lot stays optional text).
--  * A lot = (product, lot number). Its balance is just the sum of its ledger
--    rows, so there is no new table: product_lot_stock groups stock_movements.
--    Lot numbers are matched ignoring case / surrounding spaces and are stored
--    upper-cased. Stock with no lot is the "ไม่ระบุล็อต" bucket (e.g. everything
--    received before a product became lot-tracked).
--  * A lot has one expiry date: a lot that already exists can't be received
--    again with a different date, and a blank date takes the lot's date.
--  * One production receipt may carry several lots of the same product (one
--    line per lot); the same lot typed twice is merged.
--  * Stock counts (post_stock_count) work per lot for lot-tracked products.
--  * Cancelling a production receipt checks each lot's balance.
-- ============================================================================

alter table public.products
  add column track_lot boolean not null default false;

-- ---------------------------------------------------------------------------
-- 1. Lot helpers + per-lot balance view
-- ---------------------------------------------------------------------------
create or replace function public._lot_key(p text)
returns text
language sql
immutable
as $$
  select nullif(upper(btrim(p)), '');
$$;

create view public.product_lot_stock with (security_invoker = true) as
select m.product_id,
       public._lot_key(m.lot_number)                          as lot_number,   -- null = ไม่ระบุล็อต
       max(m.expiry_date)                                     as expiry_date,
       sum(m.quantity)::numeric(14, 3)                        as on_hand,
       min(m.movement_date) filter (where m.quantity > 0)     as received_date,
       max(m.movement_date)                                   as last_movement_date
  from public.stock_movements m
 group by m.product_id, public._lot_key(m.lot_number);

grant select on public.product_lot_stock to authenticated;

create or replace function public._lot_on_hand(p_product_id uuid, p_lot text)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(quantity), 0)
    from stock_movements
   where product_id = p_product_id
     and public._lot_key(lot_number) is not distinct from public._lot_key(p_lot);
$$;

create or replace function public._lot_expiry(p_product_id uuid, p_lot text)
returns date
language sql
stable
set search_path = public
as $$
  select max(expiry_date)
    from stock_movements
   where product_id = p_product_id
     and public._lot_key(p_lot) is not null
     and public._lot_key(lot_number) = public._lot_key(p_lot);
$$;

-- Raises if taking p_qty out of this lot would leave less than zero.
create or replace function public._assert_lot_available(p_product_id uuid, p_lot text, p_qty numeric)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_on_hand numeric := public._lot_on_hand(p_product_id, p_lot);
  v_name    text;
begin
  if v_on_hand - p_qty < 0 then
    select coalesce(sku || ' ' || name, name) into v_name from products where id = p_product_id;
    raise exception 'สต๊อก % ล็อต % ไม่พอ (คงเหลือ %, ต้องการ %)',
      v_name, coalesce(public._lot_key(p_lot), 'ไม่ระบุล็อต'), trim_scale(v_on_hand), trim_scale(p_qty);
  end if;
end;
$$;

-- A lot has one expiry date.
create or replace function public._assert_lot_expiry(p_product_id uuid, p_lot text, p_expiry date)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_existing date := public._lot_expiry(p_product_id, p_lot);
  v_name     text;
begin
  if p_expiry is not null and v_existing is not null and v_existing <> p_expiry then
    select coalesce(sku || ' ' || name, name) into v_name from products where id = p_product_id;
    raise exception 'ล็อต % ของ % มีวันหมดอายุ % อยู่แล้ว — ใช้วันหมดอายุเดียวกัน หรือเปลี่ยนเลข Lot',
      public._lot_key(p_lot), v_name, to_char(v_existing, 'DD/MM/YYYY');
  end if;
end;
$$;

-- The lines of a stock call, normalised and joined to their product.
create or replace function public._stock_lines(p_lines jsonb)
returns table (
  n bigint, product_id uuid, qty numeric, lot text, expiry date, note text, track_lot boolean, label text
)
language sql
stable
set search_path = public
as $$
  select o.n,
         (e ->> 'product_id')::uuid,
         (e ->> 'quantity')::numeric,
         public._lot_key(e ->> 'lot_number'),
         nullif(e ->> 'expiry_date', '')::date,
         nullif(trim(e ->> 'note'), ''),
         p.track_lot,
         coalesce(p.sku || ' ' || p.name, p.name)
    from jsonb_array_elements(p_lines) with ordinality o(e, n)
    join products p on p.id = (e ->> 'product_id')::uuid;
$$;

-- The lines of a production receipt, merged per (item, lot, expiry).
create or replace function public._receive_lines(p_order_id uuid, p_lines jsonb)
returns table (
  item_id uuid, product_id uuid, qty numeric, lot text, expiry date, track_lot boolean, label text
)
language sql
stable
set search_path = public
as $$
  select i.id,
         i.product_id,
         sum((e ->> 'quantity')::numeric),
         public._lot_key(e ->> 'lot_number'),
         nullif(e ->> 'expiry_date', '')::date,
         p.track_lot,
         coalesce(p.sku || ' ' || p.name, p.name)
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) e
    join production_order_items i
      on i.id = (e ->> 'item_id')::uuid and i.production_order_id = p_order_id
    join products p on p.id = i.product_id
   where coalesce(nullif(e ->> 'quantity', '')::numeric, 0) <> 0
   group by i.id, i.product_id, public._lot_key(e ->> 'lot_number'), nullif(e ->> 'expiry_date', '')::date,
            p.track_lot, p.sku, p.name;
$$;

-- ---------------------------------------------------------------------------
-- 2. post_stock_movements: รับเข้า / เบิกออก, lot-aware.
--    p_lines [{ product_id, quantity, lot_number, expiry_date, note }]
-- ---------------------------------------------------------------------------
create or replace function public.post_stock_movements(
  p_type text, p_date date, p_ref_no text, p_note text, p_lines jsonb
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_line   record;
  v_number text;
  v_bad    text;
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
  if (select count(*) from public._stock_lines(p_lines)) <> jsonb_array_length(p_lines) then
    raise exception 'ไม่พบสินค้าในระบบ';
  end if;

  if p_type = 'in' then
    select label into v_bad from public._stock_lines(p_lines) where track_lot and lot is null limit 1;
    if v_bad is not null then
      raise exception 'สินค้า % ติดตามเป็นล็อต — กรุณาระบุเลข Lot', v_bad;
    end if;
  end if;

  perform public._lock_products(array(select product_id from public._stock_lines(p_lines)));

  -- one expiry date per lot, within this document and against what's in stock
  select label || ' ล็อต ' || lot into v_bad
    from public._stock_lines(p_lines)
   where lot is not null and expiry is not null
   group by product_id, label, lot
  having count(distinct expiry) > 1
   limit 1;
  if v_bad is not null then
    raise exception '% ระบุวันหมดอายุไม่ตรงกัน — ล็อตเดียวกันต้องมีวันหมดอายุเดียวกัน', v_bad;
  end if;
  if p_type = 'in' then
    for v_line in
      select product_id, lot, max(expiry) as expiry
        from public._stock_lines(p_lines)
       where lot is not null and expiry is not null
       group by product_id, lot
    loop
      perform public._assert_lot_expiry(v_line.product_id, v_line.lot, v_line.expiry);
    end loop;
  end if;

  if p_type = 'out' then
    -- lot-tracked: each lot is checked on its own; others against the product total
    for v_line in
      select product_id, lot, sum(qty) as qty
        from public._stock_lines(p_lines)
       where track_lot
       group by product_id, lot
    loop
      perform public._assert_lot_available(v_line.product_id, v_line.lot, v_line.qty);
    end loop;
    for v_line in
      select product_id, sum(qty) as qty
        from public._stock_lines(p_lines)
       where not track_lot
       group by product_id
    loop
      perform public._assert_stock_available(v_line.product_id, v_line.qty);
    end loop;
  end if;

  v_number := public.next_document_number(case p_type when 'in' then 'stock_in' else 'stock_out' end);

  insert into stock_movements
    (doc_number, movement_date, product_id, movement_type, quantity, lot_number, expiry_date, ref_no, note)
  select v_number,
         coalesce(p_date, current_date),
         l.product_id,
         p_type,
         case when p_type = 'out' then -1 else 1 end * l.qty,
         l.lot,
         coalesce(l.expiry, public._lot_expiry(l.product_id, l.lot)),
         nullif(trim(p_ref_no), ''),
         coalesce(l.note, nullif(trim(p_note), ''))
    from public._stock_lines(p_lines) l
   order by l.n;
  return v_number;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. receive_production: several lots of the same product per receipt.
--    p_lines [{ item_id, quantity, lot_number, expiry_date }] -- one line per
--    lot; blank/0 quantities are skipped; the same lot twice is merged; the
--    lines of an item together can't exceed what's still due.
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
  v_item    production_order_items%rowtype;
  v_count   integer := 0;
  v_bad     text;
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

  if not exists (select 1 from public._receive_lines(p_order_id, p_lines)) then
    raise exception 'กรุณาใส่จำนวนที่รับอย่างน้อย 1 รายการ';
  end if;
  select label into v_bad from public._receive_lines(p_order_id, p_lines) where qty < 0 limit 1;
  if v_bad is not null then
    raise exception 'จำนวนรับของ % ต้องมากกว่า 0', v_bad;
  end if;
  select label into v_bad from public._receive_lines(p_order_id, p_lines) where track_lot and lot is null limit 1;
  if v_bad is not null then
    raise exception 'สินค้า % ติดตามเป็นล็อต — กรุณาระบุเลข Lot', v_bad;
  end if;

  perform public._lock_products(array(select product_id from public._receive_lines(p_order_id, p_lines)));

  -- one expiry date per lot, within this receipt and against what's in stock
  select label || ' ล็อต ' || lot into v_bad
    from public._receive_lines(p_order_id, p_lines)
   where lot is not null and expiry is not null
   group by product_id, label, lot
  having count(distinct expiry) > 1
   limit 1;
  if v_bad is not null then
    raise exception '% ระบุวันหมดอายุไม่ตรงกัน — ล็อตเดียวกันต้องมีวันหมดอายุเดียวกัน', v_bad;
  end if;
  for v_line in select product_id, lot, max(expiry) as expiry from public._receive_lines(p_order_id, p_lines)
                 where lot is not null and expiry is not null group by product_id, lot loop
    perform public._assert_lot_expiry(v_line.product_id, v_line.lot, v_line.expiry);
  end loop;

  insert into production_receipts (production_order_id, receipt_date, note)
  values (p_order_id, coalesce(p_date, current_date), nullif(trim(p_note), ''))
  returning * into v_receipt;

  for v_line in select * from public._receive_lines(p_order_id, p_lines) order by label, lot nulls first loop
    insert into production_receipt_items
      (production_receipt_id, production_order_item_id, product_id, quantity, lot_number, expiry_date)
    values (v_receipt.id, v_line.item_id, v_line.product_id, v_line.qty, v_line.lot,
            coalesce(v_line.expiry, public._lot_expiry(v_line.product_id, v_line.lot)));

    update production_order_items set received_quantity = received_quantity + v_line.qty
     where id = v_line.item_id
     returning * into v_item;
    if v_item.received_quantity > v_item.quantity then
      raise exception '% รับเกินจำนวนที่สั่งผลิต (ค้างรับ %) — ถ้าผลิตได้เกิน ให้แก้จำนวนในใบผลิตก่อน',
        v_line.label, trim_scale(greatest(v_item.quantity - (v_item.received_quantity - v_line.qty), 0));
    end if;

    insert into stock_movements
      (movement_date, product_id, movement_type, quantity, lot_number, expiry_date, ref_no, production_receipt_id)
    values (v_receipt.receipt_date, v_line.product_id, 'production', v_line.qty, v_line.lot,
            coalesce(v_line.expiry, public._lot_expiry(v_line.product_id, v_line.lot)),
            v_receipt.receipt_number || ' / ' || v_order.production_number, v_receipt.id);
    v_count := v_count + 1;
  end loop;

  perform public._refresh_production_status(p_order_id);
  return v_receipt.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. cancel_production_receipt: same as 0019, but a lot-tracked product is
--    checked against the balance of the lot being taken back out.
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
    select i.product_id, i.production_order_item_id, i.quantity, i.lot_number, i.expiry_date, p.track_lot
      from production_receipt_items i
      join products p on p.id = i.product_id
     where i.production_receipt_id = p_receipt_id
  loop
    -- each reversing row is inserted before the next line is checked, so
    -- several lots / the same lot twice are checked cumulatively
    if v_item.track_lot then
      perform public._assert_lot_available(v_item.product_id, v_item.lot_number, v_item.quantity);
    else
      perform public._assert_stock_available(v_item.product_id, v_item.quantity);
    end if;

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
-- 5. post_stock_count: per lot for lot-tracked products.
--    p_lines [{ product_id, lot_number, counted }]. For a lot-tracked product
--    each line is one lot (blank lot = the ไม่ระบุล็อต bucket); for the rest
--    the lot is ignored and the count is the product total.
-- ---------------------------------------------------------------------------
create or replace function public.post_stock_count(p_date date, p_note text, p_lines jsonb)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_line    record;
  v_on_hand numeric;
  v_number  text;
  v_lot     text;
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
  if (select count(*) from public._stock_lines(
        (select jsonb_agg(e || jsonb_build_object('quantity', 1)) from jsonb_array_elements(p_lines) e)))
     <> jsonb_array_length(p_lines) then
    raise exception 'ไม่พบสินค้าในระบบ';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_lines) e
      join products p on p.id = (e ->> 'product_id')::uuid
     group by p.id, case when p.track_lot then public._lot_key(e ->> 'lot_number') end
    having count(*) > 1
  ) then
    raise exception 'มีสินค้า / ล็อตซ้ำในการนับ';
  end if;

  perform public._lock_products(array(select (e ->> 'product_id')::uuid from jsonb_array_elements(p_lines) e));

  for v_line in
    select (e ->> 'product_id')::uuid as product_id,
           (e ->> 'counted')::numeric as counted,
           public._lot_key(e ->> 'lot_number') as lot,
           p.track_lot,
           coalesce(p.sku || ' ' || p.name, p.name) as label,
           o.n
      from jsonb_array_elements(p_lines) with ordinality o(e, n)
      join products p on p.id = (e ->> 'product_id')::uuid
     order by o.n
  loop
    v_lot := case when v_line.track_lot then v_line.lot end;
    v_on_hand := case when v_line.track_lot
                      then public._lot_on_hand(v_line.product_id, v_lot)
                      else public._stock_on_hand(v_line.product_id) end;
    if v_line.counted <> v_on_hand then
      v_number := coalesce(v_number, public.next_document_number('stock_count'));
      insert into stock_movements (doc_number, movement_date, product_id, movement_type, quantity, lot_number, expiry_date, note)
      values (v_number, coalesce(p_date, current_date), v_line.product_id, 'adjust', v_line.counted - v_on_hand,
              v_lot, public._lot_expiry(v_line.product_id, v_lot),
              concat_ws(' · ', 'นับได้ ' || trim_scale(v_line.counted) || ' (ในระบบ ' || trim_scale(v_on_hand) || ')',
                        nullif(trim(p_note), '')));
    end if;
  end loop;
  return v_number;
end;
$$;

grant execute on function public.post_stock_movements(text, date, text, text, jsonb) to authenticated;
grant execute on function public.receive_production(uuid, date, text, jsonb) to authenticated;
grant execute on function public.cancel_production_receipt(uuid, text) to authenticated;
grant execute on function public.post_stock_count(date, text, jsonb) to authenticated;
