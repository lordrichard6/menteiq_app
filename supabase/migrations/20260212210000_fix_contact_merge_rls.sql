-- Migration: 20260212210000_fix_contact_merge_rls.sql
-- Purpose: Fix RLS policy blocking contact archival during merge
-- Author: Antigravity

BEGIN;

-- 1. Remove the restrictive policy that forced archived_at IS NULL on ALL operations
DROP POLICY IF EXISTS "Owners view all contacts in org" ON public.contacts;

-- 2. Implement granular policies for better control and debugging

-- SELECT: Owners can see all contacts (including archived)
-- Application logic/Views handle the filtering for 'trash' vs 'active'
CREATE POLICY "Owners select contacts" ON public.contacts
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
  );

-- INSERT: Owners can create contacts
CREATE POLICY "Owners insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- UPDATE: Owners can update any field, and are allowed to archive/unarchive
CREATE POLICY "Owners update contacts" ON public.contacts
  FOR UPDATE USING (
    tenant_id = get_current_tenant_id()
  ) WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- DELETE: Owners can perform hard deletes
CREATE POLICY "Owners delete contacts" ON public.contacts
  FOR DELETE USING (
    tenant_id = get_current_tenant_id()
  );

COMMIT;
