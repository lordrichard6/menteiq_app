-- Add recurrence fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_interval TEXT CHECK (recurrence_interval IN ('monthly', 'quarterly', 'yearly', 'fixed_interval')),
ADD COLUMN IF NOT EXISTS next_occurrence_date DATE;

-- Index for scheduled tasks
CREATE INDEX idx_projects_next_occurrence ON public.projects(next_occurrence_date) WHERE is_recurring = true;
