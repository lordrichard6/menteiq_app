'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Search,
    Building2,
    Users,
    Receipt,
    Zap,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgRow {
    id: string
    name: string
    slug: string
    subscription_tier: string
    stripe_customer_id: string | null
    token_balance: number
    current_period_end: string | null
    created_at: string
    userCount: number
    invoiceCount: number
}

interface OrgsResponse {
    organizations: OrgRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600',
    pro: 'bg-blue-100 text-blue-700',
    business: 'bg-purple-100 text-purple-700',
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

const TIER_OPTIONS = [
    { value: '', label: 'All Tiers' },
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'business', label: 'Business' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrganizationsPage() {
    const [data, setData] = React.useState<OrgsResponse | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [search, setSearch] = React.useState('')
    const [tier, setTier] = React.useState('')
    const [page, setPage] = React.useState(1)

    const fetchOrgs = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: '20',
                ...(search && { search }),
                ...(tier && { tier }),
            })
            const res = await fetch(`/api/admin/organizations?${params}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setData(await res.json() as OrgsResponse)
        } catch {
            setError('Failed to load organizations.')
        } finally {
            setLoading(false)
        }
    }, [page, search, tier])

    // Debounced search
    React.useEffect(() => {
        const t = setTimeout(() => {
            setPage(1)
            fetchOrgs()
        }, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, tier])

    React.useEffect(() => {
        fetchOrgs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {data ? `${data.total} total organizations` : 'Loading…'}
                    </p>
                </div>
                <button
                    onClick={fetchOrgs}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name or slug…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        {/* Tier filter */}
                        <select
                            value={tier}
                            onChange={(e) => { setTier(e.target.value); setPage(1) }}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {TIER_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {error && (
                        <div className="p-4 text-sm text-red-700 bg-red-50">{error}</div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Organization</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tier</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                                        <span className="flex items-center justify-end gap-1">
                                            <Users className="h-3.5 w-3.5" /> Users
                                        </span>
                                    </th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                                        <span className="flex items-center justify-end gap-1">
                                            <Receipt className="h-3.5 w-3.5" /> Invoices
                                        </span>
                                    </th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                                        <span className="flex items-center justify-end gap-1">
                                            <Zap className="h-3.5 w-3.5" /> Tokens
                                        </span>
                                    </th>
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
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            <p>No organizations found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.organizations.map((org) => (
                                        <tr
                                            key={org.id}
                                            className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-slate-900">{org.name}</p>
                                                    <p className="text-xs text-slate-400">{org.slug}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant="secondary"
                                                    className={cn('capitalize', TIER_COLORS[org.subscription_tier])}
                                                >
                                                    {org.subscription_tier}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                                                {org.userCount}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                                                {org.invoiceCount}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                                                {(org.token_balance ?? 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500 text-xs">
                                                {formatDate(org.created_at)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            <span className="text-xs text-slate-500">
                                Page {data.page} of {data.totalPages} · {data.total} results
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
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
