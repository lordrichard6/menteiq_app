'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getOrganizationActivity, EventType } from '@/lib/activity-log'
import { formatDistanceToNow } from 'date-fns'
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
    created: <UserPlus className="h-3.5 w-3.5 text-green-600" />,
    updated: <Edit className="h-3.5 w-3.5 text-blue-600" />,
    deleted: <Trash2 className="h-3.5 w-3.5 text-red-600" />,
    viewed: <Eye className="h-3.5 w-3.5 text-slate-500" />,
    emailed: <Mail className="h-3.5 w-3.5 text-purple-600" />,
    called: <Phone className="h-3.5 w-3.5 text-indigo-600" />,
    noted: <FileText className="h-3.5 w-3.5 text-amber-600" />,
    tagged: <Tag className="h-3.5 w-3.5 text-pink-600" />,
    status_changed: <Activity className="h-3.5 w-3.5 text-orange-600" />,
    assigned: <UserPlus className="h-3.5 w-3.5 text-teal-600" />,
    completed: <CheckCircle className="h-3.5 w-3.5 text-green-600" />,
    invoiced: <DollarSign className="h-3.5 w-3.5 text-emerald-600" />,
    paid: <DollarSign className="h-3.5 w-3.5 text-green-600" />,
    uploaded: <Upload className="h-3.5 w-3.5 text-blue-500" />,
    downloaded: <Download className="h-3.5 w-3.5 text-slate-500" />,
}

const EVENT_LABELS: Record<EventType, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    viewed: 'Viewed',
    emailed: 'Emailed',
    called: 'Called',
    noted: 'Note',
    tagged: 'Tagged',
    status_changed: 'Status',
    assigned: 'Assigned',
    completed: 'Completed',
    invoiced: 'Invoice',
    paid: 'Payment',
    uploaded: 'Upload',
    downloaded: 'Download',
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

interface OrganizationActivityFeedProps {
    limit?: number
    showViewAll?: boolean
}

export function OrganizationActivityFeed({
    limit = 20,
    showViewAll = false
}: OrganizationActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadActivities()
    }, [])

    async function loadActivities() {
        setIsLoading(true)
        try {
            const data = await getOrganizationActivity(limit)
            setActivities(data as ActivityEntry[])
        } catch (error) {
            console.error('Failed to load organization activities:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-[#3D4A67]">Recent Activity</CardTitle>
                    <CardDescription className="text-slate-600">
                        Organization-wide activity feed
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-slate-500">Loading activities...</span>
                </CardContent>
            </Card>
        )
    }

    const linkableActivity = (activity: ActivityEntry) => {
        const entityType = activity.entity_type
        if (ENTITY_LINKS[entityType]) {
            return ENTITY_LINKS[entityType](activity.entity_id)
        }
        return null
    }

    return (
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
                <CardTitle className="text-[#3D4A67]">Recent Activity</CardTitle>
                <CardDescription className="text-slate-600">
                    Organization-wide activity feed
                </CardDescription>
            </CardHeader>
            <CardContent>
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm">No recent activity</p>
                        <p className="text-slate-400 text-xs mt-1">
                            Activity will appear here as you work in the CRM
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {activities.map((activity) => {
                            const link = linkableActivity(activity)
                            const content = (
                                <div className="flex items-start gap-3 text-sm">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                                        {EVENT_ICONS[activity.event_type] || (
                                            <Activity className="h-3.5 w-3.5 text-slate-400" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                            {activity.user_name && (
                                                <span className="text-slate-700 font-medium">
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
                                        <p className="text-slate-600 text-sm line-clamp-1">
                                            {activity.description || `${EVENT_LABELS[activity.event_type]} ${activity.entity_type}`}
                                        </p>
                                        {activity.entity_name && (
                                            <p className="text-slate-500 text-xs mt-0.5">
                                                {activity.entity_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                                        <Clock className="h-3 w-3" />
                                        <span className="hidden sm:inline">
                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            )

                            return link ? (
                                <Link
                                    key={activity.id}
                                    href={link}
                                    className="block rounded-lg p-3 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                                >
                                    {content}
                                </Link>
                            ) : (
                                <div
                                    key={activity.id}
                                    className="p-3 rounded-lg"
                                >
                                    {content}
                                </div>
                            )
                        })}
                    </div>
                )}

                {showViewAll && activities.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                        <Link
                            href="/activity"
                            className="text-sm text-[#3D4A67] hover:underline font-medium"
                        >
                            View all activity →
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
