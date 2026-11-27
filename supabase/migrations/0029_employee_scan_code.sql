-- ============================================================================
-- 0029_employee_scan_code.sql
-- รหัสสแกนนิ้ว: the user id the fingerprint scanner knows the employee by (the
-- "Code" column of its exported .txt log). Separate from employee_code, which
-- is the company's own number. Lets the timesheet converter show each person's
-- nickname automatically. Optional, and unique when set.
-- ============================================================================

alter table public.employees
  add column scan_code integer unique
  check (scan_code is null or scan_code > 0);
