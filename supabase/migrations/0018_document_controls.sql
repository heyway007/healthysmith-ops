-- ============================================================================
-- 0018_document_controls.sql
-- Controls for tax documents (ใบกำกับภาษี / หนังสือรับรองหัก ณ ที่จ่าย):
--
--  1. Per-user document permissions: view / create / edit / cancel / approve
--     (admin has all). Cancelling without "approve" becomes a request that
--     an approver must accept.
--  2. Issued documents are immutable: a guard trigger rejects any insert,
--     update or delete that doesn't come through the RPCs below. Corrections
--     are new documents that point at the one they replace (replaces_id /
--     replaced_by_id); the original is cancelled, never changed or deleted.
--  3. Originals are preserved: tax invoices snapshot the seller details at
--     issue, and every document stores a SHA-256 of its printed content so
--     it can be checked later (verify_document).
--  4. Document users can read their documents' audit history.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Permissions
-- ---------------------------------------------------------------------------
alter table public.user_roles
  add column doc_permissions text[] not null default array['view', 'create']::text[];
alter table public.user_roles
  add constraint user_roles_doc_permissions_check
  check (doc_permissions <@ array['view', 'create', 'edit', 'cancel', 'approve']::text[]);

-- The signed-in user's document permissions (admin: all of them).
create or replace function public.current_doc_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then array['view', 'create', 'edit', 'cancel', 'approve']::text[]
    else coalesce((select doc_permissions from public.user_roles where user_id = auth.uid() and is_active limit 1),
                  array[]::text[])
  end;
$$;

-- Any document permission implies being able to see the documents.
create or replace function public.has_doc_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p = 'view' then cardinality(public.current_doc_permissions()) > 0
    else p = any(public.current_doc_permissions())
  end;
$$;

grant execute on function public.current_doc_permissions() to authenticated;
grant execute on function public.has_doc_permission(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Document columns: who/when, cancel workflow, replacement chain, hash
-- ---------------------------------------------------------------------------
alter table public.tax_invoices
  add column created_by_email      text default (auth.jwt() ->> 'email'),
  add column seller_snapshot       jsonb,
  add column cancel_requested_at   timestamptz,
  add column cancel_requested_by   text,
  add column cancel_request_reason text,
  add column cancelled_by          text,
  add column cancel_review_note    text,
  add column replaces_id           uuid references public.tax_invoices (id),
  add column replaced_by_id        uuid references public.tax_invoices (id),
  add column content_hash          text;

alter table public.wht_certificates
  add column created_by_email      text default (auth.jwt() ->> 'email'),
  add column cancel_requested_at   timestamptz,
  add column cancel_requested_by   text,
  add column cancel_request_reason text,
  add column cancelled_by          text,
  add column cancel_review_note    text,
  add column replaces_id           uuid references public.wht_certificates (id),
  add column replaced_by_id        uuid references public.wht_certificates (id),
  add column content_hash          text;

-- tax_invoice_list selects ti.* -- recreate so the new columns show up.
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
-- 3. Immutability guard. The RPCs below switch it off for their own
--    transaction with set_config('app.document_write', 'on', true); API
--    clients can't call set_config, so every change goes through an RPC
--    that checks permissions and leaves an audit trail.
-- ---------------------------------------------------------------------------
create or replace function public.guard_issued_document()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.document_write', true) = 'on' then
    return coalesce(new, old);
  end if;
  raise exception 'เอกสารภาษีแก้ไขหรือลบโดยตรงไม่ได้ — ใช้คำสั่งแก้ไข/ยกเลิกเอกสารในระบบ เพื่อให้เก็บประวัติครบ';
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['tax_invoices', 'tax_invoice_items', 'tax_invoice_orders', 'wht_certificates', 'wht_certificate_lines'] loop
    execute format('drop trigger if exists trg_guard_document on public.%I', t);
    execute format(
      'create trigger trg_guard_document before insert or update or delete on public.%I for each row execute function public.guard_issued_document()',
      t
    );
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 4. Content + hash of what is printed
-- ---------------------------------------------------------------------------
create or replace function public.tax_invoice_content(p_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'number', t.tax_invoice_number,
    'issue_date', t.issue_date,
    'seller', t.seller_snapshot,
    'buyer', jsonb_build_object('name', t.buyer_name, 'tax_id', t.buyer_tax_id, 'branch', t.buyer_branch,
                                'address', t.buyer_address, 'phone', t.buyer_phone),
    'payment', jsonb_build_object('method', t.payment_method, 'bank', t.payment_bank, 'branch', t.payment_branch,
                                  'ref', t.payment_ref, 'date', t.payment_date),
    'subtotal', t.subtotal, 'discount', t.discount_amount, 'total', t.total_amount, 'vat', t.vat_amount,
    'note', t.note,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('description', i.description, 'quantity', i.quantity,
                                                           'unit_price', i.unit_price, 'discount', i.discount_amount,
                                                           'amount', i.amount) order by i.sort_order, i.id), '[]'::jsonb)
                from tax_invoice_items i where i.tax_invoice_id = t.id)
  )
  from tax_invoices t where t.id = p_id;
