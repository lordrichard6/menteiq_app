-- Migration: 20260212170000_incremental_robustness_fix.sql
-- Purpose: Apply fixes for sign-up and seeding without requiring a database reset.

-- 1. Make user_id nullable in logs (supports system-level actions/seeding)
ALTER TABLE public.activity_log ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update log_activity to be robust (skips errors if tenant_id is missing)
CREATE OR REPLACE FUNCTION log_activity(
    p_event_type TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_entity_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_activity_id UUID;
BEGIN
    -- Use provided tenant_id or get from user's profile
    v_tenant_id := p_tenant_id;
    
    IF v_tenant_id IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM public.profiles
        WHERE id = auth.uid();
    END IF;

    -- If still null (e.g. system seed or background process), skip or handle gracefully
    IF v_tenant_id IS NULL THEN
        -- We skip logging if we can't associate it with a tenant (e.g. during signup/seed)
        RETURN NULL;
    END IF;

    -- Insert activity log
    INSERT INTO public.activity_log (
        tenant_id,
        user_id,
        event_type,
        entity_type,
        entity_id,
        entity_name,
        description,
        metadata
    ) VALUES (
        v_tenant_id,
        auth.uid(),
        p_event_type,
        p_entity_type,
        p_entity_id,
        p_entity_name,
        p_description,
        p_metadata
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$;

-- 3. Update create_notification to be robust
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_entity_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_notification_id UUID;
BEGIN
    -- Get user's tenant_id
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = p_user_id;

    -- If still null (e.g. seeding/signup), skip notification
    IF v_tenant_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Insert notification
    INSERT INTO public.notifications (
        tenant_id,
        user_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        entity_url,
        metadata
    ) VALUES (
        v_tenant_id,
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id,
        p_entity_url,
        p_metadata
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- 4. Ensure we pass tenant_id in the contact trigger
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
        IF (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL) OR (NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL) THEN
             v_description := 'Archived contact: ' || v_entity_name;
             PERFORM log_activity('deleted', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
        ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
             v_description := 'Restored contact: ' || v_entity_name;
             PERFORM log_activity('created', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
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
