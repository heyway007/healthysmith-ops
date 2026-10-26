-- 0017_wht_certificates.sql
--
-- หนังสือรับรองการหักภาษี ณ ที่จ่าย (มาตรา 50 ทวิ) -- issued when we pay a
-- supplier/person and withhold tax. Payer and payee details are snapshotted
-- at issue so a printed certificate never changes afterwards.
--
-- Numbering: DDMMYY-NN by issue date (Christian year), running from 01 each
-- day, e.g. 161026-01. Cancelled certificates keep their number.

create table public.wht_certificates (
  id                  uuid primary key default gen_random_uuid(),
  certificate_number  text not null unique,
  book_number         text,                       -- เล่มที่ (optional)
  issue_date          date not null default current_date,
  purchase_bill_id    uuid references public.purchase_bills (id) on delete set null,
  supplier_id         uuid references public.suppliers (id) on delete set null,

  payer_name          text not null,
  payer_tax_id        varchar(13),
  payer_address       text,

  payee_type          text not null default 'juristic' check (payee_type in ('person', 'juristic')),
  payee_name          text not null,
  payee_tax_id        varchar(13),                -- citizen id for a person, tax id for a company
  payee_address       text,

  form_type           text not null check (form_type in
                        ('pnd1a', 'pnd1a_special', 'pnd2', 'pnd2a', 'pnd3', 'pnd3a', 'pnd53')),
  sequence_label      text,                       -- ลำดับที่ในแบบ ภ.ง.ด. e.g. 01/001

  -- (1) หัก ณ ที่จ่าย (2) ออกให้ตลอดไป (3) ออกให้ครั้งเดียว (4) อื่นๆ
  payer_condition     text not null default 'withhold'
                      check (payer_condition in ('withhold', 'always', 'once', 'other')),
  payer_condition_other text,

  pf_license_no       text,                       -- กองทุนสำรองเลี้ยงชีพ
  pf_amount           numeric(14, 2),
  sso_amount          numeric(14, 2),             -- กองทุนประกันสังคม
  sso_employer_no     text,
  sso_card_no         text,

  total_paid          numeric(14, 2) not null default 0,
  total_tax           numeric(14, 2) not null default 0,
  signer_name         text,
  note                text,

  is_cancelled        boolean not null default false,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_by          uuid references public.employees (id),
  created_at          timestamptz not null default now()
);

create index idx_wht_certificates_issue_date on public.wht_certificates (issue_date desc);
create index idx_wht_certificates_supplier on public.wht_certificates (supplier_id);

-- One row per income type paid. income_type matches the numbered lines on
-- the form: 1, 2, 3, 4a, 4b1_1 .. 4b1_4, 4b2_1 .. 4b2_5, 5, 6.
create table public.wht_certificate_lines (
  id              uuid primary key default gen_random_uuid(),
  certificate_id  uuid not null references public.wht_certificates (id) on delete cascade,
  income_type     text not null check (income_type in (
                    '1', '2', '3', '4a',
                    '4b1_1', '4b1_2', '4b1_3', '4b1_4',
                    '4b2_1', '4b2_2', '4b2_3', '4b2_4', '4b2_5',
                    '5', '6')),
  description     text,                           -- the "(ระบุ)" text for 4b1_4, 4b2_5 and 6
  pay_date        date not null,
  amount          numeric(14, 2) not null check (amount >= 0),
  tax             numeric(14, 2) not null default 0 check (tax >= 0),
  sort_order      integer not null default 0
);

create index idx_wht_lines_certificate on public.wht_certificate_lines (certificate_id);

-- Purchase role + admin, like the rest of the purchase module.
do $$
declare
  t text;
begin
  foreach t in array array['wht_certificates', 'wht_certificate_lines'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(''purchase'')) with check (public.has_role(''purchase''));',
      t || '_purchase_all', t
    );
  end loop;
end $$;

select public.enable_audit('public.wht_certificates');

-- ---------------------------------------------------------------------------
-- issue_wht_certificate: number + insert header and lines in one go.
--
-- p_cert  { book_number, issue_date, purchase_bill_id, supplier_id,
--           payer_name, payer_tax_id, payer_address,
--           payee_type, payee_name, payee_tax_id, payee_address,
--           form_type, sequence_label, payer_condition, payer_condition_other,
--           pf_license_no, pf_amount, sso_amount, sso_employer_no, sso_card_no,
--           signer_name, note }
-- p_lines [{ income_type, description, pay_date, amount, tax }]
-- ---------------------------------------------------------------------------
create or replace function public.issue_wht_certificate(p_cert jsonb, p_lines jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id     uuid;
  v_date   date := coalesce(nullif(p_cert ->> 'issue_date', '')::date, current_date);
  v_prefix text := to_char(v_date, 'DDMMYY');
  v_seq    integer;
begin
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

  -- Serialise numbering per day so two people can't take the same number.
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

  return v_id;
end;
$$;

grant execute on function public.issue_wht_certificate(jsonb, jsonb) to authenticated;
