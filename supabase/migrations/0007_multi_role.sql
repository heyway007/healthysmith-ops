-- ============================================================================
-- 0007_multi_role.sql
-- Some logins need more than one department's access (e.g. one person
-- covers both sales and purchase). Replaces the single `role` column on
-- user_roles with a `roles` array, and every policy that checked
-- current_role() = 'x' now checks has_role('x') instead.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- user_roles.role (text) -> user_roles.roles (text[])
-- ---------------------------------------------------------------------------
alter table public.user_roles add column roles text[];
update public.user_roles set roles = array[role];
alter table public.user_roles alter column roles set not null;
alter table public.user_roles alter column roles set default array['sales']::text[];
alter table public.user_roles add constraint user_roles_roles_check
  check (roles <@ array['admin', 'sales', 'purchase', 'hr']::text[]);
alter table public.user_roles drop column role;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.current_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select roles from public.user_roles
  where user_id = auth.uid() and is_active
  limit 1;
$$;

create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    p_role = any(public.current_roles()) or 'admin' = any(public.current_roles()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce('admin' = any(public.current_roles()), false);
$$;

grant execute on function public.current_roles() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Re-point every role-scoped policy from 0006 at has_role() instead of the
-- old single-value current_role().
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['departments', 'positions'] loop
    execute format('drop policy if exists %I on public.%I;', t || '_update_hr', t);
    execute format('drop policy if exists %I on public.%I;', t || '_delete_hr', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_role(''hr'')) with check (public.has_role(''hr''));',
      t || '_update_hr', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_role(''hr''));',
      t || '_delete_hr', t
    );
  end loop;

  t := 'employees';
  execute format('drop policy if exists %I on public.%I;', t || '_hr_all', t);
  execute format(
    'create policy %I on public.%I for all to authenticated using (public.has_role(''hr'')) with check (public.has_role(''hr''));',
    t || '_hr_all', t
  );

  foreach t in array array[
    'employee_salary_history', 'employee_deduction_settings', 'leave_types', 'leave_requests',
    'payroll_periods', 'payroll_runs', 'payroll_items', 'ot_records', 'bonus_commission_records',
    'social_security_contributions', 'payslips'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_hr_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(''hr'')) with check (public.has_role(''hr''));',
      t || '_hr_all', t
    );
  end loop;

  foreach t in array array[
    'customers', 'customer_addresses', 'quotations', 'quotation_items', 'sales_orders',
    'sales_order_items', 'invoices', 'invoice_items', 'tax_invoices', 'receipts', 'shipments',
    'sales_returns', 'sales_return_items'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_sales_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(''sales'')) with check (public.has_role(''sales''));',
      t || '_sales_all', t
    );
  end loop;

  foreach t in array array[
    'suppliers', 'purchase_requests', 'purchase_request_items', 'purchase_orders',
    'purchase_order_items', 'goods_receipts', 'goods_receipt_items', 'purchase_bills',
    'purchase_bill_items', 'ap_payments', 'purchase_approvals'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_purchase_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_role(''purchase'')) with check (public.has_role(''purchase''));',
      t || '_purchase_all', t
    );
  end loop;
end $$;

drop function if exists public.current_role();
