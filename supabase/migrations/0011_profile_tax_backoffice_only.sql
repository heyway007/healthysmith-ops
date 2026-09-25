-- ============================================================================
-- 0011_profile_tax_backoffice_only.sql
-- Tax data (social security number, tax ID) moves out of employee self-
-- service: the front-office profile now only covers personal, contact and
-- bank details, and accounting/HR maintain tax numbers from the back office.
-- The self-service RPC is recreated without the tax parameters so employees
-- can no longer overwrite those columns.
-- ============================================================================

drop function if exists public.update_own_employee_profile(
  text, text, text, text, text, text, text, text, text, text, text, text, text
);

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
  p_bank_account_name       text
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
      bank_account_name      = p_bank_account_name
  where user_id = auth.uid();

  if not found then
    raise exception 'ไม่พบข้อมูลพนักงานที่ผูกกับบัญชีนี้';
  end if;
end;
$$;

grant execute on function public.update_own_employee_profile(
  text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
