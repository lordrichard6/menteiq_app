
-- Migration: 20260212190000_repair_tenant_id.sql
-- Purpose: Repair missing tenant_id for owners and automate organization creation for new signups.

BEGIN;

-- 1. DATA REPAIR for existing owners without a tenant
-- Link them to the first available organization if none is assigned
DO $$
DECLARE
    v_default_tenant_id UUID;
BEGIN
    SELECT id INTO v_default_tenant_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    
    IF v_default_tenant_id IS NOT NULL THEN
        UPDATE public.profiles
        SET tenant_id = v_default_tenant_id
        WHERE role = 'owner' AND tenant_id IS NULL;
    END IF;
END $$;

-- 2. IMPROVED SIGNUP TRIGGER
-- Automatically creates an organization for new owners if none is provided.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_tenant_id UUID;
  v_org_name TEXT;
BEGIN
  -- Get role from metadata or default to 'member'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  
  -- Get tenant_id from metadata
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- Create a new organization for new 'owner' if no tenant_id exists
  IF v_role = 'owner' AND v_tenant_id IS NULL THEN
    v_org_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workshop') || ' Workspace';
    
    INSERT INTO public.organizations (name, slug)
    VALUES (v_org_name, 'org-' || substring(NEW.id::text, 1, 8))
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Insert profile
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, tenant_id)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      v_role::public.user_role,
      v_tenant_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
