-- ============================================================================
-- 0025_company_logo_bucket.sql
-- เอกสารภาษี: company logo upload (ข้อมูลบริษัท).
--
-- The logo is printed on every tax invoice / stock document, so it lives in a
-- PUBLIC bucket and companies.logo_url holds its permanent public URL. Only the
-- app (service-role key, admin role checked in the server action) can write to
-- it -- no storage.objects policies are added, so the browser cannot upload.
-- The app also creates this bucket on first upload if it is missing.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-assets', 'company-assets', true, 2 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
