'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Building2,
    Users,
    CreditCard,
    Gift,
    TrendingUp,
    Zap,
    ArrowRight,
    RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TIER_COLORS, formatAdminDate } from '@/lib/admin-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
    totalOrganizations: number
    totalUsers: number
    paidSubscriptions: number
    freeTier: number
    tierCounts: Record<string, number>
    estimatedMRR: number
    tokensThisMonth: number
    recentOrganizations: Array<{
        id: string
        name: string
        slug: string
        subscription_tier: string
        created_at: string
    }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
    return new Intl.NumberFormat('en-US').format(n)
}

function formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n)
}

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    title: string
    value: string
    subtitle?: string
    icon: React.ReactNode
    iconBg: string
    href?: string
}

function StatCard({ title, value, subtitle, icon, iconBg, href }: StatCardProps) {
    const content = (
        <Card className={cn('hover:shadow-md transition-shadow', href && 'cursor-pointer')}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
                        <p className="text-3xl font-bold text-slate-900">{value}</p>
                        {subtitle && (
                            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className={cn('p-2.5 rounded-xl shrink-0 ml-3', iconBg)}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    if (href) {
        return <Link href={href}>{content}</Link>
    }
    return content
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformAdminPage() {
    const [stats, setStats] = React.useState<AdminStats | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null)

    const fetchStats = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/stats')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json() as AdminStats
            setStats(data)
            setLastRefreshed(new Date())
        } catch {
            setError('Failed to load platform stats. Check that SUPABASE_SERVICE_ROLE_KEY is set.')
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchStats()
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchStats, 60_000)
        return () => clearInterval(interval)
    }, [fetchStats])

    const statCards = stats
        ? [
            {
                title: 'Total Organizations',
                value: formatNumber(stats.totalOrganizations),
                subtitle: `${stats.tierCounts.pro ?? 0} pro · ${stats.tierCounts.business ?? 0} business`,
                icon: <Building2 className="h-5 w-5 text-blue-600" />,
                iconBg: 'bg-blue-50',
                href: '/admin/organizations',
            },
            {
                title: 'Total Users',
                value: formatNumber(stats.totalUsers),
                subtitle: 'Across all organizations',
                icon: <Users className="h-5 w-5 text-violet-600" />,
                iconBg: 'bg-violet-50',
                href: '/admin/users',
            },
            {
                title: 'Paid Subscriptions',
                value: formatNumber(stats.paidSubscriptions),
                subtitle: `${stats.freeTier} on free tier`,
                icon: <CreditCard className="h-5 w-5 text-emerald-600" />,
                iconBg: 'bg-emerald-50',
            },
            {
                title: 'Free Tier',
                value: formatNumber(stats.freeTier),
                subtitle: `${stats.totalOrganizations > 0 ? Math.round((stats.freeTier / stats.totalOrganizations) * 100) : 0}% of all orgs`,
                icon: <Gift className="h-5 w-5 text-slate-500" />,
                iconBg: 'bg-slate-100',
            },
            {
                title: 'Est. MRR',
                value: formatCurrency(stats.estimatedMRR),
                subtitle: 'Pro $29 · Business $99',
                icon: <TrendingUp className="h-5 w-5 text-orange-600" />,
                iconBg: 'bg-orange-50',
            },
            {
                title: 'AI Tokens (this month)',
                value: formatTokens(stats.tokensThisMonth),
                subtitle: 'Effective tokens consumed',
                icon: <Zap className="h-5 w-5 text-yellow-600" />,
                iconBg: 'bg-yellow-50',
            },
        ]
        : []

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {lastRefreshed
                            ? `Last refreshed: ${lastRefreshed.toLocaleTimeString('en-GB')} · auto-refreshes every 60s`
                            : 'Loading…'}
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            {loading ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-32 bg-slate-200 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {statCards.map((card) => (
                        <StatCard key={card.title} {...card} />
                    ))}
                </div>
            )}

            {/* Subscription Breakdown */}
            {stats && !loading && (
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Tier Distribution */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-slate-900">
                                Subscription Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {(['free', 'pro', 'business'] as const).map((tier) => {
                                    const count = stats.tierCounts[tier] ?? 0
                                    const pct = stats.totalOrganizations > 0
                                        ? Math.round((count / stats.totalOrganizations) * 100)
                                        : 0
                                    return (
                                        <div key={tier} className="flex items-center gap-3">
                                            <Badge
                                                variant="secondary"
                                                className={cn('w-20 justify-center capitalize', TIER_COLORS[tier])}
                                            >
                                                {tier}
                                            </Badge>
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full transition-all duration-500',
                                                        tier === 'free' && 'bg-slate-400',
                                                        tier === 'pro' && 'bg-blue-500',
                                                        tier === 'business' && 'bg-purple-500'
                                                    )}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-slate-600 w-16 text-right">
                                                {count} ({pct}%)
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Signups */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-semibold text-slate-900">
                                Recent Signups
                            </CardTitle>
                            <Link
                                href="/admin/organizations"
                                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                            >
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {stats.recentOrganizations.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No organizations yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {stats.recentOrganizations.map((org) => (
                                        <div key={org.id} className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {org.name}
                                                </p>
                                                <p className="text-xs text-slate-400">{formatAdminDate(org.created_at)}</p>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={cn('capitalize shrink-0', TIER_COLORS[org.subscription_tier])}
                                            >
                                                {org.subscription_tier}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
