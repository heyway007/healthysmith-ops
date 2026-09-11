-- ============================================================================
-- 0008_employee_portal.sql
-- Front office: lets any employee with a linked login (employees.user_id)
-- view leave types, and submit/view/withdraw their OWN leave requests --
-- without needing an HR back-office role.
-- ============================================================================

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.employees where user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_employee_id() to authenticated;

-- leave_types: everyone can read the list (needed to fill out a leave
-- request); HR/admin still own create/update/delete via the existing
-- leave_types_hr_all policy from 0006.
create policy leave_types_select_all on public.leave_types
  for select to authenticated
  using (true);

-- leave_requests: an employee can see, file, and withdraw (while still
-- pending) their own requests. HR/admin keep full access via the existing
-- leave_requests_hr_all policy from 0006 (approve/reject, see everyone's).
create policy leave_requests_self_select on public.leave_requests
  for select to authenticated
  using (employee_id = public.current_employee_id());

create policy leave_requests_self_insert on public.leave_requests
  for insert to authenticated
  with check (employee_id = public.current_employee_id());

create policy leave_requests_self_delete on public.leave_requests
  for delete to authenticated
  using (employee_id = public.current_employee_id() and status = 'pending');
