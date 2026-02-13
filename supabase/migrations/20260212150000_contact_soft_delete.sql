/*
  Migration: Contact Archiving (Soft Delete)
  Purpose: Allow "deleting" contacts without breaking database referential integrity for invoices and projects.
  Date: 2026-02-12
*/

-- 1. Add archived_at column to contacts
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Update RLS policies for contacts to filter out archived records by default
-- Note: Profiles/Admins might still want to see archived contacts in a separate "Trash" view later,
-- but for now, we hide them from the main list.

DROP POLICY IF EXISTS "Owners view all contacts in org" ON public.contacts;
CREATE POLICY "Owners view all contacts in org" ON public.contacts
  FOR ALL USING (
    tenant_id = get_current_tenant_id()
    AND archived_at IS NULL
  );

-- 3. Create a view for active (non-archived) contacts
CREATE OR REPLACE VIEW public.active_contacts AS
  SELECT * FROM public.contacts WHERE archived_at IS NULL;

-- 4. Create a view for archived contacts
CREATE OR REPLACE VIEW public.archived_contacts AS
  SELECT * FROM public.contacts WHERE archived_at IS NOT NULL;

-- 5. Update the manual trigger log function to reflect archiving
CREATE OR REPLACE FUNCTION trigger_log_contact_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_description TEXT;
    v_entity_name TEXT;
BEGIN
    -- Determine entity name
    IF COALESCE(NEW.is_company, OLD.is_company) THEN
        v_entity_name := COALESCE(NEW.company_name, OLD.company_name);
    ELSE
        v_entity_name := COALESCE(NEW.first_name, OLD.first_name) || ' ' || COALESCE(NEW.last_name, OLD.last_name);
    END IF;

    -- Log based on operation
    IF TG_OP = 'INSERT' THEN
        v_description := 'Created contact: ' || v_entity_name;
        PERFORM log_activity('created', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if it was archived
        IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
            v_description := 'Archived contact: ' || v_entity_name;
            PERFORM log_activity('deleted', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
        -- Check if it was restored
        ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
            v_description := 'Restored contact: ' || v_entity_name;
            PERFORM log_activity('created', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
        -- Regular updates
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
            v_description := 'Changed status from ' || OLD.status || ' to ' || NEW.status;
            PERFORM log_activity('status_changed', 'contact', NEW.id, v_entity_name, v_description,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status), NEW.tenant_id);
        ELSIF OLD.first_name IS DISTINCT FROM NEW.first_name OR OLD.last_name IS DISTINCT FROM NEW.last_name THEN
            v_description := 'Updated contact details';
            PERFORM log_activity('updated', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_description := 'Hard deleted contact: ' || v_entity_name;
        PERFORM log_activity('deleted', 'contact', OLD.id, v_entity_name, v_description, '{}'::jsonb, OLD.tenant_id);
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;
