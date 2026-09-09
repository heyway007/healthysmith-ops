-- ============================================================================
-- 0002_hr_payroll.sql
-- Module 7: ระบบพนักงานและเงินเดือน (HR & Payroll)
-- ข้อมูลพนักงาน / เงินเดือน / OT / Bonus / Commission / ประกันสังคม /
-- ภาษี / กยศ. / การลา / Payslip / รายงานเงินเดือน
--
-- employees is also referenced from Sales (salesperson) and Purchase
-- (requester / approver), so this migration must run before 0003/0004.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Org structure
-- ---------------------------------------------------------------------------
create table public.departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table public.positions (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments (id) on delete set null,
  name          text not null,
  created_at    timestamptz not null default now()
);

create index idx_positions_department on public.positions (department_id);

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
create table public.employees (
  id                     uuid primary key default gen_random_uuid(),
  employee_code          text not null unique,
  prefix_name            text,                          -- นาย / นาง / นางสาว
  first_name             text not null,
  last_name              text not null,
  nickname               text,
  id_card_number         varchar(13),
  department_id          uuid references public.departments (id) on delete set null,
  position_id            uuid references public.positions (id) on delete set null,
  employment_type        text not null default 'full_time'
                         check (employment_type in ('full_time', 'part_time', 'daily', 'contract')),
  start_date             date not null,
  end_date               date,
  status                 text not null default 'active'
                         check (status in ('active', 'resigned', 'terminated', 'on_leave')),
  phone                  text,
  email                  text,
  address                text,
  bank_name              text,
  bank_account_number    text,
  bank_account_name      text,
  base_salary            numeric(14, 2) not null default 0,
  social_security_number varchar(13),
  tax_id                 varchar(13),
  user_id                uuid references auth.users (id) on delete set null, -- link to Supabase auth account, if this employee logs in
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

create index idx_employees_department on public.employees (department_id);
create index idx_employees_status on public.employees (status);
create index idx_employees_name_trgm on public.employees using gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Salary change history (promotions / raises over time)
create table public.employee_salary_history (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees (id) on delete cascade,
  base_salary    numeric(14, 2) not null,
  effective_date date not null,
  note           text,
  created_at     timestamptz not null default now()
);

create index idx_salary_history_employee on public.employee_salary_history (employee_id);

-- Recurring payroll deductions per employee (กยศ., กองทุนสำรองเลี้ยงชีพ, อื่นๆ)
create table public.employee_deduction_settings (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees (id) on delete cascade,
  deduction_type  text not null check (deduction_type in ('student_loan', 'provident_fund', 'other')),
  label           text,                              -- free-text label when deduction_type = 'other'
  amount          numeric(14, 2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_employee_deduction_settings_updated_at
  before update on public.employee_deduction_settings
  for each row execute function public.set_updated_at();

create index idx_deduction_settings_employee on public.employee_deduction_settings (employee_id);

-- ---------------------------------------------------------------------------
-- Leave
-- ---------------------------------------------------------------------------
create table public.leave_types (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,   -- ลาป่วย / ลากิจ / ลาพักร้อน / ลาคลอด ฯลฯ
  max_days_per_year   numeric(5, 1),
  is_paid             boolean not null default true,
  created_at          timestamptz not null default now()
);

create table public.leave_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id),
  start_date    date not null,
  end_date      date not null,
  days_count    numeric(5, 1) not null,
  reason        text,
  status        text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by   uuid references public.employees (id),
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create trigger trg_leave_requests_updated_at
  before update on public.leave_requests
  for each row execute function public.set_updated_at();

create index idx_leave_requests_employee on public.leave_requests (employee_id);
create index idx_leave_requests_status on public.leave_requests (status);

-- ---------------------------------------------------------------------------
-- Payroll
-- ---------------------------------------------------------------------------
create table public.payroll_periods (
  id           uuid primary key default gen_random_uuid(),
  period_month smallint not null check (period_month between 1 and 12),
  period_year  smallint not null,
  pay_date     date not null,
  status       text not null default 'open'
              check (status in ('open', 'processing', 'closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (period_month, period_year)
);

create trigger trg_payroll_periods_updated_at
  before update on public.payroll_periods
  for each row execute function public.set_updated_at();

create table public.payroll_runs (
  id               uuid primary key default gen_random_uuid(),
  run_number       text not null unique,
  payroll_period_id uuid not null references public.payroll_periods (id) on delete restrict,
  status           text not null default 'draft'
                   check (status in ('draft', 'calculated', 'approved', 'paid', 'cancelled')),
  total_gross      numeric(14, 2) not null default 0,
  total_deduction  numeric(14, 2) not null default 0,
  total_net        numeric(14, 2) not null default 0,
  approved_by      uuid references public.employees (id),
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger trg_payroll_runs_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();

create index idx_payroll_runs_period on public.payroll_runs (payroll_period_id);
create index idx_payroll_runs_status on public.payroll_runs (status);

-- One line per employee per payroll run -- this is the payroll "worksheet" row.
create table public.payroll_items (
  id                        uuid primary key default gen_random_uuid(),
  payroll_run_id            uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id               uuid not null references public.employees (id) on delete restrict,
  base_salary               numeric(14, 2) not null default 0,
  ot_amount                 numeric(14, 2) not null default 0,
  bonus_amount              numeric(14, 2) not null default 0,
  commission_amount         numeric(14, 2) not null default 0,
  other_addition            numeric(14, 2) not null default 0,
  gross_income              numeric(14, 2) generated always as
                             (base_salary + ot_amount + bonus_amount + commission_amount + other_addition) stored,
  social_security_deduction numeric(14, 2) not null default 0,
  withholding_tax           numeric(14, 2) not null default 0,
  student_loan_deduction    numeric(14, 2) not null default 0,
  other_deduction           numeric(14, 2) not null default 0,
  total_deduction           numeric(14, 2) generated always as
                             (social_security_deduction + withholding_tax + student_loan_deduction + other_deduction) stored,
  net_pay                   numeric(14, 2) generated always as
                             (base_salary + ot_amount + bonus_amount + commission_amount + other_addition
                              - social_security_deduction - withholding_tax - student_loan_deduction - other_deduction) stored,
  note                      text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (payroll_run_id, employee_id)
);

create trigger trg_payroll_items_updated_at
  before update on public.payroll_items
  for each row execute function public.set_updated_at();

create index idx_payroll_items_run on public.payroll_items (payroll_run_id);
create index idx_payroll_items_employee on public.payroll_items (employee_id);

-- OT worked, before it's rolled into a payroll_item
create table public.ot_records (
  id                  uuid primary key default gen_random_uuid(),
  employee_id         uuid not null references public.employees (id) on delete cascade,
  work_date           date not null,
  ot_hours            numeric(5, 2) not null,
  ot_rate_multiplier  numeric(4, 2) not null default 1.5,
  ot_amount           numeric(14, 2) not null,
  payroll_item_id     uuid references public.payroll_items (id) on delete set null,
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'paid', 'rejected')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_ot_records_updated_at
  before update on public.ot_records
  for each row execute function public.set_updated_at();

create index idx_ot_records_employee on public.ot_records (employee_id);
create index idx_ot_records_payroll_item on public.ot_records (payroll_item_id);

-- Bonus / commission, before it's rolled into a payroll_item
create table public.bonus_commission_records (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees (id) on delete cascade,
  record_type     text not null check (record_type in ('bonus', 'commission')),
  amount          numeric(14, 2) not null,
  reference       text,                 -- e.g. related sales_order number for commission
  period_month    smallint check (period_month between 1 and 12),
  period_year     smallint,
  payroll_item_id uuid references public.payroll_items (id) on delete set null,
  note            text,
  created_at      timestamptz not null default now()
);

create index idx_bonus_commission_employee on public.bonus_commission_records (employee_id);
create index idx_bonus_commission_payroll_item on public.bonus_commission_records (payroll_item_id);

-- Social security contribution detail per payroll item (employee + employer side)
create table public.social_security_contributions (
  id                     uuid primary key default gen_random_uuid(),
  payroll_item_id        uuid not null references public.payroll_items (id) on delete cascade unique,
  base_amount            numeric(14, 2) not null,
  employee_rate          numeric(5, 4) not null default 0.05,
  employer_rate          numeric(5, 4) not null default 0.05,
  employee_contribution  numeric(14, 2) not null,
  employer_contribution  numeric(14, 2) not null,
  created_at             timestamptz not null default now()
);

-- Payslips issued from payroll items
create table public.payslips (
  id               uuid primary key default gen_random_uuid(),
  payroll_item_id  uuid not null references public.payroll_items (id) on delete cascade unique,
  employee_id      uuid not null references public.employees (id) on delete restrict,
  pdf_url          text,
  issued_at        timestamptz,
  viewed_at        timestamptz,
  created_at       timestamptz not null default now()
);

create index idx_payslips_employee on public.payslips (employee_id);
