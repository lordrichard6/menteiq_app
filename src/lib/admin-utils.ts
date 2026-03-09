/**
 * Shared constants and helpers for the platform admin dashboard.
 * Import from here instead of defining locally in each page.
 */

// ─── Tier styling ─────────────────────────────────────────────────────────────

/** Badge background/text colours for subscription tiers */
export const TIER_COLORS: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    pro: 'bg-blue-100 text-blue-700',
    business: 'bg-purple-100 text-purple-700',
}

/** Inline text colours for subscription tiers (used in org join cells) */
export const TIER_TEXT_COLORS: Record<string, string> = {
    free: 'text-slate-400',
    pro: 'text-blue-600',
    business: 'text-purple-600',
}

// ─── Subscription status ──────────────────────────────────────────────────────

export type SubscriptionStatus = 'free' | 'active' | 'expired'

/**
 * Derive subscription status from tier + period-end timestamp.
 * - free  → always 'free'
 * - paid  → 'active' when current_period_end is null (legacy/manual) or in the future
 * - paid  → 'expired' when current_period_end is in the past
 */
export function getSubscriptionStatus(
    tier: string,
    currentPeriodEnd: string | null
): SubscriptionStatus {
    if (tier === 'free') return 'free'
    if (!currentPeriodEnd) return 'active'
    return new Date(currentPeriodEnd) > new Date() ? 'active' : 'expired'
}

export const STATUS_COLORS: Record<SubscriptionStatus, string> = {
    free: 'text-slate-400',
    active: 'text-emerald-600',
    expired: 'text-red-500',
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
    free: 'Free',
    active: 'Active',
    expired: 'Expired',
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatAdminDate(iso: string | null | undefined): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}
