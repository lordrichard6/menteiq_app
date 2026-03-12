'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
    Search,
    Users,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    ShieldCheck,
    Crown,
    User,
    Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TIER_TEXT_COLORS, formatAdminDate } from '@/lib/admin-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
    id: string
    full_name: string | null
    email: string | null
    role: string
    tenant_id: string | null
    created_at: string
    organizations: {
        name: string
        subscription_tier: string
    } | null
}

interface UsersResponse {
    users: UserRow[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    platform_admin: {
        label: 'Platform Admin',
        cls: 'bg-emerald-100 text-emerald-700',
        icon: <ShieldCheck className="h-3 w-3" />,
    },
    owner: {
        label: 'Owner',
        cls: 'bg-blue-100 text-blue-700',
        icon: <Crown className="h-3 w-3" />,
    },
    member: {
        label: 'Member',
        cls: 'bg-slate-100 text-slate-600',
        icon: <User className="h-3 w-3" />,
    },
}

const ROLE_OPTIONS = [
    { value: '', label: 'All Roles' },
    { value: 'owner', label: 'Owners' },
    { value: 'member', label: 'Members' },
    { value: 'platform_admin', label: 'Platform Admins' },
]

function getInitials(name: string | null, email: string | null): string {
    if (name?.trim()) {
        return name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    }
    return (email?.[0] ?? '?').toUpperCase()
}

// ─── User Detail Sheet ────────────────────────────────────────────────────────

interface UserDetailSheetProps {
    user: UserRow | null
    onClose: () => void
    onUpdated: (targetPage: number) => void
    currentPage: number
}

function UserDetailSheet({ user, onClose, onUpdated, currentPage }: UserDetailSheetProps) {
    const [newRole, setNewRole] = React.useState('')
    const [roleLoading, setRoleLoading] = React.useState(false)
    const [actionError, setActionError] = React.useState<string | null>(null)
    const [actionSuccess, setActionSuccess] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (user) {
            setNewRole(user.role)
            setActionError(null)
            setActionSuccess(null)
        }
    }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleRoleChange = async () => {
        if (!user) return
        setRoleLoading(true)
        setActionError(null)
        setActionSuccess(null)
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_role', role: newRole }),
            })
            const json = await res.json() as { success?: boolean; error?: string }
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
            setActionSuccess(`Role updated to ${ROLE_CONFIG[newRole]?.label ?? newRole}`)
            onUpdated(currentPage)
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Action failed')
        } finally {
            setRoleLoading(false)
        }
    }

    const roleCfg = user ? (ROLE_CONFIG[user.role] ?? ROLE_CONFIG.member) : ROLE_CONFIG.member

    return (
        <Sheet open={user !== null} onOpenChange={(open) => { if (!open) onClose() }}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                {user && (
                    <>
                        <div className="pb-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 shrink-0">
                                    <AvatarFallback className="bg-slate-200 text-slate-700 font-semibold">
                                        {getInitials(user.full_name, user.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold text-slate-900 truncate">{user.full_name || '—'}</h2>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Details grid ── */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                                <p className="text-xs text-slate-500 mb-1">Current Role</p>
                                <Badge variant="secondary" className={cn('flex items-center gap-1 w-fit', roleCfg.cls)}>
                                    {roleCfg.icon}
                                    {roleCfg.label}
                                </Badge>
                            </div>
                            {user.organizations ? (
                                <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Organization</p>
                                    <p className="text-sm font-medium text-slate-700">{user.organizations.name}</p>
                                    <p className={cn('text-xs capitalize mt-0.5', TIER_TEXT_COLORS[user.organizations.subscription_tier] ?? 'text-slate-400')}>
                                        {user.organizations.subscription_tier} tier
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Organization</p>
                                    <p className="text-sm text-slate-400">No organization</p>
                                </div>
                            )}
                            <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                                <p className="text-xs text-slate-500 mb-1">Joined</p>
                                <p className="text-sm font-medium text-slate-700">{formatAdminDate(user.created_at)}</p>
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

                        {/* ── Change Role ── */}
                        <div className="border border-slate-200 rounded-xl p-4">
                            <p className="text-sm font-semibold text-slate-900 mb-1">Change Role</p>
                            {newRole === 'platform_admin' && newRole !== user.role && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                                    ⚠️ Granting platform_admin gives full access to this admin panel.
                                </p>
                            )}
                            <div className="flex gap-2">
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="member">Member</option>
                                    <option value="owner">Owner</option>
                                    <option value="platform_admin">Platform Admin</option>
                                </select>
                                <Button
                                    size="sm"
                                    onClick={handleRoleChange}
                                    disabled={roleLoading || newRole === user.role}
                                >
                                    {roleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
    const [data, setData] = React.useState<UsersResponse | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [search, setSearch] = React.useState('')
    const [role, setRole] = React.useState('')
    const [page, setPage] = React.useState(1)
    const [isSearching, setIsSearching] = React.useState(false)
    const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null)

    // fetchUsers takes targetPage explicitly — avoids double-fetch race condition
    const fetchUsers = React.useCallback(async (targetPage: number) => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                page: String(targetPage),
                pageSize: '20',
                ...(search && { search }),
                ...(role && { role }),
            })
            const res = await fetch(`/api/admin/users?${params}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setData(await res.json() as UsersResponse)
        } catch {
            setError('Failed to load users.')
        } finally {
            setLoading(false)
        }
    }, [search, role]) // page NOT in deps — passed as argument

    // Search/role filter: debounced 300ms, resets to page 1
    React.useEffect(() => {
        setIsSearching(true)
        const t = setTimeout(() => {
            setIsSearching(false)
            setPage(1)
            fetchUsers(1)
        }, 300)
        return () => { clearTimeout(t); setIsSearching(false) }
    }, [search, role, fetchUsers])

    // Pagination: called directly from buttons (no effect)
    const goToPage = (next: number) => {
        setPage(next)
        fetchUsers(next)
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {data ? `${data.total} total users across all organizations` : 'Loading…'}
                    </p>
                </div>
                <button
                    onClick={() => fetchUsers(page)}
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
                        {/* Search with loading indicator */}
                        <div className="relative flex-1">
                            {isSearching ? (
                                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                            ) : (
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            )}
                            <Input
                                placeholder="Search by name or email…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        {/* Role filter */}
                        <select
                            value={role}
                            onChange={(e) => { setRole(e.target.value); setPage(1) }}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {ROLE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {error && (
                        <div className="p-4 text-sm text-red-700 bg-red-50">{error}</div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">User</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Organization</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-slate-50 animate-pulse">
                                            {Array.from({ length: 4 }).map((__, j) => (
                                                <td key={j} className="px-4 py-3">
                                                    <div className="h-4 bg-slate-200 rounded w-full" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : data?.users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                                            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            <p>No users found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.users.map((u) => {
                                        const roleCfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.member
                                        return (
                                            <tr
                                                key={u.id}
                                                onClick={() => setSelectedUser(u)}
                                                className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                                            >
                                                {/* User */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8 shrink-0">
                                                            <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                                                                {getInitials(u.full_name, u.email)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-900 truncate">
                                                                {u.full_name || '—'}
                                                            </p>
                                                            <p className="text-xs text-slate-400 truncate">
                                                                {u.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Role */}
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn('flex items-center gap-1 w-fit', roleCfg.cls)}
                                                    >
                                                        {roleCfg.icon}
                                                        {roleCfg.label}
                                                    </Badge>
                                                </td>
                                                {/* Organization */}
                                                <td className="px-4 py-3">
                                                    {u.organizations ? (
                                                        <div>
                                                            <p className="text-slate-700 font-medium">
                                                                {u.organizations.name}
                                                            </p>
                                                            <p className={cn(
                                                                'text-xs capitalize',
                                                                TIER_TEXT_COLORS[u.organizations.subscription_tier] ?? 'text-slate-400'
                                                            )}>
                                                                {u.organizations.subscription_tier}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">No org</span>
                                                    )}
                                                </td>
                                                {/* Joined */}
                                                <td className="px-4 py-3 text-right text-slate-500 text-xs">
                                                    {formatAdminDate(u.created_at)}
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

            {/* User detail sheet */}
            <UserDetailSheet
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onUpdated={fetchUsers}
                currentPage={page}
            />
        </div>
    )
}
