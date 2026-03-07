'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useContactStore } from '@/stores/contact-store'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { useInvoiceStore } from '@/stores/invoice-store'
import { OrganizationActivityFeed } from '@/components/dashboard/organization-activity-feed'
import type { Contact } from '@/types/contact'
import {
    Users, FolderKanban, CheckSquare, Receipt, CreditCard,
    UserPlus, FolderPlus, Bot, FilePlus,
    AlertTriangle, Calendar, ArrowRight, TrendingUp,
    ChevronDown, ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

const PIPELINE_STAGES = [
    { key: 'lead',        label: 'Leads',        color: 'bg-[#3D4A67]', text: 'text-[#3D4A67]',  ringColor: '#3D4A67' },
    { key: 'opportunity', label: 'Opportunities', color: 'bg-[#E9B949]', text: 'text-amber-600',   ringColor: '#E9B949' },
    { key: 'client',      label: 'Clients',       color: 'bg-[#9EAE8E]', text: 'text-[#9EAE8E]',  ringColor: '#9EAE8E' },
    { key: 'churned',     label: 'Churned',       color: 'bg-[#D1855C]', text: 'text-[#D1855C]',  ringColor: '#D1855C' },
] as const

const CONTACT_STATUS_COLORS: Record<string, string> = {
    lead:        'bg-[#3D4A67]/10 text-[#3D4A67]',
    opportunity: 'bg-amber-100 text-amber-700',
    client:      'bg-emerald-100 text-emerald-700',
    churned:     'bg-orange-100 text-orange-700',
}

const DEADLINE_TYPE_CONFIG = {
    task:    { label: 'Task',    cls: 'bg-amber-100 text-amber-700'   },
    project: { label: 'Project', cls: 'bg-emerald-100 text-emerald-700' },
    invoice: { label: 'Invoice', cls: 'bg-orange-100 text-orange-700'  },
} as const

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string, isCompany: boolean, companyName?: string): string {
    if (isCompany && companyName) return companyName.slice(0, 2).toUpperCase()
    return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

function relativeTime(dateMs: number, nowMs: number): string {
    const days = Math.floor((nowMs - dateMs) / DAY_MS)
    if (days < 0) return 'just now'
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
}

function formatCHF(amount: number): string {
    return new Intl.NumberFormat('de-CH', {
        style: 'currency', currency: 'CHF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount)
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface DeadlineItem {
    id: string
    title: string
    date: Date
    type: 'task' | 'project' | 'invoice'
    href: string
}

interface OverdueItem {
    id: string
    title: string
    href: string
    type: 'task' | 'invoice'
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
    return (
        <div
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse"
            role="status" aria-label="Loading metric"
        >
            <div className="space-y-2">
                <div className="h-3.5 w-28 rounded bg-slate-200" />
                <div className="h-8 w-16 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-200" />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
        </div>
    )
}

interface StatCardProps {
    href: string
    label: string
    value: string | number
    icon: React.ElementType
    iconColor: string
    trend?: string
    trendUp?: boolean
    note?: string
    noteIcon?: React.ElementType
}

function StatCard({ href, label, value, icon: Icon, iconColor, trend, trendUp, note, noteIcon: NoteIcon }: StatCardProps) {
    return (
        <Link href={href} aria-label={`${label}: ${String(value)}`} className="block h-full">
            <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                {/* Ghost watermark */}
                <div className="absolute -top-4 -right-4 pointer-events-none select-none" aria-hidden="true">
                    <Icon className={cn("h-28 w-28 opacity-[0.055]", iconColor)} />
                </div>
                <CardContent className="relative p-4 sm:p-5 flex flex-col h-full">
                    <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">{label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[#3D4A67] leading-tight mt-1">{value}</p>
                    {trend && (
                        <div className="flex items-center gap-1 mt-1.5">
                            {trendUp !== undefined && (
                                <TrendingUp
                                    className={cn("h-3 w-3 shrink-0", trendUp ? 'text-green-500' : 'text-slate-400 rotate-180')}
                                    aria-hidden="true"
                                />
                            )}
                            <span className={cn(
                                "text-xs font-medium",
                                trendUp === true  ? 'text-green-600'
                                : trendUp === false ? 'text-red-500'
                                : 'text-slate-400'
                            )}>
                                {trend}
                            </span>
                        </div>
                    )}
                    {note && (
                        <div className="mt-auto pt-3 flex items-center gap-1.5">
                            {NoteIcon && <NoteIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />}
                            <p className="text-xs text-slate-500 truncate">{note}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    )
}

interface ErrorBannerProps {
    message: string
    onRetry: () => void
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
    return (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">Failed to load data</p>
                <p className="text-xs text-red-600 mt-0.5">{message}</p>
            </div>
            <button type="button" onClick={onRetry} className="text-sm font-medium text-red-700 hover:text-red-900 hover:underline shrink-0">
                Retry
            </button>
        </div>
    )
}

interface OverdueAlertsBannerProps {
    overdueTasksList: OverdueItem[]
    overdueInvoicesList: OverdueItem[]
}

function OverdueAlertsBanner({ overdueTasksList, overdueInvoicesList }: OverdueAlertsBannerProps) {
    const [expanded, setExpanded] = React.useState(false)

    const overdueTasks = overdueTasksList.length
    const overdueInvoices = overdueInvoicesList.length
    if (overdueTasks === 0 && overdueInvoices === 0) return null

    const allItems = [...overdueTasksList, ...overdueInvoicesList]
    const parts: string[] = []
    if (overdueTasks > 0) parts.push(`${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`)
    if (overdueInvoices > 0) parts.push(`${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''}`)

    return (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
                <p className="text-sm text-amber-800 font-medium flex-1 min-w-0">
                    You have {parts.join(' and ')} that need attention.
                </p>
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    aria-expanded={expanded}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0 transition-colors"
                >
                    {expanded ? 'Hide' : 'Show items'}
                    {expanded
                        ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
            </div>

            {expanded && (
                <div className="border-t border-amber-200 px-4 py-3 space-y-1">
                    {allItems.slice(0, 6).map(item => (
                        <Link
                            key={`${item.type}-${item.id}`}
                            href={item.href}
                            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-amber-100/60 transition-colors group"
                        >
                            <span className={cn(
                                "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0",
                                item.type === 'task' ? 'bg-amber-200 text-amber-800' : 'bg-orange-200 text-orange-800'
                            )}>
                                {item.type}
                            </span>
                            <span className="text-sm text-amber-900 truncate flex-1">{item.title}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
                        </Link>
                    ))}
                    {allItems.length > 6 && (
                        <p className="text-xs text-amber-600 px-2 pt-1">+{allItems.length - 6} more items</p>
                    )}
                </div>
            )}
        </div>
    )
}

interface PipelineBarProps {
    pipeline: Record<string, number>
    total: number
}

function PipelineBar({ pipeline, total }: PipelineBarProps) {
    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-10 w-10 text-slate-200 mb-2" aria-hidden="true" />
                <p className="text-sm text-slate-500">No contacts yet</p>
                <Link href="/contacts" className="text-xs text-[#3D4A67] hover:underline mt-1 font-medium">
                    Add your first contact →
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Stacked bar */}
            <div
                className="flex h-7 rounded-xl overflow-hidden bg-slate-100 shadow-inner"
                role="img"
                aria-label="Pipeline stage distribution"
            >
                {PIPELINE_STAGES.map(stage => {
                    const count = pipeline[stage.key] ?? 0
                    if (count === 0) return null
                    const rawPct = (count / total) * 100
                    const pct = Math.max(rawPct, 4) // min 4% so tiny segments stay visible
                    return (
                        <div
                            key={stage.key}
                            className={cn("h-full flex items-center justify-center transition-all", stage.color)}
                            style={{ width: `${pct}%` }}
                            title={`${stage.label}: ${count} (${Math.round(rawPct)}%)`}
                        >
                            {rawPct >= 14 && (
                                <span className="text-white text-xs font-bold drop-shadow-sm select-none">
                                    {Math.round(rawPct)}%
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Legend grid with conversion rates */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PIPELINE_STAGES.map((stage, i) => {
                    const count = pipeline[stage.key] ?? 0
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const prevCount = i > 0 ? (pipeline[PIPELINE_STAGES[i - 1].key] ?? 0) : null
                    const conversion = prevCount && prevCount > 0 ? Math.round((count / prevCount) * 100) : null

                    return (
                        <div
                            key={stage.key}
                            className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-white hover:shadow-sm transition-all text-center"
                        >
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <span className={cn("h-2 w-2 rounded-full inline-block shrink-0", stage.color)} />
                                <span className="text-xs text-slate-500 font-medium">{stage.label}</span>
                            </div>
                            <p className={cn("text-2xl font-bold", stage.text)}>{count}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{pct}% of total</p>
                            {conversion !== null && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    ↓ {conversion}% conv.
                                </p>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

interface UpcomingDeadlinesProps {
    items: DeadlineItem[]
    nowMs: number
}

function UpcomingDeadlines({ items, nowMs }: UpcomingDeadlinesProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="h-8 w-8 text-slate-200 mb-2" aria-hidden="true" />
                <p className="text-sm text-slate-500">No upcoming deadlines</p>
                <p className="text-xs text-slate-400 mt-0.5">in the next 7 days</p>
            </div>
        )
    }

    const todayItems    = items.filter(i => Math.ceil((i.date.getTime() - nowMs) / DAY_MS) <= 0)
    const tomorrowItems = items.filter(i => Math.ceil((i.date.getTime() - nowMs) / DAY_MS) === 1)
    const weekItems     = items.filter(i => Math.ceil((i.date.getTime() - nowMs) / DAY_MS) > 1)

    function renderItem(item: DeadlineItem) {
        const daysLeft = Math.ceil((item.date.getTime() - nowMs) / DAY_MS)
        const urgency = daysLeft <= 0 ? 'text-red-600 font-semibold' : daysLeft === 1 ? 'text-amber-600 font-medium' : 'text-slate-500'
        const cfg = DEADLINE_TYPE_CONFIG[item.type]
        return (
            <li key={`${item.type}-${item.id}`}>
                <Link href={item.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors group">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0", cfg.cls)}>
                        {cfg.label}
                    </span>
                    <span className="text-sm text-slate-700 truncate flex-1">{item.title}</span>
                    <span className={cn("text-xs shrink-0", urgency)}>
                        {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" aria-hidden="true" />
                </Link>
            </li>
        )
    }

    function renderGroup(label: string, groupItems: DeadlineItem[], dotClass: string) {
        if (groupItems.length === 0) return null
        return (
            <div>
                <div className="flex items-center gap-2 mb-1 px-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                </div>
                <ul className="space-y-0.5">{groupItems.map(renderItem)}</ul>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {renderGroup('Due today', todayItems, 'bg-red-500')}
            {renderGroup('Tomorrow', tomorrowItems, 'bg-amber-400')}
            {renderGroup('This week', weekItems, 'bg-slate-300')}
        </div>
    )
}

interface RecentContactsProps {
    contacts: Contact[]
    nowMs: number
}

function RecentContacts({ contacts, nowMs }: RecentContactsProps) {
    if (contacts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center">
                <Users className="h-8 w-8 text-slate-200 mb-2" aria-hidden="true" />
                <p className="text-sm text-slate-500">No contacts yet</p>
                <Link href="/contacts" className="text-xs text-[#3D4A67] hover:underline mt-1 font-medium">
                    Add your first contact →
                </Link>
            </div>
        )
    }

    return (
        <ul className="space-y-0.5">
            {contacts.map(contact => {
                const displayName = contact.isCompany
                    ? (contact.companyName ?? `${contact.firstName} ${contact.lastName}`.trim())
                    : `${contact.firstName} ${contact.lastName}`.trim()
                const initials = getInitials(contact.firstName, contact.lastName, contact.isCompany, contact.companyName)
                const statusColor = CONTACT_STATUS_COLORS[contact.status] ?? 'bg-slate-100 text-slate-600'
                const timeAgo = relativeTime(contact.createdAt.getTime(), nowMs)

                return (
                    <li key={contact.id}>
                        <Link
                            href={`/contacts/${contact.id}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors group"
                        >
                            <div className="h-8 w-8 rounded-full bg-[#3D4A67]/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-[#3D4A67]">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{displayName || '—'}</p>
                                <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded inline-block mt-0.5", statusColor)}>
                                    {contact.status}
                                </span>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{timeAgo}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" aria-hidden="true" />
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { contacts, fetchContacts, isLoading: contactsLoading, error: contactsError } = useContactStore()
    const { projects, fetchProjects, isLoading: projectsLoading, error: projectsError } = useProjectStore()
    const { tasks, fetchTasks, isLoading: tasksLoading, error: tasksError } = useTaskStore()
    const { invoices, fetchInvoices, isLoading: invoicesLoading, error: invoicesError } = useInvoiceStore()

    const [userName, setUserName] = React.useState<string>('')
    const [now] = React.useState(() => new Date())

    const isLoading = contactsLoading || projectsLoading || tasksLoading || invoicesLoading
    const fetchError = contactsError || projectsError || tasksError || invoicesError

    React.useEffect(() => {
        fetchContacts()
        fetchProjects()
        fetchTasks()
        fetchInvoices()

        const loadUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const name = (user.user_metadata?.full_name || user.user_metadata?.name || '') as string
                setUserName(name.split(' ')[0] ?? '')
            }
        }
        loadUser()
    }, [fetchContacts, fetchProjects, fetchTasks, fetchInvoices])

    const retryAll = () => {
        fetchContacts()
        fetchProjects()
        fetchTasks()
        fetchInvoices()
    }

    // ─── Derived data ───────────────────────────────────────────────────────

    const nowMs = now.getTime()
    const startOfMonthMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const in7DaysMs = nowMs + 7 * DAY_MS

    // Pipeline
    const pipeline: Record<string, number> = {
        lead:        contacts.filter(c => c.status === 'lead').length,
        opportunity: contacts.filter(c => c.status === 'opportunity').length,
        client:      contacts.filter(c => c.status === 'client').length,
        churned:     contacts.filter(c => c.status === 'churned').length,
    }

    // Contacts metrics
    const contactsThisMonth    = contacts.filter(c => c.createdAt.getTime() >= startOfMonthMs).length
    const newClientsThisMonth  = contacts.filter(c => c.status === 'client' && c.createdAt.getTime() >= startOfMonthMs).length

    // Projects metrics
    const activeProjects       = projects.filter(p => p.status === 'active').length
    const completedProjects    = projects.filter(p => p.status === 'completed').length
    const projectsThisMonth    = projects.filter(p => p.createdAt.getTime() >= startOfMonthMs).length

    // Tasks metrics
    const totalTasks           = tasks.length
    const openTasks            = tasks.filter(t => t.status !== 'done').length
    const doneTasks            = tasks.filter(t => t.status === 'done').length
    const completionRate       = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    // Revenue metrics
    const paidInvoices         = invoices.filter(inv => inv.status === 'paid')
    const revenue              = paidInvoices.reduce((sum, inv) => sum + (inv.amount_total ?? 0), 0)
    const revenueThisMonth     = paidInvoices
        .filter(inv => inv.paid_at && new Date(inv.paid_at).getTime() >= startOfMonthMs)
        .reduce((sum, inv) => sum + (inv.amount_total ?? 0), 0)
    const pendingInvoices      = invoices.filter(inv => inv.status === 'sent')
    const pendingAmount        = pendingInvoices.reduce((sum, inv) => sum + (inv.amount_total ?? 0), 0)

    // Overdue items lists
    const overdueTasksList: OverdueItem[] = tasks
        .filter(t => t.status !== 'done' && t.dueDate && t.dueDate.getTime() < nowMs)
        .slice(0, 5)
        .map(t => ({ id: t.id, title: t.title, href: `/tasks/${t.id}`, type: 'task' as const }))

    const overdueInvoicesList: OverdueItem[] = invoices
        .filter(inv =>
            (inv.status === 'sent' || inv.status === 'overdue') &&
            inv.due_date &&
            new Date(inv.due_date).getTime() < nowMs
        )
        .slice(0, 5)
        .map(inv => ({
            id: inv.id,
            title: `Invoice ${inv.invoice_number ?? inv.id.slice(0, 8)}`,
            href: `/invoices/${inv.id}`,
            type: 'invoice' as const,
        }))

    // Upcoming deadlines (next 7 days)
    const upcomingDeadlines: DeadlineItem[] = [
        ...tasks
            .filter(t => t.status !== 'done' && t.dueDate && t.dueDate.getTime() >= nowMs && t.dueDate.getTime() <= in7DaysMs)
            .map(t => ({ id: t.id, title: t.title, date: t.dueDate as Date, type: 'task' as const, href: `/tasks/${t.id}` })),
        ...projects
            .filter(p => p.status === 'active' && p.deadline && p.deadline.getTime() >= nowMs && p.deadline.getTime() <= in7DaysMs)
            .map(p => ({ id: p.id, title: p.name, date: p.deadline as Date, type: 'project' as const, href: `/projects/${p.id}` })),
        ...invoices
            .filter(inv =>
                (inv.status === 'sent' || inv.status === 'draft') &&
                inv.due_date &&
                new Date(inv.due_date).getTime() >= nowMs &&
                new Date(inv.due_date).getTime() <= in7DaysMs
            )
            .map(inv => ({
                id: inv.id,
                title: `Invoice ${inv.invoice_number ?? inv.id.slice(0, 8)}`,
                date: new Date(inv.due_date as string),
                type: 'invoice' as const,
                href: `/invoices/${inv.id}`,
            })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    // Recent contacts (last 5, newest first)
    const recentContacts = [...contacts]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)

    // Greeting
    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    const dateDisplay = now.toLocaleDateString('en-CH', { weekday: 'long', month: 'long', day: 'numeric' })

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 pb-8">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#3D4A67]">
                        {greeting}{userName ? `, ${userName}` : ''}!
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">{dateDisplay} · Here&apos;s your business overview.</p>
                </div>
            </div>

            {/* ── Error banner ─────────────────────────────────────────────── */}
            {fetchError && <ErrorBanner message={fetchError} onRetry={retryAll} />}

            {/* ── Overdue alerts ───────────────────────────────────────────── */}
            {!isLoading && (
                <OverdueAlertsBanner
                    overdueTasksList={overdueTasksList}
                    overdueInvoicesList={overdueInvoicesList}
                />
            )}

            {/* ── Stats Grid ──────────────────────────────────────────────── */}
            <section aria-label="Key metrics">
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                        <StatCard
                            href="/contacts"
                            label="Total Contacts"
                            value={contacts.length}
                            icon={Users}
                            iconColor="text-[#3D4A67]"
                            trend={contactsThisMonth > 0 ? `+${contactsThisMonth} this month` : 'No new this month'}
                            trendUp={contactsThisMonth > 0 ? true : undefined}
                            note={newClientsThisMonth > 0 ? `${newClientsThisMonth} new client${newClientsThisMonth > 1 ? 's' : ''} this month` : `${pipeline.client} active clients`}
                            noteIcon={Users}
                        />
                        <StatCard
                            href="/projects"
                            label="Active Projects"
                            value={activeProjects}
                            icon={FolderKanban}
                            iconColor="text-[#9EAE8E]"
                            trend={projectsThisMonth > 0 ? `+${projectsThisMonth} this month` : undefined}
                            trendUp={projectsThisMonth > 0 ? true : undefined}
                            note={`${completedProjects} completed overall`}
                            noteIcon={CheckSquare}
                        />
                        <StatCard
                            href="/tasks"
                            label="Open Tasks"
                            value={openTasks}
                            icon={CheckSquare}
                            iconColor="text-amber-500"
                            trend={completionRate > 0 ? `${completionRate}% completion rate` : undefined}
                            trendUp={completionRate >= 50 ? true : completionRate > 0 ? undefined : false}
                            note={totalTasks > 0 ? `${doneTasks} done of ${totalTasks} total` : 'No tasks yet'}
                            noteIcon={TrendingUp}
                        />
                        {/* Revenue card — custom to show pending info */}
                        <Link href="/invoices" aria-label={`Revenue: ${formatCHF(revenue)}`} className="block h-full">
                            <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                                {/* Ghost watermark */}
                                <div className="absolute -top-4 -right-4 pointer-events-none select-none" aria-hidden="true">
                                    <Receipt className="h-28 w-28 text-[#D1855C] opacity-[0.055]" />
                                </div>
                                <CardContent className="relative p-4 sm:p-5 flex flex-col h-full">
                                    <p className="text-xs sm:text-sm font-medium text-slate-500">Revenue (Paid)</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-[#3D4A67] leading-tight mt-1">{formatCHF(revenue)}</p>
                                    {revenueThisMonth > 0 && (
                                        <div className="flex items-center gap-1 mt-1.5">
                                            <TrendingUp className="h-3 w-3 text-green-500 shrink-0" aria-hidden="true" />
                                            <span className="text-xs font-medium text-green-600">
                                                +{formatCHF(revenueThisMonth)} this month
                                            </span>
                                        </div>
                                    )}
                                    {pendingInvoices.length > 0 && (
                                        <div className="mt-auto pt-3 flex items-center gap-1.5">
                                            <CreditCard className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                                            <p className="text-xs text-slate-500 truncate">
                                                {pendingInvoices.length} awaiting ({formatCHF(pendingAmount)})
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                )}
            </section>

            {/* ── Activity Feed + Right Column ─────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-5">

                {/* Activity feed (3/5 width on desktop) */}
                <div className="lg:col-span-3">
                    <OrganizationActivityFeed limit={12} showViewAll />
                </div>

                {/* Right column (2/5 width on desktop) */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Quick Actions */}
                    <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-[#3D4A67] text-base">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 pt-0">
                            {([
                                { href: '/contacts', icon: UserPlus,  label: 'Add New Contact', iconBg: 'bg-[#3D4A67]/10',  iconColor: 'text-[#3D4A67]',  hoverBg: 'hover:bg-[#3D4A67]/5'  },
                                { href: '/projects', icon: FolderPlus, label: 'Create Project',  iconBg: 'bg-[#9EAE8E]/20',  iconColor: 'text-[#9EAE8E]',  hoverBg: 'hover:bg-[#9EAE8E]/10' },
                                { href: '/invoices', icon: FilePlus,   label: 'Create Invoice',  iconBg: 'bg-[#D1855C]/15',  iconColor: 'text-[#D1855C]',  hoverBg: 'hover:bg-[#D1855C]/5'  },
                                { href: '/chat',     icon: Bot,        label: 'Start AI Chat',   iconBg: 'bg-purple-100',    iconColor: 'text-purple-600', hoverBg: 'hover:bg-purple-50'    },
                            ] as const).map(action => (
                                <Link key={action.href} href={action.href}>
                                    <button type="button" className={cn(
                                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-700 transition-colors",
                                        action.hoverBg,
                                    )}>
                                        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md shrink-0", action.iconBg)}>
                                            <action.icon className={cn("h-4 w-4", action.iconColor)} aria-hidden="true" />
                                        </span>
                                        <span className="text-sm font-medium">{action.label}</span>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 ml-auto shrink-0" aria-hidden="true" />
                                    </button>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Upcoming Deadlines */}
                    <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-md bg-[#3D4A67]/10 flex items-center justify-center shrink-0">
                                        <Calendar className="h-4 w-4 text-[#3D4A67]" aria-hidden="true" />
                                    </div>
                                    <CardTitle className="text-[#3D4A67] text-base">Upcoming</CardTitle>
                                </div>
                                {upcomingDeadlines.length > 0 && (
                                    <Badge variant="secondary" className="text-xs tabular-nums">
                                        {upcomingDeadlines.length}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-slate-500 text-xs">Deadlines in the next 7 days</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {isLoading ? (
                                <div className="space-y-2 animate-pulse">
                                    {([1, 2, 3] as const).map(i => (
                                        <div key={i} className="h-9 rounded-lg bg-slate-100" />
                                    ))}
                                </div>
                            ) : (
                                <UpcomingDeadlines items={upcomingDeadlines} nowMs={nowMs} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Pipeline + Recent Contacts ────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-5">

                {/* Pipeline (3/5 width) */}
                <Card className="border-slate-200 bg-white shadow-sm lg:col-span-3">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-[#3D4A67]">Sales Pipeline</CardTitle>
                                <CardDescription className="text-slate-500">
                                    Contacts by stage · conversion rates
                                </CardDescription>
                            </div>
                            <Link href="/contacts" className="text-xs text-[#3D4A67] hover:underline font-medium shrink-0">
                                View all →
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-7 rounded-xl bg-slate-100" />
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {([1, 2, 3, 4] as const).map(i => (
                                        <div key={i} className="h-20 rounded-xl bg-slate-100" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <PipelineBar pipeline={pipeline} total={contacts.length} />
                        )}
                    </CardContent>
                </Card>

                {/* Recent Contacts (2/5 width) */}
                <Card className="border-slate-200 bg-white shadow-sm lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-[#3D4A67] text-base">Recent Contacts</CardTitle>
                            <Link href="/contacts" className="text-xs text-[#3D4A67] hover:underline font-medium">
                                View all →
                            </Link>
                        </div>
                        <CardDescription className="text-slate-500 text-xs">Latest additions to your CRM</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {isLoading ? (
                            <div className="space-y-3 animate-pulse">
                                {([1, 2, 3, 4, 5] as const).map(i => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-3.5 w-28 rounded bg-slate-100" />
                                            <div className="h-3 w-16 rounded bg-slate-100" />
                                        </div>
                                        <div className="h-3 w-10 rounded bg-slate-100 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <RecentContacts contacts={recentContacts} nowMs={nowMs} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
