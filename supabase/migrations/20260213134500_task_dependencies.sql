-- Create task dependencies table for workflow enforcement
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent simple self-dependency
    CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
    -- Prevent duplicate dependencies
    UNIQUE(task_id, depends_on_task_id)
);

-- Index for dependency lookups
CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

-- Enable RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view dependencies for their tenant"
    ON public.task_dependencies FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage dependencies for their tenant"
    ON public.task_dependencies FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
