-- ============================================================================
-- 0024_purchase_attachments_pdf.sql
-- ภาษีซื้อ: allow PDF files (e.g. e-Tax invoices, scanned documents) next to
-- photos. PDFs can't be shrunk in the browser like photos, so the per-file
-- limit goes up to 5 MB; photos are still resized to well under 3 MB by the app.
-- ============================================================================
update storage.buckets
set file_size_limit    = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'purchase-attachments';
