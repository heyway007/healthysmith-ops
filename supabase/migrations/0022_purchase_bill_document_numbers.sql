-- ============================================================================
-- 0022_purchase_bill_document_numbers.sql
-- ภาษีซื้อ: record the supplier's invoice (ใบแจ้งหนี้) and delivery note
-- (ใบส่งของ) numbers alongside the receipt number already kept in
-- supplier_invoice_number (shown as "เลขที่ใบเสร็จ").
-- ============================================================================
alter table public.purchase_bills
  add column invoice_number       text,   -- เลขที่ใบแจ้งหนี้
  add column delivery_note_number text;   -- เลขที่ใบส่งของ
