-- ============================================================================
-- 0010_company_holidays.sql
-- Company holiday calendar: HR/admin publish the year's public holidays and
-- can also mark specific dates as "work from home" days. Every signed-in
-- user (back office and front office alike) can read the calendar; only
-- HR/admin can add/edit/remove entries.
-- ============================================================================

create table public.company_holidays (
  id           uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name         text not null,
  type         text not null default 'holiday' check (type in ('holiday', 'wfh')),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_company_holidays_updated_at
  before update on public.company_holidays
  for each row execute function public.set_updated_at();

create index idx_company_holidays_date on public.company_holidays (holiday_date);

alter table public.company_holidays enable row level security;

create policy company_holidays_select_all on public.company_holidays
  for select to authenticated
  using (true);

create policy company_holidays_hr_all on public.company_holidays
  for all to authenticated
  using (public.has_role('hr'))
  with check (public.has_role('hr'));
