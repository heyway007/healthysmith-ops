-- ============================================================================
-- 0009_employee_self_service.sql
-- Employee self-service profile: an employee can view their own full
-- employees row and update their personal/contact fields themselves (name,
-- nickname, phone, address, bank, ID card, tax numbers). Employment fields
-- (code, department, position, type, dates, status, salary) stay HR/admin-
-- only -- the update path is a SECURITY DEFINER function that only accepts
-- the self-service columns, so no client payload can ever touch the rest.
--
-- Also seeds an 'employee' document-number sequence: when /admin/users
-- grants "employee" access without linking an existing HR record, the app
-- auto-creates a minimal employees row instead of requiring HR to fill the
-- full HR form first.
-- ============================================================================

insert into public.document_number_sequences (doc_type, prefix, reset_period)
values ('employee', 'EMP', 'never')
on conflict (doc_type) do nothing;

-- Employees can read their own full row (their own salary/bank/ID-card data
-- isn't a secret from themselves). HR/admin already have full access via the
-- existing employees_authenticated_all policy (0006/0007).
create policy employees_self_select on public.employees
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.update_own_employee_profile(
  p_prefix_name             text,
  p_first_name              text,
  p_last_name               text,
  p_nickname                text,
  p_phone                   text,
  p_email                   text,
  p_address                 text,
  p_id_card_number          text,
  p_bank_name               text,
  p_bank_account_number     text,
  p_bank_account_name       text,
  p_social_security_number  text,
  p_tax_id                  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.employees
  set prefix_name            = p_prefix_name,
      first_name             = p_first_name,
      last_name              = p_last_name,
      nickname               = p_nickname,
      phone                  = p_phone,
      email                  = p_email,
      address                = p_address,
      id_card_number         = p_id_card_number,
      bank_name              = p_bank_name,
      bank_account_number    = p_bank_account_number,
      bank_account_name      = p_bank_account_name,
      social_security_number = p_social_security_number,
      tax_id                 = p_tax_id
  where user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบข้อมูลพนักงานที่ผูกกับบัญชีนี้';
  end if;
end;
$$;

grant execute on function public.update_own_employee_profile(
  text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
