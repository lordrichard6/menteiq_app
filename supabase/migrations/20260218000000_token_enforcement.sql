-- =============================================================================
-- Migration: Token Enforcement System
-- Date: 2026-02-18
--
-- Adds the enforcement layer on top of the existing token_usage tracking.
-- Changes to organizations table:
--   • subscription_tier extended to include 'enterprise'
--   • token_balance        — monthly effective-token pool (decremented on use)
--   • token_pack_balance   — extra tokens from purchased packs (depleted first)
--   • token_daily_balance  — free-tier daily cap (resets at midnight UTC)
--   • token_daily_reset_at — timestamp of last daily reset
--   • current_period_start / current_period_end — billing window
--
-- New DB functions:
--   check_and_deduct_tokens()  — atomic pre-flight check + deduction
--   reset_free_daily_tokens()  — cron: midnight UTC, free tier only
--   reset_monthly_tokens()     — cron: 1st of month, all tiers
-- =============================================================================

-- ─── 1. Extend subscription_tier enum ────────────────────────────────────────
-- Add 'enterprise' only if it doesn't already exist
DO $$
BEGIN
  -- Check if the constraint/enum allows 'enterprise'; if organizations uses TEXT just insert.
  -- If the column is a plain TEXT column, this is a no-op.
  -- If you later switch to an ENUM type, re-run this migration.
  NULL;
END $$;

-- ─── 2. Add enforcement columns to organizations ──────────────────────────────
ALTER TABLE public.organizations
  -- Monthly pool: effective tokens remaining this billing period
  ADD COLUMN IF NOT EXISTS token_balance         INTEGER      NOT NULL DEFAULT 1000,
  -- Purchased pack balance (depleted before plan balance)
  ADD COLUMN IF NOT EXISTS token_pack_balance    INTEGER      NOT NULL DEFAULT 0,
  -- Free-tier only: daily allowance remaining
  ADD COLUMN IF NOT EXISTS token_daily_balance   INTEGER      NOT NULL DEFAULT 100,
  -- When the daily balance was last reset (UTC)
  ADD COLUMN IF NOT EXISTS token_daily_reset_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Billing period boundaries (set by Stripe webhook or manually)
  ADD COLUMN IF NOT EXISTS current_period_start  TIMESTAMPTZ  NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  ADD COLUMN IF NOT EXISTS current_period_end    TIMESTAMPTZ  NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month');

-- Add check constraints
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS org_token_balance_check,
  DROP CONSTRAINT IF EXISTS org_token_pack_balance_check,
  DROP CONSTRAINT IF EXISTS org_token_daily_balance_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT org_token_balance_check       CHECK (token_balance >= 0),
  ADD CONSTRAINT org_token_pack_balance_check  CHECK (token_pack_balance >= 0),
  ADD CONSTRAINT org_token_daily_balance_check CHECK (token_daily_balance >= 0);

-- ─── 3. Tier allocation constants (easy to update) ───────────────────────────
-- These match src/lib/pricing/index.ts — update both places together.
-- Free: 1,000/mo, 100/day  |  Pro: 50,000/mo  |  Business: 200,000/mo  |  Enterprise: 500,000/mo

-- ─── 4. Core function: check_and_deduct_tokens() ─────────────────────────────
-- Called from /api/chat BEFORE streaming starts.
-- Returns JSON: { allowed: bool, reason: text, remaining: int }
-- Pack balance is depleted first (user paid for it), then plan balance.
-- Free tier also checks daily cap.
CREATE OR REPLACE FUNCTION public.check_and_deduct_tokens(
  p_tenant_id    UUID,
  p_tokens       INTEGER   -- effective tokens (real × model multiplier)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org             RECORD;
  v_remaining       INTEGER;
  v_pack_deduct     INTEGER;
  v_balance_deduct  INTEGER;
  v_tier            TEXT;
BEGIN
  -- Lock the row to prevent concurrent over-spend
  SELECT
    subscription_tier,
    token_balance,
    token_pack_balance,
    token_daily_balance,
    token_daily_reset_at
  INTO v_org
  FROM public.organizations
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'organization_not_found', 'remaining', 0);
  END IF;

  v_tier := COALESCE(v_org.subscription_tier, 'free');

  -- ── Free tier: reset daily balance if it's a new day (UTC) ──
  IF v_tier = 'free' THEN
    IF v_org.token_daily_reset_at::DATE < NOW()::DATE THEN
      UPDATE public.organizations
      SET token_daily_balance  = 100,
          token_daily_reset_at = NOW()
      WHERE id = p_tenant_id;

      v_org.token_daily_balance := 100;
    END IF;

    -- Daily cap check
    IF v_org.token_daily_balance < p_tokens THEN
      RETURN jsonb_build_object(
        'allowed',    false,
        'reason',     'daily_limit_exceeded',
        'remaining',  v_org.token_daily_balance,
        'reset_type', 'daily'
      );
    END IF;
  END IF;

  -- ── Monthly pool check (all tiers) ──
  v_remaining := v_org.token_pack_balance + v_org.token_balance;

  IF v_remaining < p_tokens THEN
    RETURN jsonb_build_object(
      'allowed',    false,
      'reason',     'monthly_limit_exceeded',
      'remaining',  v_remaining,
      'reset_type', 'monthly'
    );
  END IF;

  -- ── Deduct: pack first, then plan balance ──
  IF v_org.token_pack_balance >= p_tokens THEN
    v_pack_deduct    := p_tokens;
    v_balance_deduct := 0;
  ELSE
    v_pack_deduct    := v_org.token_pack_balance;
    v_balance_deduct := p_tokens - v_org.token_pack_balance;
  END IF;

  UPDATE public.organizations
  SET
    token_pack_balance   = token_pack_balance   - v_pack_deduct,
    token_balance        = token_balance        - v_balance_deduct,
    token_daily_balance  = CASE
      WHEN subscription_tier = 'free' THEN token_daily_balance - p_tokens
      ELSE token_daily_balance
    END
  WHERE id = p_tenant_id;

  RETURN jsonb_build_object(
    'allowed',   true,
    'reason',    'ok',
    'remaining', v_remaining - p_tokens
  );
