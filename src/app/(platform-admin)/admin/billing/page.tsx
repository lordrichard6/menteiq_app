'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Loader2,
    CreditCard,
    ExternalLink,
    Building2,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    CircleMinus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAdminDate, TIER_COLORS } from '@/lib/admin-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillingOrg {
    id: string
    name: string
    slug: string
    subscription_tier: string
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    current_period_end: string | null
    created_at: string
    stripe_status?: string
    stripe_current_period_end?: number
}

interface BillingResponse {
    organizations: BillingOrg[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    stripeEnabled: boolean
}

// ─── Stripe status config ─────────────────────────────────────────────────────

const STRIPE_STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active: {
        label: 'Active',
        cls: 'bg-emerald-100 text-emerald-700',
        icon: <CheckCircle2 className="h-3 w-3" />,
    },
    trialing: {
        label: 'Trialing',
        cls: 'bg-blue-100 text-blue-700',
        icon: <Clock className="h-3 w-3" />,
    },
    past_due: {
        label: 'Past Due',
        cls: 'bg-amber-100 text-amber-700',
        icon: <AlertCircle className="h-3 w-3" />,
    },
    canceled: {
        label: 'Canceled',
        cls: 'bg-slate-100 text-slate-600',
        icon: <XCircle className="h-3 w-3" />,
    },
    unpaid: {
        label: 'Unpaid',
        cls: 'bg-red-100 text-red-700',
        icon: <XCircle className="h-3 w-3" />,
    },
    free: {
        label: 'Free',
        cls: 'bg-slate-100 text-slate-500',
        icon: <CircleMinus className="h-3 w-3" />,
    },
    unknown: {
        label: 'Unknown',
        cls: 'bg-slate-100 text-slate-500',
        icon: <CircleMinus className="h-3 w-3" />,
    },
}

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All Orgs' },
    { value: 'free', label: 'Free (no Stripe)' },
    { value: 'paid', label: 'Paid (has Stripe)' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBillingPage() {
    const [data, setData] = React.useState<BillingResponse | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [page, setPage] = React.useState(1)
    const [statusFilter, setStatusFilter] = React.useState('')

    const fetchBilling = React.useCallback(async (targetPage: number) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                page: String(targetPage),
                pageSize: '20',
                ...(statusFilter && { status: statusFilter }),
            })
            const res = await fetch(`/api/admin/billing?${params}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setData(await res.json() as BillingResponse)
        } catch {
            setError('Failed to load billing data.')
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    React.useEffect(() => {
        setPage(1)
        fetchBilling(1)
    }, [statusFilter, fetchBilling])

    const goToPage = (next: number) => { setPage(next); fetchBilling(next) }

    const stripeCustomerUrl = (customerId: string) =>
        `https://dashboard.stripe.com/customers/${customerId}`
    const stripeSubUrl = (subId: string) =>
        `https://dashboard.stripe.com/subscriptions/${subId}`

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-slate-500" />
                        Billing
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {data
                            ? `${data.total} organization${data.total !== 1 ? 's' : ''}${data.stripeEnabled ? ' · Stripe live data' : ' · Stripe not connected'}`
                            : 'Loading…'
                        }
                    </p>
                </div>
                <button
                    onClick={() => fetchBilling(page)}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            {/* Stripe not configured warning */}
            {data && !data.stripeEnabled && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                        <strong>STRIPE_SECRET_KEY</strong> is not configured — showing DB-only data without live Stripe subscription status.
                    </span>
                </div>
            )}

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {STATUS_FILTER_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        {data?.stripeEnabled && (
                            <a
                                href="https://dashboard.stripe.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 ml-auto"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open Stripe Dashboard
                            </a>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {error && <div className="p-4 text-sm text-red-700 bg-red-50">{error}</div>}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Organization</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tier</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Stripe Status</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Period Ends</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Stripe Links</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-50 animate-pulse">
                                            {Array.from({ length: 6 }).map((__, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-slate-200 rounded w-full" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : data?.organizations.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-16 text-center text-slate-400">
                                            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p>No organizations found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.organizations.map((org) => {
                                        const stripeStatus = org.stripe_status ?? (org.stripe_customer_id ? 'unknown' : 'free')
                                        const statusCfg = STRIPE_STATUS_CONFIG[stripeStatus] ?? STRIPE_STATUS_CONFIG.unknown
                                        const periodEnd = org.stripe_current_period_end
                                            ? new Date(org.stripe_current_period_end * 1000).toLocaleDateString('en-CH')
                                            : org.current_period_end
                                                ? new Date(org.current_period_end).toLocaleDateString('en-CH')
                                                : '—'

                                        return (
                                            <tr key={org.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                {/* Org */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-900 truncate">{org.name}</p>
                                                            <p className="text-xs text-slate-400">{org.slug}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Tier */}
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary" className={cn('capitalize', TIER_COLORS[org.subscription_tier])}>
                                                        {org.subscription_tier}
                                                    </Badge>
                                                </td>

                                                {/* Stripe Status */}
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary" className={cn('flex items-center gap-1 w-fit', statusCfg.cls)}>
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </Badge>
                                                </td>

                                                {/* Period End */}
                                                <td className="px-4 py-3 text-slate-600 text-xs">{periodEnd}</td>

                                                {/* Stripe Links */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {org.stripe_customer_id && (
                                                            <a
                                                                href={stripeCustomerUrl(org.stripe_customer_id)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                                Customer
                                                            </a>
                                                        )}
                                                        {org.stripe_subscription_id && (
                                                            <a
                                                                href={stripeSubUrl(org.stripe_subscription_id)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />
                                                                Sub
                                                            </a>
                                                        )}
                                                        {!org.stripe_customer_id && (
                                                            <span className="text-xs text-slate-400">No Stripe record</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Joined */}
                                                <td className="px-4 py-3 text-right text-slate-500 text-xs">
                                                    {formatAdminDate(org.created_at)}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {data && data.total > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            <span className="text-xs text-slate-500">
                                Page {data.page} of {Math.max(1, data.totalPages)} · {data.total} results
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(Math.max(1, page - 1))}
                                    disabled={page <= 1}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(Math.min(data.totalPages, page + 1))}
                                    disabled={page >= data.totalPages}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
