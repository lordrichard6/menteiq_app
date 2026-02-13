-- Migration: Activity Log & Tracking
-- Purpose: Track all user actions for timeline and audit trail
-- Date: 2026-02-11

-- Create activity_log table
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Activity metadata
    event_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'emailed', 'called', 'noted', etc.
    entity_type TEXT NOT NULL, -- 'contact', 'project', 'task', 'invoice', 'document', etc.
    entity_id UUID NOT NULL, -- ID of the entity that was acted upon
    entity_name TEXT, -- Cached name for display (e.g., contact name, project title)

    -- Activity details
    description TEXT, -- Human-readable description: "Updated contact status from Lead to Client"
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for changes, old/new values, etc.

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT activity_log_event_type_check CHECK (event_type IN (
        'created', 'updated', 'deleted', 'viewed',
        'emailed', 'called', 'noted', 'tagged',
        'status_changed', 'assigned', 'completed',
        'invoiced', 'paid', 'uploaded', 'downloaded'
    ))
);

-- Create indexes for efficient querying
CREATE INDEX idx_activity_log_tenant_id ON public.activity_log(tenant_id);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_tenant_created ON public.activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_activity_log_entity_created ON public.activity_log(entity_type, entity_id, created_at DESC);

-- Composite index for contact timeline queries
CREATE INDEX idx_activity_log_contact_timeline ON public.activity_log(entity_type, entity_id, created_at DESC)
    WHERE entity_type = 'contact';

-- Enable Row Level Security
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view activity logs for their organization
CREATE POLICY activity_log_select_policy ON public.activity_log
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- Users can insert activity logs for their organization
CREATE POLICY activity_log_insert_policy ON public.activity_log
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- No updates or deletes - activity log is append-only for audit trail

-- Add comments for documentation
COMMENT ON TABLE public.activity_log IS 'Append-only activity log for audit trail and timeline features';
COMMENT ON COLUMN public.activity_log.event_type IS 'Type of action: created, updated, deleted, emailed, etc.';
COMMENT ON COLUMN public.activity_log.entity_type IS 'Type of entity: contact, project, task, invoice, etc.';
COMMENT ON COLUMN public.activity_log.entity_id IS 'UUID of the entity that was acted upon';
COMMENT ON COLUMN public.activity_log.entity_name IS 'Cached entity name for display without joins';
COMMENT ON COLUMN public.activity_log.description IS 'Human-readable activity description';
COMMENT ON COLUMN public.activity_log.metadata IS 'Flexible JSONB storage for changes, old/new values, etc.';

-- Create view for recent activity with user names
CREATE OR REPLACE VIEW public.activity_feed AS
SELECT
    al.id,
    al.tenant_id,
    al.user_id,
    al.event_type,
    al.entity_type,
    al.entity_id,
    al.entity_name,
    al.description,
    al.metadata,
    al.created_at,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar
FROM public.activity_log al
LEFT JOIN public.profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.activity_feed IS 'Activity log with user information for display';

-- Grant access to authenticated users
GRANT SELECT ON public.activity_log TO authenticated;
GRANT INSERT ON public.activity_log TO authenticated;
GRANT SELECT ON public.activity_feed TO authenticated;

-- Function to automatically log activity
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
        -- During seeding or migrations, we might not have a session user.
        -- We skip logging if we can't associate it with a tenant.
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

COMMENT ON FUNCTION log_activity IS 'Helper function to log activity from application code';

-- Example trigger function for automatic logging (can be attached to tables)
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
    IF NEW.is_company THEN
        v_entity_name := NEW.company_name;
    ELSE
        v_entity_name := NEW.first_name || ' ' || NEW.last_name;
    END IF;

    -- Log based on operation
    IF TG_OP = 'INSERT' THEN
        v_description := 'Created contact: ' || v_entity_name;
        PERFORM log_activity('created', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if significant fields changed
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_description := 'Changed status from ' || OLD.status || ' to ' || NEW.status;
            PERFORM log_activity('status_changed', 'contact', NEW.id, v_entity_name, v_description,
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status), NEW.tenant_id);
        ELSIF OLD.first_name IS DISTINCT FROM NEW.first_name OR OLD.last_name IS DISTINCT FROM NEW.last_name THEN
            v_description := 'Updated contact details';
            PERFORM log_activity('updated', 'contact', NEW.id, v_entity_name, v_description, '{}'::jsonb, NEW.tenant_id);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_description := 'Deleted contact: ' || v_entity_name;
        PERFORM log_activity('deleted', 'contact', OLD.id, v_entity_name, v_description, '{}'::jsonb, OLD.tenant_id);
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to contacts table
DROP TRIGGER IF EXISTS contacts_activity_log_trigger ON public.contacts;
CREATE TRIGGER contacts_activity_log_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_contact_activity();

COMMENT ON FUNCTION trigger_log_contact_activity IS 'Automatically logs contact-related activities';
