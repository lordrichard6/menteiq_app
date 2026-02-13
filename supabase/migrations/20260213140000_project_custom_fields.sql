-- Add custom fields support to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies if necessary (usually not needed if using existing broad per-tenant policies)
-- But ensuring indices for JSONB common queries could be helpful
CREATE INDEX IF NOT EXISTS idx_projects_custom_fields ON public.projects USING gin (custom_fields);
