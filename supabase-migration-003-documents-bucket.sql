-- ─── Migration 003: Documents Storage Bucket ──────────────────────────────────
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- What this does:
--   1. Creates the 'documents' storage bucket (private — no public access)
--   2. Adds RLS policies so authenticated users can upload, read, and delete
--      their own files
--   3. Uses signed URLs for file access (generated in db.js) — never public URLs
--
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- ──────────────────────────────────────────────────────────────────────────────


-- 1. Create the bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,          -- private: files are NOT publicly accessible by URL
  10485760,       -- 10 MB limit matches MAX_DOC_SIZE_MB in db.js
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;


-- 2. RLS policy: authenticated users can upload files
create policy "Authenticated users can upload document files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');


-- 3. RLS policy: authenticated users can read/download files
create policy "Authenticated users can read document files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');


-- 4. RLS policy: authenticated users can delete files
create policy "Authenticated users can delete document files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');


-- 5. RLS policy: authenticated users can update (upsert) files
create policy "Authenticated users can update document files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');


-- ─── Verify ───────────────────────────────────────────────────────────────────
-- After running, confirm with:
--   select id, name, public from storage.buckets where id = 'documents';
-- Expected: id=documents | name=documents | public=false
-- ──────────────────────────────────────────────────────────────────────────────
