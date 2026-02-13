'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { getOrganizationActivity, EventType } from '@/lib/activity-log'
import { formatDistanceToNow, format } from 'date-fns'
import {
    UserPlus,
    Edit,
    Trash2,
    Mail,
    Phone,
    FileText,
    CheckCircle,
    Clock,
    Tag,
    Loader2,
    Activity,
    DollarSign,
    Upload,
    Download,
    Eye,
    AlertCircle,
    RefreshCw,
    ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface ActivityEntry {
    id: string
    tenant_id: string
    user_id: string
    event_type: EventType
    entity_type: string
    entity_id: string
    entity_name?: string
    description?: string
    metadata?: Record<string, any>
    created_at: string
    user_name?: string
    user_avatar?: string
}

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
    created: <UserPlus className="h-4 w-4 text-green-600" />,
    updated: <Edit className="h-4 w-4 text-blue-600" />,
    deleted: <Trash2 className="h-4 w-4 text-red-600" />,
    viewed: <Eye className="h-4 w-4 text-slate-500" />,
    emailed: <Mail className="h-4 w-4 text-purple-600" />,
    called: <Phone className="h-4 w-4 text-indigo-600" />,
    noted: <FileText className="h-4 w-4 text-amber-600" />,
    tagged: <Tag className="h-4 w-4 text-pink-600" />,
    status_changed: <Activity className="h-4 w-4 text-orange-600" />,
    assigned: <UserPlus className="h-4 w-4 text-teal-600" />,
    completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    invoiced: <DollarSign className="h-4 w-4 text-emerald-600" />,
    paid: <DollarSign className="h-4 w-4 text-green-600" />,
    uploaded: <Upload className="h-4 w-4 text-blue-500" />,
    downloaded: <Download className="h-4 w-4 text-slate-500" />,
}

const EVENT_LABELS: Record<EventType, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    viewed: 'Viewed',
    emailed: 'Emailed',
    called: 'Called',
    noted: 'Note Added',
    tagged: 'Tagged',
    status_changed: 'Status Changed',
    assigned: 'Assigned',
    completed: 'Completed',
    invoiced: 'Invoiced',
    paid: 'Paid',
    uploaded: 'Uploaded',
    downloaded: 'Downloaded',
}

const ENTITY_COLORS: Record<string, string> = {
    contact: 'bg-[#3D4A67]/10 text-[#3D4A67]',
    project: 'bg-[#9EAE8E]/10 text-[#9EAE8E]',
    task: 'bg-[#E9B949]/10 text-[#E9B949]',
    invoice: 'bg-[#D1855C]/10 text-[#D1855C]',
    document: 'bg-blue-100 text-blue-700',
    note: 'bg-purple-100 text-purple-700',
}

const ENTITY_LINKS: Record<string, (id: string) => string> = {
    contact: (id) => `/contacts/${id}`,
    project: (id) => `/projects/${id}`,
    task: (id) => `/tasks/${id}`,
    invoice: (id) => `/invoices/${id}`,
}

export default function ActivityPage() {
    const [activities, setActivities] = useState<ActivityEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [eventFilter, setEventFilter] = useState<EventType | 'all'>('all')
    const [entityFilter, setEntityFilter] = useState<string>('all')

    useEffect(() => {
        loadActivities()
    }, [])

    async function loadActivities() {
        setIsLoading(true)
        try {
            const data = await getOrganizationActivity(100) // Fetch more for filtering
            setActivities(data as ActivityEntry[])
        } catch (error) {
            console.error('Failed to load activities:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredActivities = activities.filter(a => {
        if (eventFilter !== 'all' && a.event_type !== eventFilter) return false
        if (entityFilter !== 'all' && a.entity_type !== entityFilter) return false
        return true
    })

    const linkableActivity = (activity: ActivityEntry) => {
        const entityType = activity.entity_type
        if (ENTITY_LINKS[entityType]) {
            return ENTITY_LINKS[entityType](activity.entity_id)
        }
        return null
    }

    // Get unique entity types for filter
    const entityTypes = Array.from(new Set(activities.map(a => a.entity_type)))

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold text-[#3D4A67]">Activity Dashboard</h1>
                    <p className="text-slate-600 mt-1">
                        Complete timeline of all organization activities
                    </p>
                </div>
                <Button
                    onClick={loadActivities}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="border-slate-300"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-slate-200 bg-white">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Event Type
                            </label>
                            <Select
                                value={eventFilter}
                                onValueChange={(v) => setEventFilter(v as EventType | 'all')}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All events" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Events</SelectItem>
                                    <SelectItem value="created">Created</SelectItem>
                                    <SelectItem value="updated">Updated</SelectItem>
                                    <SelectItem value="deleted">Deleted</SelectItem>
                                    <SelectItem value="status_changed">Status Changed</SelectItem>
                                    <SelectItem value="emailed">Emailed</SelectItem>
                                    <SelectItem value="called">Called</SelectItem>
                                    <SelectItem value="noted">Notes</SelectItem>
                                    <SelectItem value="invoiced">Invoiced</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Entity Type
                            </label>
                            <Select value={entityFilter} onValueChange={setEntityFilter}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All entities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Entities</SelectItem>
                                    {entityTypes.map(type => (
                                        <SelectItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}s
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <div className="text-sm text-slate-600">
                                <div className="font-medium">{filteredActivities.length}</div>
                                <div className="text-xs">Activities</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="border-slate-200 bg-white">
                <CardHeader>
                    <CardTitle className="text-[#3D4A67]">Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            <span className="ml-2 text-slate-500">Loading activities...</span>
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                            <p className="text-slate-500 text-sm">No activities found</p>
                            <p className="text-slate-400 text-xs mt-1">
                                Try adjusting your filters or create some activity
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

                            {/* Activity items */}
                            <div className="space-y-6">
                                {filteredActivities.map((activity) => {
                                    const link = linkableActivity(activity)
                                    const content = (
                                        <div className="relative pl-12">
                                            {/* Icon */}
                                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-slate-200">
                                                {EVENT_ICONS[activity.event_type] || (
                                                    <Activity className="h-4 w-4 text-slate-400" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {activity.user_name && (
                                                            <span className="text-sm font-medium text-slate-900">
                                                                {activity.user_name}
                                                            </span>
                                                        )}
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-xs ${ENTITY_COLORS[activity.entity_type] || 'bg-slate-100 text-slate-700'}`}
                                                        >
                                                            {activity.entity_type}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {EVENT_LABELS[activity.event_type]}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Clock className="h-3 w-3" />
                                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-700 mb-1">
                                                    {activity.description || `${EVENT_LABELS[activity.event_type]} ${activity.entity_type}`}
                                                </p>

                                                {activity.entity_name && (
                                                    <p className="text-sm text-slate-600 font-medium">
                                                        {activity.entity_name}
                                                    </p>
                                                )}

                                                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                                                        {activity.metadata.subject && (
                                                            <div>Subject: {activity.metadata.subject}</div>
                                                        )}
                                                        {activity.metadata.duration && (
                                                            <div>Duration: {activity.metadata.duration} minutes</div>
                                                        )}
                                                        {activity.metadata.amount && (
                                                            <div>
                                                                Amount: {activity.metadata.currency} {activity.metadata.amount}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )

                                    return link ? (
                                        <Link key={activity.id} href={link}>
                                            {content}
                                        </Link>
                                    ) : (
                                        <div key={activity.id}>{content}</div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
