-- Migration: Notifications System
-- Purpose: In-app notifications for tasks, invoices, mentions, and reminders
-- Date: 2026-02-11

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Notification content
    type TEXT NOT NULL, -- 'task_due', 'invoice_overdue', 'mention', 'reminder', 'system', etc.
    title TEXT NOT NULL,
    message TEXT,

    -- Related entity (optional)
    entity_type TEXT, -- 'contact', 'project', 'task', 'invoice', etc.
    entity_id UUID,
    entity_url TEXT, -- Deep link to the entity

    -- Status
    read BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT notifications_type_check CHECK (type IN (
        'task_due', 'task_overdue', 'invoice_due', 'invoice_overdue',
        'mention', 'comment', 'assignment', 'status_change',
        'reminder', 'system', 'welcome', 'update'
    ))
);

-- Create indexes for efficient querying
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Index for unread count queries
CREATE INDEX idx_notifications_unread_count ON public.notifications(user_id, read)
    WHERE read = FALSE AND archived = FALSE;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own notifications
CREATE POLICY notifications_select_policy ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_policy ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY notifications_insert_policy ON public.notifications
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- NEW: NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- In-app notification preferences
  enable_in_app boolean DEFAULT true,

  -- Email notification preferences
  enable_email boolean DEFAULT true,
  email_frequency text DEFAULT 'instant', -- 'instant', 'daily', 'weekly', 'never'

  -- Specific notification types
  notify_invoice_overdue boolean DEFAULT true,
  notify_task_due boolean DEFAULT true,
  notify_task_overdue boolean DEFAULT true,
  notify_follow_up boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view/update their own preferences
CREATE POLICY "Users view their own preferences" ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update their own preferences" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE public.notifications IS 'In-app notifications for users';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: task_due, invoice_overdue, mention, etc.';
COMMENT ON COLUMN public.notifications.title IS 'Notification title (shown in bold)';
COMMENT ON COLUMN public.notifications.message IS 'Optional detailed message';
COMMENT ON COLUMN public.notifications.entity_type IS 'Type of related entity (contact, project, task, etc.)';
COMMENT ON COLUMN public.notifications.entity_id IS 'UUID of related entity';
COMMENT ON COLUMN public.notifications.entity_url IS 'Deep link to navigate to the entity';
COMMENT ON COLUMN public.notifications.read IS 'Whether the notification has been read';
COMMENT ON COLUMN public.notifications.archived IS 'Whether the notification is archived';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional metadata (priority, action buttons, etc.)';

-- Function to create a notification
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

    -- If still null (e.g. seeding), skip notification
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

COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications from application code';

-- Function to check for overdue invoices and create notifications
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_invoice RECORD;
    v_user_id UUID;
BEGIN
    -- Find overdue unpaid invoices
    FOR v_invoice IN
        SELECT i.id, i.invoice_number, i.due_date, i.tenant_id, i.contact_id
        FROM public.invoices i
        WHERE i.status = 'sent'
        AND i.due_date < CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.entity_type = 'invoice'
            AND n.entity_id = i.id
            AND n.type = 'invoice_overdue'
            AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
        )
    LOOP
        -- Get the organization owner
        SELECT id INTO v_user_id
        FROM public.profiles
        WHERE tenant_id = v_invoice.tenant_id
        AND role = 'owner'
        LIMIT 1;

        IF v_user_id IS NOT NULL THEN
            -- Create notification
            PERFORM create_notification(
                v_user_id,
                'invoice_overdue',
                'Invoice Overdue',
                'Invoice ' || v_invoice.invoice_number || ' is overdue',
                'invoice',
                v_invoice.id,
                '/invoices/' || v_invoice.id
            );
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION check_overdue_invoices IS 'Check for overdue invoices and create notifications (run daily)';

-- Trigger to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_notification_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Grant access to authenticated users
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;
GRANT SELECT ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;
