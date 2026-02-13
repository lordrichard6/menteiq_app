-- Create project_milestones table
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add milestone_id to tasks table to link tasks to milestones
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view milestones for their tenant" ON public.project_milestones
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert milestones for their tenant" ON public.project_milestones
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update milestones for their tenant" ON public.project_milestones
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete milestones for their tenant" ON public.project_milestones
    FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_project_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX idx_project_milestones_tenant_id ON public.project_milestones(tenant_id);
CREATE INDEX idx_tasks_milestone_id ON public.tasks(milestone_id);
