-- ============================================================================
-- 0028_cancel_stock_documents.sql
-- ยกเลิกใบรับสินค้าเข้า (IN) / ใบเบิกสินค้า (OUT).
--
--  * The ledger stays insert-only: cancelling posts reversing rows under the
--    same document number (is_reversal = true, dated today) and records the
--    cancellation in stock_document_cancellations (who / when / why).
--  * Cancelling an IN takes the goods back out, so it is refused when the
--    stock (or, for a lot-tracked product, the lot) no longer has that much.
--    Cancelling an OUT puts the goods back.
--  * Stock-count documents (CNT) can't be cancelled -- count again instead.
-- ============================================================================

alter table public.stock_movements
  add column is_reversal boolean not null default false;

create table public.stock_document_cancellations (
  doc_number          text primary key,
  reason              text not null,
  cancelled_at        timestamptz not null default now(),
  cancelled_by_email  text default (auth.jwt() ->> 'email')
);

alter table public.stock_document_cancellations enable row level security;
create policy stock_document_cancellations_warehouse_all on public.stock_document_cancellations
  for all to authenticated using (public.has_role('warehouse')) with check (public.has_role('warehouse'));

create or replace function public.cancel_stock_document(p_doc_number text, p_reason text)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_doc  text := upper(btrim(p_doc_number));
  v_row  record;
  v_note text;
begin
  if not public.has_role('warehouse') then
    raise exception 'ไม่มีสิทธิ์ยกเลิกเอกสารสต๊อก';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'กรุณาระบุเหตุผลที่ยกเลิก';
  end if;
  if v_doc like 'CNT%' then
    raise exception 'ใบปรับยอดสต๊อกยกเลิกไม่ได้ — ให้นับสต๊อกใหม่';
  end if;
  if v_doc !~ '^(IN|OUT)\d{2}-\d{4,}$' then
    raise exception 'ยกเลิกได้เฉพาะใบรับเข้า (IN) และใบเบิก (OUT)';
  end if;
  if not exists (select 1 from stock_movements where doc_number = v_doc and not is_reversal) then
    raise exception 'ไม่พบเอกสาร %', v_doc;
  end if;

  perform public._lock_products(array(
    select product_id from stock_movements where doc_number = v_doc and not is_reversal));

  -- the primary key makes a second cancel of the same document fail here
  begin
    insert into stock_document_cancellations (doc_number, reason) values (v_doc, trim(p_reason));
  exception when unique_violation then
    raise exception 'เอกสาร % ยกเลิกไปแล้ว', v_doc;
  end;

  v_note := 'ยกเลิกเอกสาร: ' || trim(p_reason);

  -- each reversing row is inserted before the next line is checked, so several
  -- lines of the same product / lot are checked cumulatively
  for v_row in
    select m.*, p.track_lot
      from stock_movements m
      join products p on p.id = m.product_id
     where m.doc_number = v_doc and not m.is_reversal
     order by m.created_at, m.id
  loop
    if v_row.quantity > 0 then
      if v_row.track_lot then
        perform public._assert_lot_available(v_row.product_id, v_row.lot_number, v_row.quantity);
      else
        perform public._assert_stock_available(v_row.product_id, v_row.quantity);
      end if;
    end if;

    insert into stock_movements
      (doc_number, product_id, movement_type, quantity, lot_number, expiry_date, ref_no, note, is_reversal)
    values (v_doc, v_row.product_id, v_row.movement_type, -v_row.quantity, v_row.lot_number, v_row.expiry_date,
            v_row.ref_no, v_note, true);
  end loop;
end;
$$;

grant execute on function public.cancel_stock_document(text, text) to authenticated;
