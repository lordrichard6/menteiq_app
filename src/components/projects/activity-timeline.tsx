'use client'

import { useEffect } from 'react'
import { useActivityStore } from '@/stores/activity-store'
import { format } from 'date-fns'
import {
    PlusCircle,
    CheckCircle2,
    FileText,
    Upload,
    MessageSquare,
    RefreshCcw,
    User,
    Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActivityEventType } from '@/types/activity'

interface ActivityTimelineProps {
    projectId: string
}

const EVENT_ICONS: Record<ActivityEventType, any> = {
    created: PlusCircle,
    updated: RefreshCcw,
    deleted: Clock, // Use clock as fallback for system/delete
    viewed: User,
    emailed: MessageSquare,
    called: MessageSquare,
    noted: FileText,
    tagged: Badge,
    status_changed: RefreshCcw,
    assigned: User,
    completed: CheckCircle2,
    invoiced: FileText,
    paid: CheckCircle2,
    uploaded: Upload,
    downloaded: Clock
}

const EVENT_COLORS: Record<ActivityEventType, string> = {
    created: 'text-green-500 bg-green-50',
    updated: 'text-blue-500 bg-blue-50',
    deleted: 'text-red-500 bg-red-50',
    viewed: 'text-slate-500 bg-slate-50',
    emailed: 'text-purple-500 bg-purple-50',
    called: 'text-orange-500 bg-orange-50',
    noted: 'text-amber-500 bg-amber-50',
    tagged: 'text-indigo-500 bg-indigo-50',
    status_changed: 'text-blue-500 bg-blue-50',
    assigned: 'text-cyan-500 bg-cyan-50',
    completed: 'text-green-500 bg-green-50',
    invoiced: 'text-amber-500 bg-amber-50',
    paid: 'text-emerald-500 bg-emerald-50',
    uploaded: 'text-indigo-500 bg-indigo-50',
    downloaded: 'text-slate-500 bg-slate-50'
}

export function ActivityTimeline({ projectId }: ActivityTimelineProps) {
    const { activities, fetchActivities, isLoading } = useActivityStore()

    useEffect(() => {
        fetchActivities({ entityId: projectId, entityType: 'project' })
    }, [fetchActivities, projectId])

    if (isLoading && activities.length === 0) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D4A67]"></div>
            </div>
        )
    }

    if (activities.length === 0) {
        return (
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg">Project Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500 text-sm italic">No activity recorded for this project yet.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-400" />
                    Project Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                    {activities.map((activity, index) => {
                        const Icon = EVENT_ICONS[activity.eventType] || Clock
                        const colorClass = EVENT_COLORS[activity.eventType] || 'text-slate-500 bg-slate-50'

                        return (
                            <div key={activity.id} className="relative flex items-start gap-4 pl-10 group">
                                {/* Dot/Icon */}
                                <div className={`absolute left-0 p-1.5 rounded-full z-10 border-2 border-white ${colorClass}`}>
                                    <Icon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-[#3D4A67]">
                                            {activity.description || `${activity.eventType} project`}
                                        </p>
                                        <span className="text-xs text-slate-400">
                                            {format(activity.createdAt, 'MMM d, h:mm a')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {activity.userName && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {activity.userName}
                                            </p>
                                        )}
                                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-100 bg-slate-50/50">
                                                Metadata
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
