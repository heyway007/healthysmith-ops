-- 0016_manual_tax_invoices.sql
--
-- Tax invoices keyed in by hand (walk-in / direct sales with no imported
-- order). Same tables and running number as issue_tax_invoice(); the lines
-- come from the form instead of sales_order_items, and there are no
-- tax_invoice_orders rows.

-- ---------------------------------------------------------------------------
-- How the buyer paid -- printed in the receipt's payment box. Optional:
-- marketplace orders are paid through the platform and leave it blank.
-- ---------------------------------------------------------------------------
alter table public.tax_invoices
  add column payment_method text check (payment_method in ('cash', 'transfer', 'cheque')),
  add column payment_bank   text,
  add column payment_branch text,
  add column payment_ref    text,          -- cheque no. / transfer reference
  add column payment_date   date;

-- tax_invoice_list selects ti.*, which Postgres expands when the view is
-- created -- recreate it so the new columns show up.
drop view public.tax_invoice_list;
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

grant select on public.tax_invoice_list to authenticated;

-- ---------------------------------------------------------------------------
-- issue_manual_tax_invoice
--
-- p_items is a JSON array of
--   { product_id?, description, quantity, unit_price, discount_amount? }
-- Prices include VAT (same as the order-based invoices). p_discount is an
-- extra discount on the whole bill.
-- ---------------------------------------------------------------------------
create or replace function public.issue_manual_tax_invoice(
  p_issue_date    date,
  p_buyer_name    text,
  p_buyer_tax_id  text,
  p_buyer_branch  text,
  p_buyer_address text,
  p_buyer_phone   text,
  p_items         jsonb,
  p_discount      numeric default 0,
  p_customer_id   uuid default null,
  p_note          text default null,
  p_payment_method text default null,
  p_payment_bank   text default null,
  p_payment_branch text default null,
  p_payment_ref    text default null,
  p_payment_date   date default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id        uuid;
  v_subtotal  numeric(14, 2);
  v_discount  numeric(14, 2) := round(coalesce(p_discount, 0), 2);
  v_total     numeric(14, 2);
begin
  if coalesce(trim(p_buyer_name), '') = '' then
    raise exception 'กรุณากรอกชื่อผู้ซื้อ';
  end if;
  if p_buyer_tax_id is not null and p_buyer_tax_id !~ '^[0-9]{13}$' then
    raise exception 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where coalesce(trim(e ->> 'description'), '') = '') then
    raise exception 'ทุกรายการต้องมีชื่อสินค้า';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where coalesce((e ->> 'quantity')::numeric, 0) <= 0) then
    raise exception 'จำนวนสินค้าต้องมากกว่า 0';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
     where coalesce((e ->> 'unit_price')::numeric, 0) < 0
        or coalesce((e ->> 'discount_amount')::numeric, 0) < 0
  ) or v_discount < 0 then
    raise exception 'ราคาและส่วนลดต้องไม่ติดลบ';
  end if;

  insert into tax_invoices (
    issue_date, customer_id, buyer_name, buyer_tax_id, buyer_branch,
    buyer_address, buyer_phone, note, created_by,
    payment_method, payment_bank, payment_branch, payment_ref, payment_date
  )
  values (
    coalesce(p_issue_date, current_date), p_customer_id, trim(p_buyer_name),
    nullif(trim(p_buyer_tax_id), ''), nullif(trim(p_buyer_branch), ''),
    nullif(trim(p_buyer_address), ''), nullif(trim(p_buyer_phone), ''),
    nullif(trim(p_note), ''), current_employee_id(),
    nullif(p_payment_method, ''), nullif(trim(p_payment_bank), ''),
    nullif(trim(p_payment_branch), ''), nullif(trim(p_payment_ref), ''), p_payment_date
  )
  returning id into v_id;

  insert into tax_invoice_items (
    tax_invoice_id, product_id, description, quantity, unit_price, discount_amount, sort_order
  )
  select v_id,
         nullif(e ->> 'product_id', '')::uuid,
         trim(e ->> 'description'),
         round((e ->> 'quantity')::numeric, 3),
         round(coalesce((e ->> 'unit_price')::numeric, 0), 2),
         round(coalesce((e ->> 'discount_amount')::numeric, 0), 2),
         x.ord
    from jsonb_array_elements(p_items) with ordinality as x(e, ord);

  if exists (select 1 from tax_invoice_items where tax_invoice_id = v_id and amount < 0) then
    raise exception 'ส่วนลดของรายการมากกว่ามูลค่าสินค้า';
  end if;

  select coalesce(sum(amount), 0) into v_subtotal from tax_invoice_items where tax_invoice_id = v_id;
  if v_discount > v_subtotal then
    raise exception 'ส่วนลดท้ายบิลมากกว่ายอดรวม';
  end if;
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

grant execute on function public.issue_manual_tax_invoice(date, text, text, text, text, text, jsonb, numeric, uuid, text, text, text, text, text, date) to authenticated;
