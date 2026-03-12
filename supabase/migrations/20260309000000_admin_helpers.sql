-- Migration: 20260309000000_admin_helpers.sql
-- Purpose: Add admin_token_usage_this_month() for efficient server-side SUM
--          (avoids PostgREST 1000-row default limit on client-side aggregation)

CREATE OR REPLACE FUNCTION public.admin_token_usage_this_month(start_date timestamptz)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(effective_tokens), 0)::bigint
  FROM usage_logs
  WHERE created_at >= start_date;
$$;

-- Grant to service_role so the admin API routes can call it via the admin client
GRANT EXECUTE ON FUNCTION public.admin_token_usage_this_month(timestamptz) TO service_role;
