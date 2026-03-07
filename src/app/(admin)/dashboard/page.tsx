'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useContactStore } from '@/stores/contact-store'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { useInvoiceStore } from '@/stores/invoice-store'
import { OrganizationActivityFeed } from '@/components/dashboard/organization-activity-feed'
import {
    Users, FolderKanban, CheckSquare, Receipt,
    UserPlus, FolderPlus, Bot, FilePlus,
    AlertTriangle, Calendar, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ─── Constants ──────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
    { key: 'lead', label: 'Leads', color: 'bg-[#3D4A67]' },
    { key: 'opportunity', label: 'Opportunities', color: 'bg-[#E9B949]' },
    { key: 'client', label: 'Clients', color: 'bg-[#9EAE8E]' },
    { key: 'churned', label: 'Churned', color: 'bg-[#D1855C]' },
] as const

// ─── Module-level sub-components ────────────────────────────────────────────

function StatCardSkeleton() {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse" role="status" aria-label="Loading">
            <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-5 w-5 rounded bg-slate-200" />
            </div>
            <div className="h-8 w-16 rounded bg-slate-200" />
        </div>
    )
}

interface StatCardProps {
    href: string
    label: string
    value: number
    icon: React.ElementType
    accentColor: string
    borderHover: string
}

function StatCard({ href, label, value, icon: Icon, accentColor, borderHover }: StatCardProps) {
    return (
        <Link href={href} aria-label={`${label}: ${value}`}>
            <Card className={cn(
                "border-slate-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer",
                borderHover,
            )}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardDescription className="text-slate-600">{label}</CardDescription>
                        <Icon className={cn("h-5 w-5", accentColor)} aria-hidden="true" />
                    </div>
                    <CardTitle className="text-3xl text-[#3D4A67]">{value}</CardTitle>
                </CardHeader>
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
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">Failed to load data</p>
                <p className="text-xs text-red-600 mt-0.5">{message}</p>
            </div>
            <button
                type="button"
                onClick={onRetry}
                className="text-sm font-medium text-red-700 hover:text-red-900 hover:underline shrink-0"
            >
                Retry
            </button>
        </div>
    )
}

interface OverdueAlertsBannerProps {
    overdueTasks: number
    overdueInvoices: number
}

function OverdueAlertsBanner({ overdueTasks, overdueInvoices }: OverdueAlertsBannerProps) {
    if (overdueTasks === 0 && overdueInvoices === 0) return null

    const parts: string[] = []
    if (overdueTasks > 0) parts.push(`${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`)
    if (overdueInvoices > 0) parts.push(`${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''}`)

    return (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
            <p className="text-sm text-amber-800 font-medium">
                You have {parts.join(' and ')} that need attention.
            </p>
            <div className="ml-auto flex gap-2 shrink-0">
                {overdueTasks > 0 && (
                    <Link href="/tasks" className="text-xs font-medium text-amber-700 hover:underline">
                        View tasks
                    </Link>
                )}
                {overdueInvoices > 0 && (
                    <Link href="/invoices" className="text-xs font-medium text-amber-700 hover:underline">
                        View invoices
                    </Link>
                )}
            </div>
        </div>
    )
}

interface PipelineBarProps {
    pipeline: Record<string, number>
    total: number
}

