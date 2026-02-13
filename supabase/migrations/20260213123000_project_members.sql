-- Create project_members table for team collaboration
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'contributor', 'viewer')) DEFAULT 'contributor',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view project members of their tenant" 
ON public.project_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.profiles prof ON prof.tenant_id = p.tenant_id
        WHERE p.id = project_members.project_id
        AND prof.id = auth.uid()
    )
);

CREATE POLICY "Managers can manage project members" 
ON public.project_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'manager'
    )
    OR
    EXISTS (
        -- Owners/Admins of the tenant can also manage members
        SELECT 1 FROM public.projects p
        JOIN public.profiles prof ON prof.tenant_id = p.tenant_id
        WHERE p.id = project_members.project_id
        AND prof.id = auth.uid()
        AND prof.role IN ('owner', 'admin')
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
