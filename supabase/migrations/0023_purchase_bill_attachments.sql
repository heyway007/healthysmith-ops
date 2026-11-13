-- ============================================================================
-- 0023_purchase_bill_attachments.sql
-- ภาษีซื้อ: optional photos on a purchase (ใบเสร็จ / ใบแจ้งหนี้ / ใบส่งของ).
--
-- Files live in the private Storage bucket "purchase-attachments" as
--   <purchase_bill_id>/<uuid>.jpg        full image (resized in the browser,
--                                        longest side 2000px)
--   <purchase_bill_id>/<uuid>_thumb.jpg  small preview for lists
-- The app reads/writes them server-side with the service-role key, only after
-- the user's own (RLS-checked) query proves they can see the purchase, so the
-- bucket itself needs no storage.objects policies and stays closed to the
-- browser. Pictures are shown through short-lived signed URLs.
-- ============================================================================

create table public.purchase_bill_attachments (
  id               uuid primary key default gen_random_uuid(),
  purchase_bill_id uuid not null references public.purchase_bills (id) on delete cascade,
  storage_path     text not null unique,
  thumb_path       text,
  file_name        text,                        -- original name, for display
  mime_type        text not null default 'image/jpeg',
  size_bytes       integer,
  sort_order       integer not null default 0,
  created_by       uuid references public.employees (id),
  created_at       timestamptz not null default now()
);

create index idx_purchase_bill_attachments_bill
  on public.purchase_bill_attachments (purchase_bill_id, sort_order);

alter table public.purchase_bill_attachments enable row level security;
create policy purchase_bill_attachments_purchase_all on public.purchase_bill_attachments
  for all to authenticated
  using (public.has_role('purchase')) with check (public.has_role('purchase'));

select public.enable_audit('public.purchase_bill_attachments');

-- Private bucket; 3 MB per stored file is well above a resized 2000px JPEG
-- (usually 0.3-1 MB) and blocks anything that skipped the resize.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('purchase-attachments', 'purchase-attachments', false, 3 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
