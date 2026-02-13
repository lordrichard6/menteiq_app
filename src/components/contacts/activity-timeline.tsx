'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getEntityActivity, EventType } from '@/lib/activity-log'
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

interface ActivityTimelineProps {
    contactId: string
}

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

export function ActivityTimeline({ contactId }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<ActivityEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<EventType | 'all'>('all')

    useEffect(() => {
        loadActivities()
    }, [contactId])

    async function loadActivities() {
        setIsLoading(true)
        try {
            const data = await getEntityActivity('contact', contactId)
            setActivities(data as ActivityEntry[])
        } catch (error) {
            console.error('Failed to load activities:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredActivities = filter === 'all'
        ? activities
        : activities.filter(a => a.event_type === filter)

    if (isLoading) {
        return (
            <Card className="border-slate-200 bg-white">
                <CardHeader>
                    <CardTitle className="text-[#3D4A67]">Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    <span className="ml-2 text-slate-500">Loading activities...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[#3D4A67]">Activity Timeline</CardTitle>
                    <Select value={filter} onValueChange={(v) => setFilter(v as EventType | 'all')}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Activities</SelectItem>
                            <SelectItem value="created">Created</SelectItem>
                            <SelectItem value="updated">Updated</SelectItem>
                            <SelectItem value="status_changed">Status Changed</SelectItem>
                            <SelectItem value="emailed">Emailed</SelectItem>
                            <SelectItem value="called">Called</SelectItem>
                            <SelectItem value="noted">Notes</SelectItem>
                            <SelectItem value="invoiced">Invoiced</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm">
                            {filter === 'all'
                                ? 'No activity yet for this contact'
                                : `No ${EVENT_LABELS[filter as EventType].toLowerCase()} activities`}
                        </p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                        {/* Activity items */}
                        <div className="space-y-6">
                            {filteredActivities.map((activity) => (
                                <div key={activity.id} className="relative pl-10">
                                    {/* Icon */}
                                    <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-slate-200">
                                        {EVENT_ICONS[activity.event_type] || (
                                            <Activity className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="secondary" className="text-xs bg-slate-100">
                                                        {EVENT_LABELS[activity.event_type]}
                                                    </Badge>
                                                    {activity.user_name && (
                                                        <span className="text-xs text-slate-500">
                                                            by {activity.user_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-700">
                                                    {activity.description || `${EVENT_LABELS[activity.event_type]} ${activity.entity_type}`}
                                                </p>
                                                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                                    <div className="mt-2 text-xs text-slate-500 space-y-1">
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
                                            <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