$$;

create or replace function public.wht_certificate_content(p_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'number', c.certificate_number, 'book', c.book_number, 'issue_date', c.issue_date,
    'payer', jsonb_build_object('name', c.payer_name, 'tax_id', c.payer_tax_id, 'address', c.payer_address),
    'payee', jsonb_build_object('type', c.payee_type, 'name', c.payee_name, 'tax_id', c.payee_tax_id, 'address', c.payee_address),
    'form_type', c.form_type, 'sequence', c.sequence_label,
    'condition', c.payer_condition, 'condition_other', c.payer_condition_other,
    'pf', jsonb_build_object('license', c.pf_license_no, 'amount', c.pf_amount),
    'sso', jsonb_build_object('amount', c.sso_amount, 'employer_no', c.sso_employer_no, 'card_no', c.sso_card_no),
    'total_paid', c.total_paid, 'total_tax', c.total_tax, 'signer', c.signer_name,
    'lines', (select coalesce(jsonb_agg(jsonb_build_object('type', l.income_type, 'description', l.description,
                                                           'pay_date', l.pay_date, 'amount', l.amount, 'tax', l.tax)
                                        order by l.sort_order, l.id), '[]'::jsonb)
                from wht_certificate_lines l where l.certificate_id = c.id)
  )
  from wht_certificates c where c.id = p_id;
$$;

create or replace function public._sha256(p jsonb)
returns text
language sql
immutable
as $$
  select encode(sha256(convert_to(p::text, 'UTF8')), 'hex');
$$;

-- Stored vs recomputed hash, for the "ตรวจสอบต้นฉบับ" badge. Runs with the
-- caller's rights, so RLS still decides who may look.
create or replace function public.verify_document(p_kind text, p_id uuid)
returns table (stored_hash text, current_hash text, matches boolean)
language sql
stable
set search_path = public
as $$
  select d.content_hash, h.cur, d.content_hash is not distinct from h.cur
    from (
      select content_hash, id from tax_invoices where p_kind = 'tax_invoice' and id = p_id
      union all
      select content_hash, id from wht_certificates where p_kind = 'wht' and id = p_id
    ) d
    cross join lateral (
      select public._sha256(case when p_kind = 'tax_invoice' then public.tax_invoice_content(p_id)
                                 else public.wht_certificate_content(p_id) end) as cur
    ) h;
$$;
grant execute on function public.verify_document(text, uuid) to authenticated;

create or replace function public._seller_snapshot()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object('name', name, 'tax_id', tax_id, 'branch_code', branch_code,
                            'address', address, 'phone', phone, 'email', email, 'logo_url', logo_url)
    from companies order by created_at limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 5. Shared checks for the issue RPCs
