-- Migration: 20260312000000_admin_audit_log.sql
-- Purpose: Create the admin_audit_log table for tracking platform admin actions.
--          Rows are append-only — no UPDATE or DELETE is permitted by RLS.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    admin_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action      text NOT NULL,            -- e.g. 'delete_organization', 'update_tier'
    target_type text NOT NULL,            -- 'organization' | 'user'
    target_id   text NOT NULL,            -- UUID of the target row
    details     jsonb DEFAULT '{}'::jsonb -- arbitrary metadata
);

-- Index for fast time-based queries
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
    ON public.admin_audit_log (created_at DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx
    ON public.admin_audit_log (action);

-- Enable RLS — only platform_admin can SELECT; service_role (API routes) can INSERT
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view audit log"
    ON public.admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'platform_admin'
        )
    );

-- No client-facing INSERT/UPDATE/DELETE policies — all writes go through
-- service_role via the API routes (which bypass RLS entirely).