END;
$$;

COMMENT ON FUNCTION public.check_and_deduct_tokens IS
  'Atomic token check + deduction. Depletes pack balance before plan balance. Returns {allowed, reason, remaining}.';

-- ─── 5. Refund function (called if stream errors before completion) ───────────
CREATE OR REPLACE FUNCTION public.refund_tokens(
  p_tenant_id UUID,
  p_tokens    INTEGER,
  p_tier      TEXT DEFAULT 'free'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organizations
  SET
    token_balance       = token_balance + p_tokens,
    token_daily_balance = CASE
      WHEN p_tier = 'free' THEN token_daily_balance + p_tokens
      ELSE token_daily_balance
    END
  WHERE id = p_tenant_id;
END;
$$;

-- ─── 6. Monthly reset function ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_monthly_tokens()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organizations
  SET
    token_balance = CASE subscription_tier
      WHEN 'free'       THEN 1000
      WHEN 'pro'        THEN 50000
      WHEN 'business'   THEN 200000
      WHEN 'enterprise' THEN 500000
      ELSE 1000
    END,
    current_period_start = DATE_TRUNC('month', NOW()),
    current_period_end   = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  WHERE subscription_tier IN ('free', 'pro', 'business', 'enterprise');

  RAISE LOG 'Monthly token reset completed at %', NOW();
END;
$$;

COMMENT ON FUNCTION public.reset_monthly_tokens IS
  'Resets token_balance for all orgs to their tier allocation. Run via pg_cron on 1st of month.';

-- ─── 7. Daily free-tier reset function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_free_daily_tokens()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organizations
  SET
    token_daily_balance  = 100,
    token_daily_reset_at = NOW()
  WHERE subscription_tier = 'free';

  RAISE LOG 'Free-tier daily token reset completed at %', NOW();
END;
$$;

COMMENT ON FUNCTION public.reset_free_daily_tokens IS
  'Resets daily token cap for free-tier orgs. Run via pg_cron at midnight UTC.';

-- ─── 8. pg_cron scheduled jobs ────────────────────────────────────────────────
-- Requires pg_cron extension (enabled by default on Supabase).
-- If pg_cron is not available, set these up as Supabase Edge Function cron triggers.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Monthly reset: 1st of every month at 00:05 UTC (5 min after midnight)
    PERFORM cron.schedule(
      'reset-monthly-tokens',
      '5 0 1 * *',
      'SELECT public.reset_monthly_tokens()'
    );

    -- Daily reset for free tier: every day at 00:01 UTC
    PERFORM cron.schedule(
      'reset-free-daily-tokens',
      '1 0 * * *',
      'SELECT public.reset_free_daily_tokens()'
    );

    RAISE LOG 'pg_cron jobs scheduled: reset-monthly-tokens and reset-free-daily-tokens';
  ELSE
    RAISE NOTICE 'pg_cron not available. Schedule reset_monthly_tokens() and reset_free_daily_tokens() via Supabase Dashboard > Edge Functions > Cron.';
  END IF;
END $$;

-- ─── 9. RPC grants so authenticated clients can call these functions ──────────
GRANT EXECUTE ON FUNCTION public.check_and_deduct_tokens(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_tokens(UUID, INTEGER, TEXT)      TO authenticated;
-- reset functions are internal only (no grant to authenticated)

-- ─── 10. Initialize existing orgs to their current tier allocation ────────────
UPDATE public.organizations
SET token_balance = CASE subscription_tier
  WHEN 'free'       THEN 1000
  WHEN 'pro'        THEN 50000
  WHEN 'business'   THEN 200000
  WHEN 'enterprise' THEN 500000
  ELSE 1000
END
WHERE token_balance = 1000  -- only touch orgs still at default
  AND subscription_tier IN ('pro', 'business', 'enterprise');