-- ---------------------------------------------------------------------------
create or replace function public._require_doc_permission(p text, p_role text)
returns void
language plpgsql
stable
as $$
begin
  if not public.has_role(p_role) or not public.has_doc_permission(p) then
    raise exception 'ไม่มีสิทธิ์%ในเอกสารนี้', case p
      when 'create' then 'ออกเอกสาร' when 'edit' then 'แก้ไขเอกสาร' when 'cancel' then 'ยกเลิกเอกสาร'
      when 'approve' then 'อนุมัติ' else 'ดูเอกสาร' end;
  end if;
end;
$$;

-- Correction: the original (if still active) is cancelled and linked to the
-- new document. Call before issuing (frees the orders), then _link_replacement.
create or replace function public._cancel_for_replacement(p_kind text, p_id uuid, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_cancelled boolean;
  v_replaced  uuid;
begin
  if p_id is null then return; end if;
  perform public._require_doc_permission('edit', case p_kind when 'tax_invoice' then 'sales' else 'purchase' end);
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'กรุณาระบุเหตุผลที่แก้ไขเอกสาร';
  end if;

  if p_kind = 'tax_invoice' then
    select is_cancelled, replaced_by_id into v_cancelled, v_replaced from tax_invoices where id = p_id for update;
  else
    select is_cancelled, replaced_by_id into v_cancelled, v_replaced from wht_certificates where id = p_id for update;
  end if;
  if not found then raise exception 'ไม่พบเอกสารฉบับเดิม'; end if;
  if v_replaced is not null then raise exception 'เอกสารฉบับเดิมถูกแก้ไขไปแล้ว'; end if;

  if not v_cancelled then
    if p_kind = 'tax_invoice' then
      update tax_invoices set is_cancelled = true, cancelled_at = now(), cancelled_by = auth.jwt() ->> 'email',
             cancel_reason = 'แก้ไขเอกสาร: ' || trim(p_reason),
             cancel_requested_at = null, cancel_requested_by = null, cancel_request_reason = null
       where id = p_id;
    else
      update wht_certificates set is_cancelled = true, cancelled_at = now(), cancelled_by = auth.jwt() ->> 'email',
             cancel_reason = 'แก้ไขเอกสาร: ' || trim(p_reason),
             cancel_requested_at = null, cancel_requested_by = null, cancel_request_reason = null
       where id = p_id;
    end if;
  end if;
end;
$$;

create or replace function public._link_replacement(p_kind text, p_old uuid, p_new uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_old is null then return; end if;
  if p_kind = 'tax_invoice' then
    update tax_invoices set replaced_by_id = p_new where id = p_old;
    update tax_invoices set replaces_id = p_old where id = p_new;
  else
    update wht_certificates set replaced_by_id = p_new where id = p_old;
    update wht_certificates set replaces_id = p_old where id = p_new;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Issue RPCs, rebuilt with permission checks, the write guard, seller
--    snapshot, replacement and content hash. (Bodies otherwise as before.)
-- ---------------------------------------------------------------------------
drop function if exists public.issue_tax_invoice(uuid[], date, text, text, text, text, text, uuid, text);
create or replace function public.issue_tax_invoice(
  p_order_ids     uuid[],
  p_issue_date    date,
  p_buyer_name    text,
  p_buyer_tax_id  text,
  p_buyer_branch  text,
  p_buyer_address text,
  p_buyer_phone   text,
  p_customer_id   uuid default null,
  p_note          text default null,
  p_replaces_id   uuid default null,
  p_edit_reason   text default null
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
  perform public._require_doc_permission('create', 'sales');
  perform set_config('app.document_write', 'on', true);
  perform public._cancel_for_replacement('tax_invoice', p_replaces_id, p_edit_reason);

  if coalesce(array_length(p_order_ids, 1), 0) = 0 then
    raise exception 'ไม่ได้เลือกออเดอร์';
  end if;
  if coalesce(trim(p_buyer_name), '') = '' then
    raise exception 'กรุณากรอกชื่อผู้ซื้อ';
  end if;
  if p_buyer_tax_id is not null and p_buyer_tax_id !~ '^[0-9]{13}$' then
    raise exception 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก';
  end if;

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
    buyer_address, buyer_phone, note, created_by, seller_snapshot
  )
  values (
    coalesce(p_issue_date, current_date), p_customer_id, trim(p_buyer_name),
    nullif(trim(p_buyer_tax_id), ''), nullif(trim(p_buyer_branch), ''),
    nullif(trim(p_buyer_address), ''), nullif(trim(p_buyer_phone), ''),
    nullif(trim(p_note), ''), current_employee_id(), public._seller_snapshot()
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

  perform public._link_replacement('tax_invoice', p_replaces_id, v_id);
  update tax_invoices set content_hash = public._sha256(public.tax_invoice_content(v_id)) where id = v_id;
  return v_id;
end;
$$;
grant execute on function public.issue_tax_invoice(uuid[], date, text, text, text, text, text, uuid, text, uuid, text) to authenticated;

drop function if exists public.issue_manual_tax_invoice(date, text, text, text, text, text, jsonb, numeric, uuid, text, text, text, text, text, date);
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
  p_payment_date   date default null,
  p_replaces_id    uuid default null,
  p_edit_reason    text default null
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
  perform public._require_doc_permission('create', 'sales');
  perform set_config('app.document_write', 'on', true);

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

  perform public._cancel_for_replacement('tax_invoice', p_replaces_id, p_edit_reason);

  insert into tax_invoices (
    issue_date, customer_id, buyer_name, buyer_tax_id, buyer_branch,
    buyer_address, buyer_phone, note, created_by, seller_snapshot,
    payment_method, payment_bank, payment_branch, payment_ref, payment_date
  )
  values (
    coalesce(p_issue_date, current_date), p_customer_id, trim(p_buyer_name),
    nullif(trim(p_buyer_tax_id), ''), nullif(trim(p_buyer_branch), ''),
    nullif(trim(p_buyer_address), ''), nullif(trim(p_buyer_phone), ''),
    nullif(trim(p_note), ''), current_employee_id(), public._seller_snapshot(),
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

  perform public._link_replacement('tax_invoice', p_replaces_id, v_id);
  update tax_invoices set content_hash = public._sha256(public.tax_invoice_content(v_id)) where id = v_id;
  return v_id;
end;
$$;
grant execute on function public.issue_manual_tax_invoice(date, text, text, text, text, text, jsonb, numeric, uuid, text, text, text, text, text, date, uuid, text) to authenticated;

-- p_cert also accepts replaces_id and edit_reason.
create or replace function public.issue_wht_certificate(p_cert jsonb, p_lines jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id       uuid;
  v_date     date := coalesce(nullif(p_cert ->> 'issue_date', '')::date, current_date);
  v_prefix   text := to_char(v_date, 'DDMMYY');
  v_seq      integer;
  v_replaces uuid := nullif(p_cert ->> 'replaces_id', '')::uuid;
begin
  perform public._require_doc_permission('create', 'purchase');
  perform set_config('app.document_write', 'on', true);

  if coalesce(trim(p_cert ->> 'payer_name'), '') = '' then
    raise exception 'ยังไม่ได้ตั้งค่าข้อมูลบริษัท (ผู้มีหน้าที่หักภาษี)';
  end if;
  if coalesce(trim(p_cert ->> 'payee_name'), '') = '' then
    raise exception 'กรุณากรอกชื่อผู้ถูกหักภาษี';
  end if;
  if nullif(p_cert ->> 'payee_tax_id', '') is not null and p_cert ->> 'payee_tax_id' !~ '^[0-9]{13}$' then
    raise exception 'เลขประจำตัวผู้ถูกหักภาษีต้องเป็นตัวเลข 13 หลัก';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'กรุณาเพิ่มรายการเงินได้อย่างน้อย 1 รายการ';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_lines) e
     where coalesce((e ->> 'amount')::numeric, 0) <= 0
        or coalesce((e ->> 'tax')::numeric, 0) < 0
        or nullif(e ->> 'pay_date', '') is null
  ) then
    raise exception 'ทุกรายการต้องมีวันที่จ่าย จำนวนเงินมากกว่า 0 และภาษีไม่ติดลบ';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_lines) e
     where (e ->> 'tax')::numeric > (e ->> 'amount')::numeric
  ) then
    raise exception 'ภาษีที่หักมากกว่าจำนวนเงินที่จ่าย';
  end if;

  perform public._cancel_for_replacement('wht', v_replaces, p_cert ->> 'edit_reason');

  perform pg_advisory_xact_lock(hashtext('wht_certificate:' || v_prefix));
  select coalesce(max(split_part(certificate_number, '-', 2)::int), 0) + 1
    into v_seq
    from wht_certificates
   where certificate_number like v_prefix || '-%';

  insert into wht_certificates (
    certificate_number, book_number, issue_date, purchase_bill_id, supplier_id,
    payer_name, payer_tax_id, payer_address,
    payee_type, payee_name, payee_tax_id, payee_address,
    form_type, sequence_label, payer_condition, payer_condition_other,
    pf_license_no, pf_amount, sso_amount, sso_employer_no, sso_card_no,
    signer_name, note, created_by
  )
  values (
    v_prefix || '-' || lpad(v_seq::text, 2, '0'),
    nullif(trim(p_cert ->> 'book_number'), ''),
    v_date,
    nullif(p_cert ->> 'purchase_bill_id', '')::uuid,
    nullif(p_cert ->> 'supplier_id', '')::uuid,
    trim(p_cert ->> 'payer_name'),
    nullif(p_cert ->> 'payer_tax_id', ''),
    nullif(trim(p_cert ->> 'payer_address'), ''),
    coalesce(nullif(p_cert ->> 'payee_type', ''), 'juristic'),
    trim(p_cert ->> 'payee_name'),
    nullif(p_cert ->> 'payee_tax_id', ''),
    nullif(trim(p_cert ->> 'payee_address'), ''),
    p_cert ->> 'form_type',
    nullif(trim(p_cert ->> 'sequence_label'), ''),
    coalesce(nullif(p_cert ->> 'payer_condition', ''), 'withhold'),
    nullif(trim(p_cert ->> 'payer_condition_other'), ''),
    nullif(trim(p_cert ->> 'pf_license_no'), ''),
    nullif(p_cert ->> 'pf_amount', '')::numeric,
    nullif(p_cert ->> 'sso_amount', '')::numeric,
    nullif(trim(p_cert ->> 'sso_employer_no'), ''),
    nullif(trim(p_cert ->> 'sso_card_no'), ''),
    nullif(trim(p_cert ->> 'signer_name'), ''),
    nullif(trim(p_cert ->> 'note'), ''),
    current_employee_id()
  )
  returning id into v_id;

  insert into wht_certificate_lines (certificate_id, income_type, description, pay_date, amount, tax, sort_order)
  select v_id,
         e ->> 'income_type',
         nullif(trim(e ->> 'description'), ''),
         (e ->> 'pay_date')::date,
         round((e ->> 'amount')::numeric, 2),
         round(coalesce((e ->> 'tax')::numeric, 0), 2),
         x.ord
    from jsonb_array_elements(p_lines) with ordinality as x(e, ord);

  update wht_certificates set
    total_paid = (select sum(amount) from wht_certificate_lines where certificate_id = v_id),
    total_tax  = (select sum(tax) from wht_certificate_lines where certificate_id = v_id)
  where id = v_id;

  perform public._link_replacement('wht', v_replaces, v_id);
  update wht_certificates set content_hash = public._sha256(public.wht_certificate_content(v_id)) where id = v_id;
  return v_id;
end;
$$;
grant execute on function public.issue_wht_certificate(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Cancel workflow
--    request_document_cancel: "cancel" permission files a request; with
--      "approve" the document is cancelled straight away.
--    review_document_cancel: "approve" permission accepts or rejects a request.
-- ---------------------------------------------------------------------------
create or replace function public.request_document_cancel(p_kind text, p_id uuid, p_reason text)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_role     text := case p_kind when 'tax_invoice' then 'sales' when 'wht' then 'purchase' end;
  v_email    text := auth.jwt() ->> 'email';
  v_approver boolean := public.has_doc_permission('approve');
  v_state    record;
begin
  if v_role is null then raise exception 'ประเภทเอกสารไม่ถูกต้อง'; end if;
  if not public.has_role(v_role) or not (public.has_doc_permission('cancel') or v_approver) then
    raise exception 'ไม่มีสิทธิ์ยกเลิกเอกสาร';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'กรุณาระบุเหตุผลที่ยกเลิก'; end if;
  perform set_config('app.document_write', 'on', true);

  if p_kind = 'tax_invoice' then
    select is_cancelled, cancel_requested_at into v_state from tax_invoices where id = p_id for update;
  else
    select is_cancelled, cancel_requested_at into v_state from wht_certificates where id = p_id for update;
  end if;
  if not found then raise exception 'ไม่พบเอกสาร'; end if;
  if v_state.is_cancelled then raise exception 'เอกสารนี้ถูกยกเลิกไปแล้ว'; end if;

  if v_approver then
    if p_kind = 'tax_invoice' then
      update tax_invoices set is_cancelled = true, cancelled_at = now(), cancelled_by = v_email,
             cancel_reason = trim(p_reason), cancel_requested_at = coalesce(cancel_requested_at, now()),
             cancel_requested_by = coalesce(cancel_requested_by, v_email),
             cancel_request_reason = coalesce(cancel_request_reason, trim(p_reason))
       where id = p_id;
    else
      update wht_certificates set is_cancelled = true, cancelled_at = now(), cancelled_by = v_email,
             cancel_reason = trim(p_reason), cancel_requested_at = coalesce(cancel_requested_at, now()),
             cancel_requested_by = coalesce(cancel_requested_by, v_email),
             cancel_request_reason = coalesce(cancel_request_reason, trim(p_reason))
       where id = p_id;
    end if;
    return 'cancelled';
  end if;

  if v_state.cancel_requested_at is not null then raise exception 'มีคำขอยกเลิกรออนุมัติอยู่แล้ว'; end if;
  if p_kind = 'tax_invoice' then
    update tax_invoices set cancel_requested_at = now(), cancel_requested_by = v_email,
           cancel_request_reason = trim(p_reason), cancel_review_note = null
     where id = p_id;
  else
    update wht_certificates set cancel_requested_at = now(), cancel_requested_by = v_email,
           cancel_request_reason = trim(p_reason), cancel_review_note = null
     where id = p_id;
  end if;
  return 'requested';
end;
$$;
grant execute on function public.request_document_cancel(text, uuid, text) to authenticated;

create or replace function public.review_document_cancel(p_kind text, p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_role  text := case p_kind when 'tax_invoice' then 'sales' when 'wht' then 'purchase' end;
  v_email text := auth.jwt() ->> 'email';
  v_req   timestamptz;
begin
  if v_role is null then raise exception 'ประเภทเอกสารไม่ถูกต้อง'; end if;
  perform public._require_doc_permission('approve', v_role);
  perform set_config('app.document_write', 'on', true);

  if p_kind = 'tax_invoice' then
    select cancel_requested_at into v_req from tax_invoices where id = p_id and not is_cancelled for update;
  else
    select cancel_requested_at into v_req from wht_certificates where id = p_id and not is_cancelled for update;
  end if;
  if v_req is null then raise exception 'ไม่มีคำขอยกเลิกที่รออนุมัติ'; end if;

  if p_approve then
    if p_kind = 'tax_invoice' then
      update tax_invoices set is_cancelled = true, cancelled_at = now(), cancelled_by = v_email,
             cancel_reason = cancel_request_reason, cancel_review_note = nullif(trim(p_note), '')
       where id = p_id;
    else
      update wht_certificates set is_cancelled = true, cancelled_at = now(), cancelled_by = v_email,
             cancel_reason = cancel_request_reason, cancel_review_note = nullif(trim(p_note), '')
       where id = p_id;
    end if;
  else
    -- Rejected: the request is cleared (the audit log keeps it) and the note says why.
    if p_kind = 'tax_invoice' then
      update tax_invoices set cancel_requested_at = null, cancel_requested_by = null, cancel_request_reason = null,
             cancel_review_note = coalesce(nullif(trim(p_note), ''), 'ไม่อนุมัติการยกเลิก') || ' — ' || v_email
       where id = p_id;
    else
      update wht_certificates set cancel_requested_at = null, cancel_requested_by = null, cancel_request_reason = null,
             cancel_review_note = coalesce(nullif(trim(p_note), ''), 'ไม่อนุมัติการยกเลิก') || ' — ' || v_email
       where id = p_id;
    end if;
  end if;
end;
$$;
grant execute on function public.review_document_cancel(text, uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Row-level security: viewing documents needs a document permission on
--    top of the area role. Writes are additionally gated by the guard trigger.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  t text;
  v_role text;
begin
  for r in
    select policyname, tablename from pg_policies
     where schemaname = 'public'
       and tablename in ('tax_invoices', 'tax_invoice_items', 'tax_invoice_orders', 'wht_certificates', 'wht_certificate_lines')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;

  foreach t in array array['tax_invoices', 'tax_invoice_items', 'tax_invoice_orders', 'wht_certificates', 'wht_certificate_lines'] loop
    v_role := case when t like 'wht%' then 'purchase' else 'sales' end;
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_role(%L) and public.has_doc_permission(''view''))',
      t || '_doc_select', t, v_role);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_role(%L) and public.has_doc_permission(''create''))',
      t || '_doc_insert', t, v_role);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_role(%L) and public.has_doc_permission(''view'')) with check (public.has_role(%L))',
      t || '_doc_update', t, v_role, v_role);
  end loop;
