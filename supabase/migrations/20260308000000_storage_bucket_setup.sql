-- Migration: Create documents storage bucket + fix RLS policies
-- Date: 2026-03-08
--
-- Context: The storage bucket was previously described as a manual dashboard step
-- in docs/RAG_SETUP.md. Additionally, the RLS policies in that doc incorrectly
-- referenced `org_id` — the actual column on `profiles` is `tenant_id`.
-- This migration makes the setup fully automated and correct.

-- =====================================================
-- 1. Create the documents storage bucket (idempotent)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,     -- private: files are never publicly accessible
  10485760,  -- 10 MB limit (matches app-level validation)
  NULL       -- MIME types validated in application code, not at bucket level
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Drop any existing policies (incl. broken org_id ones)
-- =====================================================
-- Note: RLS is already enabled on storage.objects in Supabase hosted env.
-- The ALTER TABLE statement is not needed and would fail (not owner of table).

-- Drop broken policies that referenced non-existent `org_id` column
DROP POLICY IF EXISTS "Users can upload documents to their org"    ON storage.objects;
DROP POLICY IF EXISTS "Users can read their org's documents"        ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their org's documents"      ON storage.objects;

-- Drop any correct policies in case we're re-running (idempotent)
DROP POLICY IF EXISTS "Users can upload documents to their tenant"  ON storage.objects;
DROP POLICY IF EXISTS "Users can read their tenant's documents"     ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their tenant's documents"   ON storage.objects;

-- Drop any temp permissive policy that may have been created for debugging
DROP POLICY IF EXISTS "temp_allow_all" ON storage.objects;

-- =====================================================
-- 4. Create correct RLS policies using tenant_id
-- =====================================================
-- The storage path pattern is: {tenant_id}/{timestamp}-{random}-{filename}
-- So (storage.foldername(name))[1] extracts the first path segment = tenant_id

-- INSERT: authenticated users can upload to their tenant's folder
CREATE POLICY "Users can upload documents to their tenant"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- SELECT: authenticated users can read from their tenant's folder
CREATE POLICY "Users can read their tenant's documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- DELETE: authenticated users can delete from their tenant's folder
CREATE POLICY "Users can delete their tenant's documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);
