'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Loader2,
    ClipboardList,
    Trash2,
    Shield,
    Zap,
    Building2,
    User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAdminDate } from '@/lib/admin-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogRow {
    id: string
    created_at: string
    action: string
    target_type: string
    target_id: string
    details: Record<string, unknown>
    admin_id: string | null
}

interface AuditLogResponse {
    logs: AuditLogRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    delete_organization: {
        label: 'Deleted Org',
        cls: 'bg-red-100 text-red-700',
        icon: <Trash2 className="h-3 w-3" />,
    },
    delete_user: {
        label: 'Deleted User',
        cls: 'bg-red-100 text-red-700',
        icon: <Trash2 className="h-3 w-3" />,
    },
    update_tier: {
        label: 'Updated Tier',
        cls: 'bg-blue-100 text-blue-700',
        icon: <Zap className="h-3 w-3" />,
    },
    add_tokens: {
        label: 'Added Tokens',
        cls: 'bg-emerald-100 text-emerald-700',
        icon: <Zap className="h-3 w-3" />,
    },
    update_role: {
        label: 'Updated Role',
        cls: 'bg-amber-100 text-amber-700',
        icon: <Shield className="h-3 w-3" />,
    },
}

const TARGET_ICONS: Record<string, React.ReactNode> = {
    organization: <Building2 className="h-3.5 w-3.5 text-slate-400" />,
    user: <User className="h-3.5 w-3.5 text-slate-400" />,
}

const ACTION_FILTER_OPTIONS = [
    { value: '', label: 'All Actions' },
    { value: 'delete_organization', label: 'Deleted Org' },
    { value: 'delete_user', label: 'Deleted User' },
    { value: 'update_tier', label: 'Tier Change' },
    { value: 'add_tokens', label: 'Token Grant' },
    { value: 'update_role', label: 'Role Change' },
]

function renderDetails(action: string, details: Record<string, unknown>): string {
    if (action === 'delete_organization') {
        const count = details.member_count as number | undefined
        return count !== undefined ? `${count} user${count !== 1 ? 's' : ''} removed` : ''
    }
    if (action === 'delete_user') {
        return (details.email as string) ?? ''
    }
    if (action === 'update_tier') {
        return (details.tier as string) ?? ''
    }
    if (action === 'add_tokens') {
        const amount = details.amount as number | undefined
        return amount !== undefined ? `+${amount.toLocaleString()} tokens` : ''
    }
    if (action === 'update_role') {
        return (details.role as string) ?? ''
    }
    return JSON.stringify(details)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
    const [data, setData] = React.useState<AuditLogResponse | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [page, setPage] = React.useState(1)
    const [actionFilter, setActionFilter] = React.useState('')

    const fetchLogs = React.useCallback(async (targetPage: number) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                page: String(targetPage),
                pageSize: '50',
                ...(actionFilter && { action: actionFilter }),
            })
            const res = await fetch(`/api/admin/audit-log?${params}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setData(await res.json() as AuditLogResponse)
        } catch {
            setError('Failed to load audit log.')
        } finally {
            setLoading(false)
        }
    }, [actionFilter])

    React.useEffect(() => {
        setPage(1)
        fetchLogs(1)
    }, [actionFilter, fetchLogs])

    const goToPage = (next: number) => { setPage(next); fetchLogs(next) }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="h-6 w-6 text-slate-500" />
                        Audit Log
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {data ? `${data.total} admin action${data.total !== 1 ? 's' : ''} recorded` : 'Loading…'}
                    </p>
                </div>
                <button
                    onClick={() => fetchLogs(page)}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {ACTION_FILTER_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400">Filter by action type</span>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {error && <div className="p-4 text-sm text-red-700 bg-red-50">{error}</div>}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Timestamp</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Action</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Target</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-50 animate-pulse">
                                            {Array.from({ length: 4 }).map((__, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-slate-200 rounded w-full" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : data?.logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-16 text-center text-slate-400">
                                            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No audit log entries yet</p>
                                            <p className="text-xs mt-1">Admin actions will appear here once they are performed.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.logs.map((log) => {
                                        const cfg = ACTION_CONFIG[log.action]
                                        return (
                                            <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                {/* Timestamp */}
                                                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString('en-CH', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short',
                                                    })}
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3">
                                                    {cfg ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn('flex items-center gap-1 w-fit', cfg.cls)}
                                                        >
                                                            {cfg.icon}
                                                            {cfg.label}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs font-mono text-slate-600">{log.action}</span>
                                                    )}
                                                </td>

                                                {/* Target */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {TARGET_ICONS[log.target_type]}
                                                        <span className="text-xs text-slate-500 capitalize">{log.target_type}</span>
                                                        <span className="text-xs font-mono text-slate-400 truncate max-w-[120px]">
                                                            {log.target_id.slice(0, 8)}…
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Details */}
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {renderDetails(log.action, log.details ?? {})}
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
                                Page {data.page} of {Math.max(1, data.totalPages)} · {data.total} entries
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
