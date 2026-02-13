-- Migration: Fix sign-up role assignment
-- Purpose: Allow the sign-up flow to specify if a user is an 'owner' vs 'member'
-- This avoids redirect loops to the client portal for new CRM admins.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    -- Check if a specific role was passed in metadata, otherwise default to 'member'
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply the trigger to ensure it uses the updated function
-- (Though handle_new_user is usually already tied to the trigger, this is safer)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
