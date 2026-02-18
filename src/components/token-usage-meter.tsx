'use client'

/**
 * TokenUsageMeter
 *
 * Shows the organisation's current AI token balance in the chat sidebar or
 * settings page. Fetches data on mount; no real-time subscription needed.
 *
 * Visual states:
 *   healthy  (>20% remaining) — green
 *   warning  (5–20%)          — amber
 *   critical (<5%)            — red + upgrade CTA
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tiers, type SubscriptionTier } from '@/lib/pricing'
import { Zap, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface TokenData {
  tier: SubscriptionTier
  balance: number
  packBalance: number
  dailyBalance: number
  allocation: number
  dailyCap: number
}

function useTokenData() {
  const [data, setData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) { setLoading(false); return }

      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_tier, token_balance, token_pack_balance, token_daily_balance')
        .eq('id', profile.tenant_id)
        .single()

      if (!org) { setLoading(false); return }

      const tier = (org.subscription_tier ?? 'free') as SubscriptionTier
      const tierCfg = tiers[tier]

      setData({
        tier,
        balance:      org.token_balance      ?? 0,
        packBalance:  org.token_pack_balance  ?? 0,
        dailyBalance: org.token_daily_balance ?? 0,
        allocation:   tierCfg.tokenAllocation,
        dailyCap:     tierCfg.dailyCap,
      })
      setLoading(false)
    }

    fetch()
  }, [])

  return { data, loading }
}

function ProgressBar({ pct, color }: { pct: number; color: 'green' | 'amber' | 'red' }) {
  const bg = { green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500' }[color]
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${bg}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function TokenUsageMeter({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useTokenData()

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg bg-slate-50 p-3 space-y-2">
        <div className="h-3 w-24 bg-slate-200 rounded" />
        <div className="h-1.5 w-full bg-slate-200 rounded-full" />
      </div>
    )
  }

  if (!data) return null

  const { tier, balance, packBalance, dailyBalance, allocation, dailyCap } = data
  const tierCfg = tiers[tier]
  const isFree = tier === 'free'
  const total = balance + packBalance

  // Monthly meter
  const monthlyPct = allocation > 0 ? (total / allocation) * 100 : 100
  const monthlyColor: 'green' | 'amber' | 'red' =
    monthlyPct > 20 ? 'green' : monthlyPct > 5 ? 'amber' : 'red'

  // Daily meter (free only)
  const dailyPct = dailyCap > 0 ? (dailyBalance / dailyCap) * 100 : 100
  const dailyColor: 'green' | 'amber' | 'red' =
    dailyPct > 20 ? 'green' : dailyPct > 5 ? 'amber' : 'red'

  const isExhausted = total <= 0
  const isWarning   = monthlyPct <= 20
  const nextTier    = tierCfg.id !== 'enterprise'
    ? tiers[['free', 'pro', 'business', 'enterprise'][
        ['free', 'pro', 'business', 'enterprise'].indexOf(tier) + 1
      ] as SubscriptionTier]
    : null

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Zap className={`h-3 w-3 ${isExhausted ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-500'}`} />
        <span className={isExhausted ? 'text-red-500 font-medium' : ''}>
          {isExhausted ? 'No tokens left' : `${fmt(total)} tokens`}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={`h-4 w-4 ${isExhausted ? 'text-red-400' : 'text-[#3D4A67]'}`} />
          <span className="text-sm font-semibold text-slate-700">AI Tokens</span>
        </div>
        <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {tierCfg.name}
        </span>
      </div>

      {/* Monthly pool */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Monthly pool</span>
          <span className={`font-medium ${isExhausted ? 'text-red-500' : 'text-slate-700'}`}>
            {fmt(total)} / {fmt(allocation)}
          </span>
        </div>
        <ProgressBar pct={monthlyPct} color={monthlyColor} />
        {packBalance > 0 && (
          <p className="text-xs text-slate-400">
            Includes {fmt(packBalance)} from token pack
          </p>
        )}
      </div>

      {/* Daily cap (free tier only) */}
      {isFree && dailyCap > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Today</span>
            <span className="font-medium text-slate-700">
              {fmt(dailyBalance)} / {fmt(dailyCap)}
            </span>
          </div>
          <ProgressBar pct={dailyPct} color={dailyColor} />
          <p className="text-xs text-slate-400">Resets at midnight UTC</p>
        </div>
      )}

      {/* Exhausted / warning state */}
      {isExhausted && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-700 space-y-1">
            <p className="font-semibold">No tokens remaining</p>
            <p>
              {isFree
                ? 'Your daily allowance resets at midnight UTC. Monthly on the 1st.'
                : 'Your monthly allocation resets on the 1st.'}
            </p>
          </div>
        </div>
      )}

      {!isExhausted && isWarning && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">Running low on tokens</p>
        </div>
      )}

      {/* Upgrade CTA */}
      {(isExhausted || isWarning) && nextTier && (
        <Button
          asChild
          size="sm"
          className="w-full bg-[#3D4A67] hover:bg-[#2D3A57] text-white text-xs h-8"
        >
          <Link href={nextTier.ctaHref} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            Upgrade to {nextTier.name} — {nextTier.tokenAllocation.toLocaleString()} tokens/mo
          </Link>
        </Button>
      )}
    </div>
  )
}