end $$;

-- Document users can read the history of their own documents.
create policy audit_logs_document_select on public.audit_logs
  for select to authenticated
  using (
    (table_name in ('tax_invoices', 'tax_invoice_orders') and public.has_role('sales') and public.has_doc_permission('view'))
    or (table_name = 'wht_certificates' and public.has_role('purchase') and public.has_doc_permission('view'))
  );

-- ---------------------------------------------------------------------------
-- 9. Audit labels: include 50 ทวิ numbers.
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
    v_row ->> 'external_order_id', v_row ->> 'customer_code', v_row ->> 'supplier_code',
    nullif(concat_ws(' ', v_row ->> 'employee_code', v_row ->> 'first_name', v_row ->> 'last_name'), ''),
    case when tg_table_name = 'user_roles'
      then (select u.email from auth.users u where u.id = (v_row ->> 'user_id')::uuid)::text
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

-- ---------------------------------------------------------------------------
-- 10. Backfill documents issued before this migration.
-- ---------------------------------------------------------------------------
do $$
begin
  perform set_config('app.document_write', 'on', true);
  update public.tax_invoices set seller_snapshot = public._seller_snapshot() where seller_snapshot is null;
  update public.tax_invoices set content_hash = public._sha256(public.tax_invoice_content(id)) where content_hash is null;
  update public.wht_certificates set content_hash = public._sha256(public.wht_certificate_content(id)) where content_hash is null;
end $$;
