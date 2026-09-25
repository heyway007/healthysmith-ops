-- ============================================================================
-- 0013_public_holiday_calendar.sql
-- The holiday calendar (/holidays) is public: anyone can view company
-- holidays and each team's WFH days without signing in. Anonymous visitors
-- get read-only access to company_holidays and teams (names only -- the
-- table has nothing else). All writes stay HR-only via the existing policies.
-- ============================================================================

create policy company_holidays_select_anon on public.company_holidays
  for select to anon
  using (true);

create policy teams_select_anon on public.teams
  for select to anon
  using (true);

grant select on public.company_holidays to anon;
grant select on public.teams to anon;
