-- Migration to add soft delete support to projects
-- Date: 2026-02-13

-- Add archived_at column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Create index for performance on active projects
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects (tenant_id) WHERE archived_at IS NULL;

-- Update RLS policies to handle archiving (optional but recommended for default views)
-- Note: Existing policies might already cover this if they are broad enough, 
-- but granular control is better.

DO $$ 
BEGIN
    -- Check if the policy exists before dropping/creating
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners view all projects in org' AND tablename = 'projects') THEN
        DROP POLICY "Owners view all projects in org" ON projects;
    END IF;
END $$;

-- Recreate policies with archive awareness if needed, 
-- though often we handle this in the application layer queries.
CREATE POLICY "Owners manage all projects in org" ON projects
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'owner' AND tenant_id = projects.tenant_id)
  );

-- Update activity log sequence if necessary (usually handled by triggers)
