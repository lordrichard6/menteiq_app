'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
    Search,
    Building2,
    Users,
    Receipt,
    Zap,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Loader2,
    CircleDot,
    CircleOff,
    Circle,
    Trash2,
    CheckSquare,
    Square,
    ChevronDown,
} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
    TIER_COLORS,
    formatAdminDate,
    getSubscriptionStatus,
    STATUS_COLORS,
    STATUS_LABELS,
} from '@/lib/admin-utils'

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

const TIER_OPTIONS = [
    { value: '', label: 'All Tiers' },
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'business', label: 'Business' },
]

const STATUS_ICONS: Record<string, React.ReactNode> = {
    free: <Circle className="h-3 w-3" />,
    active: <CircleDot className="h-3 w-3" />,
    expired: <CircleOff className="h-3 w-3" />,
}

// ─── Org Detail Sheet ─────────────────────────────────────────────────────────

interface OrgDetailSheetProps {
    org: OrgRow | null
    onClose: () => void
    onUpdated: (updatedPage: number) => void
    currentPage: number
    onDeleted: () => void
}

function OrgDetailSheet({ org, onClose, onUpdated, currentPage, onDeleted }: OrgDetailSheetProps) {
    const [newTier, setNewTier] = React.useState('')
    const [tokenAmount, setTokenAmount] = React.useState('')
    const [actionLoading, setActionLoading] = React.useState<'tier' | 'tokens' | 'delete' | null>(null)
    const [actionError, setActionError] = React.useState<string | null>(null)
    const [actionSuccess, setActionSuccess] = React.useState<string | null>(null)

    // Reset form when org changes
    React.useEffect(() => {
        if (org) {
            setNewTier(org.subscription_tier)
            setTokenAmount('')
            setActionError(null)
            setActionSuccess(null)
        }
    }, [org?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleDelete = async () => {
        if (!org) return
        setActionLoading('delete')
        setActionError(null)
        try {
            const res = await fetch(`/api/admin/organizations/${org.id}`, { method: 'DELETE' })
            const json = await res.json() as { success?: boolean; error?: string; deleted_users?: number }
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
            onClose()
            onDeleted()
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Delete failed')
            setActionLoading(null)
        }
    }

    const doAction = async (action: 'tier' | 'tokens') => {
        if (!org) return
        setActionLoading(action)
        setActionError(null)
        setActionSuccess(null)
        try {
            const body = action === 'tier'
                ? { action: 'update_tier', tier: newTier }
                : { action: 'add_tokens', amount: parseInt(tokenAmount) }

            const res = await fetch(`/api/admin/organizations/${org.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json() as { success?: boolean; error?: string }
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

            setActionSuccess(action === 'tier' ? 'Tier updated' : `${parseInt(tokenAmount).toLocaleString()} tokens added`)
            if (action === 'tokens') setTokenAmount('')
            onUpdated(currentPage)
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Action failed')
        } finally {
            setActionLoading(null)
        }
    }

    const status = org ? getSubscriptionStatus(org.subscription_tier, org.current_period_end) : 'free'

    return (
        <Sheet open={org !== null} onOpenChange={(open) => { if (!open) onClose() }}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                {org && (
                    <>
                        <div className="pb-4">
                            <h2 className="flex items-center gap-2 flex-wrap text-lg font-semibold text-slate-900">
                                <Building2 className="h-5 w-5 text-slate-500 shrink-0" />
                                <span className="truncate">{org.name}</span>
                                <Badge variant="secondary" className={cn('capitalize shrink-0', TIER_COLORS[org.subscription_tier])}>
                                    {org.subscription_tier}
                                </Badge>
                            </h2>
                            <p className="font-mono text-xs text-slate-500 mt-1">{org.slug}</p>
                        </div>

                        {/* ── Details grid ── */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Status</p>
                                <p className={cn('text-sm font-medium flex items-center gap-1.5', STATUS_COLORS[status])}>
                                    {STATUS_ICONS[status]}
                                    {STATUS_LABELS[status]}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Period ends</p>
                                <p className="text-sm font-medium text-slate-700">{formatAdminDate(org.current_period_end)}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Users</p>
                                <p className="text-sm font-medium text-slate-700">{org.userCount}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Invoices</p>
                                <p className="text-sm font-medium text-slate-700">{org.invoiceCount}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Token balance</p>
                                <p className="text-sm font-medium text-slate-700">{(org.token_balance ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-500 mb-1">Joined</p>
                                <p className="text-sm font-medium text-slate-700">{formatAdminDate(org.created_at)}</p>
                            </div>
                        </div>

                        {/* ── Feedback ── */}
                        {actionError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {actionError}
                            </div>
                        )}
                        {actionSuccess && (
                            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                                ✓ {actionSuccess}
                            </div>
                        )}

                        {/* ── Change Tier ── */}
                        <div className="border border-slate-200 rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-slate-900 mb-3">Change Tier</p>
                            <div className="flex gap-2">
                                <select
                                    value={newTier}
                                    onChange={(e) => setNewTier(e.target.value)}
                                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="free">Free</option>
                                    <option value="pro">Pro ($29/mo)</option>
                                    <option value="business">Business ($99/mo)</option>
                                </select>
                                <Button
                                    size="sm"
                                    onClick={() => doAction('tier')}
                                    disabled={actionLoading !== null || newTier === org.subscription_tier}
                                >
                                    {actionLoading === 'tier' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                                </Button>
                            </div>
                        </div>

                        {/* ── Add Tokens ── */}
                        <div className="border border-slate-200 rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-slate-900 mb-1">Add Tokens</p>
                            <p className="text-xs text-slate-500 mb-3">
                                Grant additional AI tokens. Current balance: {(org.token_balance ?? 0).toLocaleString()}
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="e.g. 50000"
                                    value={tokenAmount}
                                    onChange={(e) => setTokenAmount(e.target.value)}
                                    min={1}
                                    max={10000000}
                                    className="flex-1"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => doAction('tokens')}
                                    disabled={actionLoading !== null || !tokenAmount || parseInt(tokenAmount) <= 0}
                                >
                                    {actionLoading === 'tokens' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                </Button>
                            </div>
                        </div>

                        {/* ── Danger Zone ── */}
                        <div className="border border-red-200 rounded-xl p-4 bg-red-50/50">
                            <p className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-1.5">
                                <Trash2 className="h-4 w-4" />
                                Danger Zone
                            </p>
                            <p className="text-xs text-red-600/80 mb-3">
                                Permanently delete this organization and all its users, contacts, projects, invoices, and data.
                                This action is <strong>irreversible</strong>.
                            </p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={actionLoading !== null}
                                        className="w-full"
                                    >
                                        {actionLoading === 'delete'
                                            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</>
                                            : <><Trash2 className="h-4 w-4 mr-2" />Delete Organization</>
                                        }
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete &ldquo;{org.name}&rdquo;?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the organization, all {org.userCount} user{org.userCount !== 1 ? 's' : ''},
                                            and all associated data. There is no undo.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            Yes, delete permanently
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrganizationsPage() {
    const [data, setData] = React.useState<OrgsResponse | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [search, setSearch] = React.useState('')
    const [tier, setTier] = React.useState('')
    const [page, setPage] = React.useState(1)
    const [isSearching, setIsSearching] = React.useState(false)
    const [selectedOrg, setSelectedOrg] = React.useState<OrgRow | null>(null)
    // Bulk selection
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
    const [bulkTier, setBulkTier] = React.useState('free')
    const [bulkLoading, setBulkLoading] = React.useState(false)
    const [bulkSuccess, setBulkSuccess] = React.useState<string | null>(null)
    const [bulkError, setBulkError] = React.useState<string | null>(null)
    const [showBulkDropdown, setShowBulkDropdown] = React.useState(false)

    // fetchOrgs takes targetPage explicitly — avoids double-fetch race condition
    const fetchOrgs = React.useCallback(async (targetPage: number) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                page: String(targetPage),
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
    }, [search, tier]) // page NOT in deps — passed as argument

    // Search/tier change: debounced 300ms, resets to page 1
    React.useEffect(() => {
        setIsSearching(true)
        const t = setTimeout(() => {
            setIsSearching(false)
            setPage(1)
            fetchOrgs(1)
        }, 300)
        return () => { clearTimeout(t); setIsSearching(false) }
    }, [search, tier, fetchOrgs])

    // Pagination: called directly from buttons (no extra effect needed)
    const goToPage = (next: number) => {
        setPage(next)
        fetchOrgs(next)
    }

    // Bulk helpers
    const allIds = data?.organizations.map((o) => o.id) ?? []
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))
    const someSelected = selectedIds.size > 0

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(allIds))
        }
    }

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleBulkTierChange = async () => {
        if (selectedIds.size === 0) return
        setBulkLoading(true)
        setBulkError(null)
        setBulkSuccess(null)
        try {
            await Promise.all(
                [...selectedIds].map((id) =>
                    fetch(`/api/admin/organizations/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'update_tier', tier: bulkTier }),
                    })
                )
            )
            setBulkSuccess(`Updated ${selectedIds.size} org${selectedIds.size !== 1 ? 's' : ''} to ${bulkTier}`)
            setSelectedIds(new Set())
            setShowBulkDropdown(false)
            fetchOrgs(page)
        } catch {
            setBulkError('Bulk update failed. Some changes may not have been applied.')
        } finally {
            setBulkLoading(false)
        }
    }

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
                    onClick={() => fetchOrgs(page)}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            {/* Bulk action toolbar */}
            {someSelected && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-sm font-medium text-blue-800">
                        {selectedIds.size} selected
                    </span>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        {bulkSuccess && <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">{bulkSuccess}</span>}
                        {bulkError && <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{bulkError}</span>}
                        <div className="relative">
                            <button
                                onClick={() => setShowBulkDropdown((v) => !v)}
                                className="flex items-center gap-1.5 text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50"
                            >
                                Change to tier
                                <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            {showBulkDropdown && (
                                <div className="absolute right-0 mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[160px]">
                                    {['free', 'pro', 'business'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => { setBulkTier(t); setShowBulkDropdown(false); }}
                                            className={cn(
                                                'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-slate-50 capitalize',
                                                bulkTier === t && 'font-semibold text-blue-700'
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            size="sm"
                            onClick={handleBulkTierChange}
                            disabled={bulkLoading}
                        >
                            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apply to ${selectedIds.size}`}
                        </Button>
                        <button
                            onClick={() => { setSelectedIds(new Set()); setBulkSuccess(null); setBulkError(null) }}
                            className="text-xs text-slate-500 hover:text-slate-700"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Search with loading indicator */}
                        <div className="relative flex-1">
                            {isSearching ? (
                                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                            ) : (
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            )}
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
                                    <th className="px-4 py-3 w-10">
                                        <button onClick={toggleSelectAll} className="flex items-center">
                                            {allSelected
                                                ? <CheckSquare className="h-4 w-4 text-blue-600" />
                                                : <Square className="h-4 w-4 text-slate-400" />
                                            }
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Organization</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tier</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
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
                                            <Zap className="h-3.5 w-3.5" /> Token Balance
                                        </span>
                                    </th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-50 animate-pulse">
                                            {Array.from({ length: 8 }).map((__, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-slate-200 rounded w-full" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : data?.organizations.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            <p>No organizations found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.organizations.map((org) => {
                                        const status = getSubscriptionStatus(org.subscription_tier, org.current_period_end)
                                        const isChecked = selectedIds.has(org.id)
                                        return (
                                            <tr
                                                key={org.id}
                                                onClick={() => setSelectedOrg(org)}
                                                className={cn(
                                                    'border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer',
                                                    isChecked && 'bg-blue-50/50'
                                                )}
                                            >
                                                <td className="px-4 py-3" onClick={(e) => toggleSelect(org.id, e)}>
                                                    {isChecked
                                                        ? <CheckSquare className="h-4 w-4 text-blue-600" />
                                                        : <Square className="h-4 w-4 text-slate-300" />
                                                    }
                                                </td>
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
                                                <td className="px-4 py-3">
                                                    <span className={cn('flex items-center gap-1 text-xs font-medium', STATUS_COLORS[status])}>
                                                        {STATUS_ICONS[status]}
                                                        {STATUS_LABELS[status]}
                                                    </span>
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
                                                    {formatAdminDate(org.created_at)}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination — always visible when there's data */}
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

            {/* Org detail sheet */}
            <OrgDetailSheet
                org={selectedOrg}
                onClose={() => setSelectedOrg(null)}
                onUpdated={fetchOrgs}
                currentPage={page}
                onDeleted={() => { setSelectedIds(new Set()); fetchOrgs(1) }}
            />
        </div>
    )
}
