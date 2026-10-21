-- ============================================================================
-- 0015_audit_log.sql
-- Audit log: who changed what, when.
--
--  * Every insert/update/delete on a business table is recorded by a row
--    trigger (audit_row_change), so changes made through server actions,
--    RPCs (import_sales_orders, issue_tax_invoice, ...) and the front-office
--    portal are all captured without any app code having to remember to log.
--  * The actor is taken from the request's JWT (auth.uid() / email). Writes
--    made with the service-role key have no JWT -> actor is NULL ("ระบบ").
--  * Events that don't touch a public table (login, logout, failed login,
--    creating/changing an auth account) are written by the app through the
--    service-role client -- see src/lib/audit.ts.
--  * Rows are append-only: admins can read them, nobody can edit or delete
--    them through the API.
--
-- New tables: call `select public.enable_audit('public.<table>');` in their
-- migration so they're audited too.
-- ============================================================================

create table public.audit_logs (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  txid           bigint not null default txid_current(),  -- groups entries written by one request/RPC
  actor_user_id  uuid,                 -- auth.users.id; no FK so logs survive user deletion
  actor_email    text,                 -- snapshot at the time of the action
  action         text not null,        -- insert / update / delete, or an app event e.g. auth.login
  table_name     text,                 -- NULL for app events that aren't about a row
  record_id      text,
  record_label   text,                 -- human-readable identifier, e.g. order / document number
  old_data       jsonb,                -- update: only the changed columns; delete: whole row
  new_data       jsonb,                -- update: only the changed columns; insert: whole row
  changed_fields text[],
  details        jsonb                 -- extra context for app events (ip, user agent, reason, ...)
);

create index idx_audit_logs_occurred on public.audit_logs (occurred_at desc);
create index idx_audit_logs_record on public.audit_logs (table_name, record_id, occurred_at desc);
create index idx_audit_logs_actor on public.audit_logs (actor_user_id, occurred_at desc);
create index idx_audit_logs_action on public.audit_logs (action, occurred_at desc);

alter table public.audit_logs enable row level security;

create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- No insert/update/delete policies on purpose. Belt and braces:
revoke insert, update, delete, truncate on public.audit_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row trigger
--
-- Trigger arguments (optional) = extra columns to ignore when deciding
-- whether an UPDATE changed anything. updated_at is always ignored, so a
-- save that changed nothing isn't logged.
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
    v_row ->> 'order_number', v_row ->> 'tax_invoice_number', v_row ->> 'invoice_number',
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

-- Attach the audit trigger to a table. p_ignore_columns = columns whose
-- change alone shouldn't produce a log entry.
create or replace function public.enable_audit(p_table regclass, p_ignore_columns text[] default '{}')
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists trg_audit on %s', p_table);
  execute format(
    'create trigger trg_audit after insert or update or delete on %s for each row execute function public.audit_row_change(%s)',
    p_table,
    coalesce((select string_agg(quote_literal(c), ', ') from unnest(p_ignore_columns) c), '')
  );
end;
$$;

revoke execute on function public.enable_audit(regclass, text[]) from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Turn it on for every existing table, except:
--   audit_logs                 -- itself
--   document_number_sequences  -- a counter bumped on every new document
--   sales_order_items          -- rebuilt from the file on every re-import;
--                                 the order row + order_imports cover it
--   tax_invoice_items          -- copied from the orders when the tax
--                                 invoice is issued; never edited
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in (
        'audit_logs', 'document_number_sequences', 'sales_order_items', 'tax_invoice_items'
      )
  loop
    perform public.enable_audit(format('public.%I', t)::regclass);
  end loop;
end $$;

-- A re-import re-stamps order_import_id on every order in the file even when
-- nothing else changed -- only log the orders whose data actually changed.
select public.enable_audit('public.sales_orders', array['order_import_id']);
