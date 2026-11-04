-- ============================================================================
-- 0020_stock_documents.sql
-- Document numbers on stock movements, so what's posted together can be
-- printed as one document:
--   IN26-0001   ใบรับสินค้าเข้า        (post_stock_movements 'in')
--   OUT26-0001  ใบเบิกสินค้า           (post_stock_movements 'out')
--   CNT26-0001  ใบปรับยอดสต๊อก (นับ)   (post_stock_count, only when something changed)
--   FG26-0001   production receipts keep their receipt number (also on the
--               reversing rows when a receipt is cancelled)
-- post_stock_movements / post_stock_count now return the document number.
-- ============================================================================

alter table public.stock_movements add column doc_number text;
create index idx_stock_movements_doc_number on public.stock_movements (doc_number);

insert into public.document_number_sequences (doc_type, prefix, reset_period) values
  ('stock_in',    'IN',  'yearly'),
  ('stock_out',   'OUT', 'yearly'),
  ('stock_count', 'CNT', 'yearly')
on conflict (doc_type) do nothing;

-- Production rows take their receipt's number.
create or replace function public.stock_movement_doc_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.doc_number is null and new.production_receipt_id is not null then
    select receipt_number into new.doc_number from production_receipts where id = new.production_receipt_id;
  end if;
  return new;
end;
$$;

create trigger trg_stock_movements_doc_number
  before insert on public.stock_movements
  for each row execute function public.stock_movement_doc_number();

-- Backfill anything posted before this migration: production rows from their
-- receipt; in/out/adjust rows posted by one call share created_at (the
-- transaction time), so each such group becomes one document.
do $$
declare
  g record;
begin
  update public.stock_movements m
     set doc_number = r.receipt_number
    from public.production_receipts r
   where r.id = m.production_receipt_id and m.doc_number is null;

  for g in
    select movement_type, created_at
      from public.stock_movements
     where doc_number is null and movement_type in ('in', 'out', 'adjust')
     group by movement_type, created_at
     order by created_at
  loop
    update public.stock_movements
       set doc_number = public.next_document_number(
             case g.movement_type when 'in' then 'stock_in' when 'out' then 'stock_out' else 'stock_count' end)
     where doc_number is null and movement_type = g.movement_type and created_at = g.created_at;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- post_stock_movements: same as 0019, now numbered; returns the number.
-- ---------------------------------------------------------------------------
drop function public.post_stock_movements(text, date, text, text, jsonb);
create function public.post_stock_movements(
  p_type text, p_date date, p_ref_no text, p_note text, p_lines jsonb
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_line   record;
  v_number text;
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

  v_number := public.next_document_number(case p_type when 'in' then 'stock_in' else 'stock_out' end);

  insert into stock_movements
    (doc_number, movement_date, product_id, movement_type, quantity, lot_number, expiry_date, ref_no, note)
  select v_number,
         coalesce(p_date, current_date),
         (e ->> 'product_id')::uuid,
         p_type,
         case when p_type = 'out' then -1 else 1 end * (e ->> 'quantity')::numeric,
         nullif(trim(e ->> 'lot_number'), ''),
         nullif(e ->> 'expiry_date', '')::date,
         nullif(trim(p_ref_no), ''),
         coalesce(nullif(trim(e ->> 'note'), ''), nullif(trim(p_note), ''))
    from jsonb_array_elements(p_lines) with ordinality o(e, n)
   order by o.n;
  return v_number;
end;
$$;

-- ---------------------------------------------------------------------------
-- post_stock_count: same as 0019, now numbered. Returns the number, or null
-- when every count matched the system (nothing posted).
-- ---------------------------------------------------------------------------
drop function public.post_stock_count(date, text, jsonb);
create function public.post_stock_count(p_date date, p_note text, p_lines jsonb)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_line    record;
  v_on_hand numeric;
  v_number  text;
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
      from jsonb_array_elements(p_lines) with ordinality o(e, n)
     order by o.n
  loop
    v_on_hand := public._stock_on_hand(v_line.product_id);
    if v_line.counted <> v_on_hand then
      v_number := coalesce(v_number, public.next_document_number('stock_count'));
      insert into stock_movements (doc_number, movement_date, product_id, movement_type, quantity, note)
      values (v_number, coalesce(p_date, current_date), v_line.product_id, 'adjust', v_line.counted - v_on_hand,
              concat_ws(' · ', 'นับได้ ' || trim_scale(v_line.counted) || ' (ในระบบ ' || trim_scale(v_on_hand) || ')',
                        nullif(trim(p_note), '')));
    end if;
  end loop;
  return v_number;
end;
$$;

grant execute on function public.post_stock_movements(text, date, text, text, jsonb) to authenticated;
grant execute on function public.post_stock_count(date, text, jsonb) to authenticated;
