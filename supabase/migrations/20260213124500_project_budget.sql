-- Add budget tracking fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_currency TEXT DEFAULT 'CHF';

-- Add comment for documentation
COMMENT ON COLUMN public.projects.budget_amount IS 'The total allocated budget for the project';
COMMENT ON COLUMN public.projects.budget_currency IS 'The currency used for the project budget';
