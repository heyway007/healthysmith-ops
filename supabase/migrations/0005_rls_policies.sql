-- ============================================================================
-- 0005_rls_policies.sql
-- Turns on Row Level Security for every table created above and grants full
-- access to any signed-in (authenticated) user.
--
-- This is a deliberately permissive starting point: it stops anonymous /
-- public access while the app is single-role. Module 8 (ระบบผู้ใช้งานและสิทธิ์)
-- will replace the blanket "authenticated" policies below with per-role
-- policies (e.g. only Finance can approve purchase_bills, only HR can see
-- payroll_items, employees can only see their own payslips, ...).
-- ============================================================================

do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t.tablename);

    execute format(
      'drop policy if exists %I on public.%I;',
      t.tablename || '_authenticated_all', t.tablename
    );

    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      t.tablename || '_authenticated_all', t.tablename
    );
  end loop;
end $$;
