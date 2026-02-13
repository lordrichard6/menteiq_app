-- Migration: AI Token Usage Tracking
-- Purpose: Track token consumption per conversation for billing and analytics
-- Date: 2026-02-11

-- Create token_usage table
CREATE TABLE IF NOT EXISTS public.token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,

    -- Model information
    model TEXT NOT NULL, -- e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022'
    provider TEXT NOT NULL, -- 'OpenAI', 'Anthropic', 'Google'

    -- Token counts
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,

    -- Cost tracking (in cents to avoid float precision issues)
    estimated_cost_cents INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes for efficient querying
    CONSTRAINT token_usage_tokens_check CHECK (total_tokens >= 0)
);

-- Create indexes for common queries
CREATE INDEX idx_token_usage_tenant_id ON public.token_usage(tenant_id);
CREATE INDEX idx_token_usage_user_id ON public.token_usage(user_id);
CREATE INDEX idx_token_usage_conversation_id ON public.token_usage(conversation_id);
CREATE INDEX idx_token_usage_created_at ON public.token_usage(created_at DESC);
CREATE INDEX idx_token_usage_tenant_date ON public.token_usage(tenant_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view token usage for their organization
CREATE POLICY token_usage_select_policy ON public.token_usage
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- Only system/service can insert token usage (via API with service role)
CREATE POLICY token_usage_insert_policy ON public.token_usage
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.token_usage IS 'Tracks AI model token consumption for billing and analytics';
COMMENT ON COLUMN public.token_usage.model IS 'The specific AI model used (e.g., gpt-4o, claude-3-5-sonnet)';
COMMENT ON COLUMN public.token_usage.provider IS 'AI provider: OpenAI, Anthropic, or Google';
COMMENT ON COLUMN public.token_usage.prompt_tokens IS 'Number of tokens in the user prompt';
COMMENT ON COLUMN public.token_usage.completion_tokens IS 'Number of tokens in the AI response';
COMMENT ON COLUMN public.token_usage.total_tokens IS 'Total tokens used (prompt + completion)';
COMMENT ON COLUMN public.token_usage.estimated_cost_cents IS 'Estimated cost in cents (divide by 100 for dollars)';

-- Create a view for aggregated token usage by organization
CREATE OR REPLACE VIEW public.token_usage_summary AS
SELECT
    tenant_id,
    DATE_TRUNC('month', created_at) AS month,
    provider,
    model,
    COUNT(*) AS request_count,
    SUM(prompt_tokens) AS total_prompt_tokens,
    SUM(completion_tokens) AS total_completion_tokens,
    SUM(total_tokens) AS total_tokens,
    SUM(estimated_cost_cents) AS total_cost_cents,
    ROUND(SUM(estimated_cost_cents) / 100.0, 2) AS total_cost_usd
FROM public.token_usage
GROUP BY tenant_id, DATE_TRUNC('month', created_at), provider, model
ORDER BY month DESC, tenant_id, provider, model;

COMMENT ON VIEW public.token_usage_summary IS 'Monthly aggregated token usage and costs by organization';

-- Grant access to authenticated users
GRANT SELECT ON public.token_usage TO authenticated;
GRANT INSERT ON public.token_usage TO authenticated;
GRANT SELECT ON public.token_usage_summary TO authenticated;
