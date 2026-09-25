-- ============================================================================
-- 0012_teams_and_team_wfh.sql
-- Teams (separate from departments) so WFH days can differ per team -- some
-- teams work from home on several weekdays, others on none.
--
--  * teams: HR-managed list; every signed-in user can read it.
--  * employees.team_id: which team an employee belongs to (optional).
--  * company_holidays.team_id: NULL = applies to the whole company (all
--    public holidays, and company-wide WFH); set = WFH for that team only.
--    The same date can now hold one entry per team, so the old
--    UNIQUE (holiday_date) becomes UNIQUE NULLS NOT DISTINCT
--    (holiday_date, team_id). Public holidays are always company-wide.
-- ============================================================================

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

create policy teams_select_all on public.teams
  for select to authenticated
  using (true);

create policy teams_hr_all on public.teams
  for all to authenticated
  using (public.has_role('hr'))
  with check (public.has_role('hr'));

alter table public.employees
  add column team_id uuid references public.teams (id) on delete set null;

create index idx_employees_team on public.employees (team_id);

alter table public.company_holidays
  add column team_id uuid references public.teams (id) on delete cascade;

alter table public.company_holidays
  drop constraint company_holidays_holiday_date_key;

alter table public.company_holidays
  add constraint company_holidays_date_team_key unique nulls not distinct (holiday_date, team_id);

alter table public.company_holidays
  add constraint company_holidays_team_only_wfh check (type = 'wfh' or team_id is null);

create index idx_company_holidays_team on public.company_holidays (team_id);
