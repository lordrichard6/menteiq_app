-- Migration: 20260307000000_platform_admin.sql
-- Purpose: Add platform_admin role, auto-assign to paulolopesreizinho@gmail.com,
--          and update the new-user trigger to recognise the admin email.

BEGIN;

-- 1. Extend the role enum with the new value
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_admin';

COMMIT;

-- NOTE: ALTER TYPE … ADD VALUE cannot run inside a transaction that also modifies
--       data using the new value on some Postgres versions. We commit above first,
--       then do the rest in a second transaction.

BEGIN;

-- 2. Update the trigger so that paulolopesreizinho@gmail.com always gets
--    platform_admin on signup (in case they haven't signed up yet).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Platform admin email always gets platform_admin role
  IF NEW.email = 'paulolopesreizinho@gmail.com' THEN
    v_role := 'platform_admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      v_role::public.user_role
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. If the user already exists in profiles, elevate them now.
UPDATE public.profiles
SET role = 'platform_admin'::public.user_role
WHERE email = 'paulolopesreizinho@gmail.com';

COMMIT;
