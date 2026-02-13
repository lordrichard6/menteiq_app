
-- Migration: 20260212200000_clean_slate.sql
-- Purpose: Provide a clean workspace for the admin user by creating a new empty organization.

BEGIN;

-- 1. Create a fresh organization
-- This will be the user's actual workspace
INSERT INTO public.organizations (name, slug, subscription_tier)
VALUES ('Lopes2Tech Workspace', 'lopes2tech-main', 'pro');

-- 2. Link the admin user to this new organization
-- We use the email to identify the user
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.organizations WHERE slug = 'lopes2tech-main')
WHERE email = 'admin@lopes2tech.ch';

COMMIT;
