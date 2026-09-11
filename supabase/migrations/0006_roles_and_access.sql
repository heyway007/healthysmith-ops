-- ============================================================================
-- 0006_roles_and_access.sql
-- Module 8: ระบบผู้ใช้งานและสิทธิ์ (Users & Access Control)
--
-- Replaces the blanket "any authenticated user can do anything" policy from
-- 0005 with per-role access: each signed-in user has exactly one role
-- (admin / sales / purchase / hr) recorded in user_roles, and every table
-- from here on checks that role instead of just "authenticated".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- user_roles -- one row per login, admin-managed
-- ---------------------------------------------------------------------------
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  role        text not null default 'sales' check (role in ('admin', 'sales', 'purchase', 'hr')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_user_roles_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper functions (security definer: bypass RLS internally so checking
-- "what's my role" from inside another table's policy doesn't recurse)
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles
  where user_id = auth.uid() and is_active
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.user_roles enable row level security;

create policy user_roles_self_select on public.user_roles
  for select to authenticated
  using (user_id = auth.uid());

create policy user_roles_admin_all on public.user_roles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- employee_directory -- safe, non-sensitive subset of employees (id, name,
-- department/position, status) that any signed-in user can read for
-- cross-module pickers ("ผู้ขอซื้อ", "ผู้อนุมัติ", ...) without exposing
-- salary / bank / ID card columns. Owned by the migration role, which owns
-- `employees` too, so it reads through RLS on the base table.
-- ---------------------------------------------------------------------------
create view public.employee_directory as
select id, user_id, employee_code, prefix_name, first_name, last_name, department_id, position_id, status
from public.employees;

grant select on public.employee_directory to authenticated;

-- ---------------------------------------------------------------------------
-- Replace 0005's blanket per-table policy with role-scoped ones.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  -- Shared reference data: everyone can read, only admin manages it.
  foreach t in array array['companies', 'products', 'sales_channels'] loop
    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format('create policy %I on public.%I for select to authenticated using (true);', t || '_select_all', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin());', t || '_insert_admin', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin());', t || '_update_admin', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin());', t || '_delete_admin', t);
  end loop;

  -- Document numbering: every module's create action needs to read+advance
  -- this, regardless of role, so it can't be role-gated.
  t := 'document_number_sequences';
  execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
  execute format('create policy %I on public.%I for select to authenticated using (true);', t || '_select_all', t);
  execute format('create policy %I on public.%I for update to authenticated using (true) with check (true);', t || '_update_all', t);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin());', t || '_insert_admin', t);
  execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin());', t || '_delete_admin', t);

  -- departments/positions: any signed-in user can read and add new ones
  -- (typed "แผนก"/"ตำแหน่ง" fields in HR and Purchase both create-on-the-fly),
  -- but editing/removing an existing one is HR's call.
  foreach t in array array['departments', 'positions'] loop
    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format('create policy %I on public.%I for select to authenticated using (true);', t || '_select_all', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true);', t || '_insert_all', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.current_role() in (''hr'', ''admin'')) with check (public.current_role() in (''hr'', ''admin''));',
      t || '_update_hr', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.current_role() in (''hr'', ''admin''));',
      t || '_delete_hr', t
    );
  end loop;

  -- employees: full row (salary, bank, ID card) -- HR/admin only. Everyone
  -- else uses the employee_directory view instead.
  t := 'employees';
  execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
  execute format(
    'create policy %I on public.%I for all to authenticated using (public.current_role() in (''hr'', ''admin'')) with check (public.current_role() in (''hr'', ''admin''));',
    t || '_hr_all', t
  );

  -- HR/payroll-specific tables: HR/admin only.
  foreach t in array array[
    'employee_salary_history', 'employee_deduction_settings', 'leave_types', 'leave_requests',
    'payroll_periods', 'payroll_runs', 'payroll_items', 'ot_records', 'bonus_commission_records',
    'social_security_contributions', 'payslips'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_role() in (''hr'', ''admin'')) with check (public.current_role() in (''hr'', ''admin''));',
      t || '_hr_all', t
    );
  end loop;

  -- Sales module tables: sales/admin only.
  foreach t in array array[
    'customers', 'customer_addresses', 'quotations', 'quotation_items', 'sales_orders',
    'sales_order_items', 'invoices', 'invoice_items', 'tax_invoices', 'receipts', 'shipments',
    'sales_returns', 'sales_return_items'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_role() in (''sales'', ''admin'')) with check (public.current_role() in (''sales'', ''admin''));',
      t || '_sales_all', t
    );
  end loop;

  -- Purchase module tables: purchase/admin only.
  foreach t in array array[
    'suppliers', 'purchase_requests', 'purchase_request_items', 'purchase_orders',
    'purchase_order_items', 'goods_receipts', 'goods_receipt_items', 'purchase_bills',
    'purchase_bill_items', 'ap_payments', 'purchase_approvals'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_role() in (''purchase'', ''admin'')) with check (public.current_role() in (''purchase'', ''admin''));',
      t || '_purchase_all', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: the existing login used throughout development becomes the first
-- admin, so this migration doesn't lock everyone out of their own app.
-- ---------------------------------------------------------------------------
insert into public.user_roles (user_id, role)
values ('05d5254e-5bd1-457a-ad1d-ffc2fa3b558c', 'admin')
on conflict (user_id) do update set role = 'admin', is_active = true;