function PipelineBar({ pipeline, total }: PipelineBarProps) {
    if (total === 0) {
        return <p className="text-sm text-slate-500 text-center py-4">No contacts yet</p>
    }

    return (
        <div className="space-y-3">
            {/* Visual bar */}
            <div className="flex h-6 rounded-full overflow-hidden bg-slate-100" role="img" aria-label="Pipeline distribution">
                {PIPELINE_STAGES.map(stage => {
                    const count = pipeline[stage.key] ?? 0
                    if (count === 0) return null
                    const pct = (count / total) * 100
                    return (
                        <div
                            key={stage.key}
                            className={cn("h-full transition-all", stage.color)}
                            style={{ width: `${pct}%` }}
                            title={`${stage.label}: ${count} (${Math.round(pct)}%)`}
                        />
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex justify-between text-sm">
                {PIPELINE_STAGES.map(stage => (
                    <div key={stage.key} className="text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                            <span className={cn("h-2.5 w-2.5 rounded-full inline-block", stage.color)} />
                            <span className="text-slate-500">{stage.label}</span>
                        </div>
                        <p className="text-lg font-bold text-[#3D4A67] mt-0.5">{pipeline[stage.key] ?? 0}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

interface DeadlineItem {
    id: string
    title: string
    date: Date
    type: 'task' | 'project' | 'invoice'
    href: string
}

interface UpcomingDeadlinesProps {
    items: DeadlineItem[]
    now: number
}

function UpcomingDeadlines({ items, now }: UpcomingDeadlinesProps) {
    if (items.length === 0) {
        return (
            <p className="text-sm text-slate-500 text-center py-6">
                No upcoming deadlines in the next 7 days
            </p>
        )
    }

    const typeColors: Record<string, string> = {
        task: 'bg-[#E9B949]/15 text-[#E9B949]',
        project: 'bg-[#9EAE8E]/15 text-[#9EAE8E]',
        invoice: 'bg-[#D1855C]/15 text-[#D1855C]',
    }

    return (
        <ul className="space-y-2">
            {items.slice(0, 5).map(item => {
                const daysLeft = Math.ceil((item.date.getTime() - now) / (1000 * 60 * 60 * 24))
                const urgency = daysLeft <= 1 ? 'text-red-600 font-semibold' : daysLeft <= 3 ? 'text-amber-600' : 'text-slate-500'

                return (
                    <li key={`${item.type}-${item.id}`}>
                        <Link
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors group"
                        >
                            <span className={cn("text-[10px] font-medium uppercase px-1.5 py-0.5 rounded", typeColors[item.type])}>
                                {item.type}
                            </span>
                            <span className="text-sm text-slate-700 truncate flex-1">{item.title}</span>
                            <span className={cn("text-xs shrink-0", urgency)}>
                                {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" aria-hidden="true" />
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

    // Fetch all data + user on mount
    React.useEffect(() => {
        fetchContacts()
        fetchProjects()
        fetchTasks()
        fetchInvoices()

        const loadUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const name = user.user_metadata?.full_name || user.user_metadata?.name || ''
                setUserName(name.split(' ')[0] || '')
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

    const pipeline: Record<string, number> = {
        lead: contacts.filter(c => c.status === 'lead').length,
        opportunity: contacts.filter(c => c.status === 'opportunity').length,
        client: contacts.filter(c => c.status === 'client').length,
        churned: contacts.filter(c => c.status === 'churned').length,
    }

    const openTasks = tasks.filter(t => t.status !== 'done').length

    // Revenue: sum of paid invoices
    const revenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.amount_total ?? 0), 0)

    // Overdue counts
    const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < now).length
    const overdueInvoices = invoices.filter(inv =>
        (inv.status === 'sent' || inv.status === 'overdue') &&
        inv.due_date &&
        new Date(inv.due_date) < now
    ).length

    // Upcoming deadlines (next 7 days)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingDeadlines: DeadlineItem[] = [
        ...tasks
            .filter(t => t.status !== 'done' && t.dueDate && t.dueDate >= now && t.dueDate <= in7Days)
            .map(t => ({
                id: t.id,
                title: t.title,
                date: t.dueDate as Date,
                type: 'task' as const,
                href: `/tasks/${t.id}`,
            })),
        ...projects
            .filter(p => p.status === 'active' && p.deadline && p.deadline >= now && p.deadline <= in7Days)
            .map(p => ({
                id: p.id,
                title: p.name,
                date: p.deadline as Date,
                type: 'project' as const,
                href: `/projects/${p.id}`,
            })),
        ...invoices
            .filter(inv =>
                (inv.status === 'sent' || inv.status === 'draft') &&
                inv.due_date &&
                new Date(inv.due_date) >= now &&
                new Date(inv.due_date) <= in7Days
            )
            .map(inv => ({
                id: inv.id,
                title: `Invoice ${inv.invoice_number ?? inv.id.slice(0, 8)}`,
                date: new Date(inv.due_date as string),
                type: 'invoice' as const,
                href: `/invoices/${inv.id}`,
            })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    // Format revenue
    const formattedRevenue = new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(revenue)

    // Greeting
    const hour = now.getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

    return (
        <div className="space-y-8">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-3xl font-bold text-[#3D4A67]">Dashboard</h1>
                <p className="text-slate-600">
                    {greeting}{userName ? `, ${userName}` : ''}! Here&apos;s an overview of your CRM.
                </p>
            </div>

            {/* ── Error banner ─────────────────────────────────────────────── */}
            {fetchError && <ErrorBanner message={fetchError} onRetry={retryAll} />}

            {/* ── Overdue alerts ───────────────────────────────────────────── */}
            {!isLoading && <OverdueAlertsBanner overdueTasks={overdueTasks} overdueInvoices={overdueInvoices} />}

            {/* ── Stats Grid ──────────────────────────────────────────────── */}
            <section aria-label="Key metrics">
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard
                            href="/contacts"
                            label="Total Contacts"
                            value={contacts.length}
                            icon={Users}
                            accentColor="text-[#3D4A67]"
                            borderHover="hover:border-[#3D4A67]/30"
                        />
                        <StatCard
                            href="/projects"
                            label="Active Projects"
                            value={projects.filter(p => p.status === 'active').length}
                            icon={FolderKanban}
                            accentColor="text-[#9EAE8E]"
                            borderHover="hover:border-[#9EAE8E]/30"
                        />
                        <StatCard
                            href="/tasks"
                            label="Open Tasks"
                            value={openTasks}
                            icon={CheckSquare}
                            accentColor="text-[#E9B949]"
                            borderHover="hover:border-[#E9B949]/30"
                        />
                        <Link href="/invoices" aria-label={`Revenue: ${formattedRevenue}`}>
                            <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#D1855C]/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardDescription className="text-slate-600">Revenue (Paid)</CardDescription>
                                        <Receipt className="h-5 w-5 text-[#D1855C]" aria-hidden="true" />
                                    </div>
                                    <CardTitle className="text-2xl text-[#3D4A67]">{formattedRevenue}</CardTitle>
                                </CardHeader>
                            </Card>
                        </Link>
                    </div>
                )}
            </section>

            {/* ── Activity + Quick Actions / Deadlines ────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
                <OrganizationActivityFeed limit={10} showViewAll />

                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-[#3D4A67]">Quick Actions</CardTitle>
                            <CardDescription className="text-slate-600">Common tasks at your fingertips</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/contacts">
                                <button type="button" className="w-full flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-left text-slate-700 hover:bg-[#3D4A67]/10 transition-colors">
                                    <UserPlus className="h-5 w-5 text-[#3D4A67]" aria-hidden="true" />
                                    Add New Contact
                                </button>
                            </Link>
                            <Link href="/projects">
                                <button type="button" className="w-full flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-left text-slate-700 hover:bg-[#9EAE8E]/10 transition-colors">
                                    <FolderPlus className="h-5 w-5 text-[#9EAE8E]" aria-hidden="true" />
                                    Create Project
                                </button>
                            </Link>
                            <Link href="/invoices">
                                <button type="button" className="w-full flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-left text-slate-700 hover:bg-[#D1855C]/10 transition-colors">
                                    <FilePlus className="h-5 w-5 text-[#D1855C]" aria-hidden="true" />
                                    Create Invoice
                                </button>
                            </Link>
                            <Link href="/chat">
                                <button type="button" className="w-full flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-left text-slate-700 hover:bg-purple-500/10 transition-colors">
                                    <Bot className="h-5 w-5 text-purple-500" aria-hidden="true" />
                                    Start AI Chat
                                </button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Upcoming Deadlines */}
                    <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-[#3D4A67]" aria-hidden="true" />
                                <CardTitle className="text-[#3D4A67]">Upcoming Deadlines</CardTitle>
                            </div>
                            <CardDescription className="text-slate-600">Tasks, projects &amp; invoices due in the next 7 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-2 animate-pulse">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-10 rounded-lg bg-slate-100" />
                                    ))}
                                </div>
                            ) : (
                                <UpcomingDeadlines items={upcomingDeadlines} now={now.getTime()} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Pipeline Overview ───────────────────────────────────────── */}
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-[#3D4A67]">Sales Pipeline</CardTitle>
                    <CardDescription className="text-slate-600">Contacts by stage</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-6 rounded-full bg-slate-100" />
                            <div className="flex justify-between">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="text-center space-y-1">
                                        <div className="h-3 w-16 rounded bg-slate-100 mx-auto" />
                                        <div className="h-7 w-8 rounded bg-slate-100 mx-auto" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <PipelineBar pipeline={pipeline} total={contacts.length} />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
