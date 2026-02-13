-- Migration: 20260212180000_robust_signup.sql
-- Purpose: Ensure signup never fails due to trigger errors, and fix enum casting.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Get role from metadata or default to 'member'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      v_role::public.user_role
    );
  EXCEPTION WHEN OTHERS THEN
    -- If profile insertion fails, we still want the auth user to be created.
    -- We log the error to the postgres log but don't crash the transaction.
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the trigger is attached correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
