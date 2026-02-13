'use client'

import { useEffect, useMemo } from 'react'
import { useMilestoneStore } from '@/stores/milestone-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Flag, CheckCircle2, Clock, Circle } from 'lucide-react'
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns'

interface ProjectTimelineProps {
    projectId: string
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
    const { milestones, isLoading, fetchMilestones } = useMilestoneStore()

    useEffect(() => {
        fetchMilestones(projectId)
    }, [projectId, fetchMilestones])

    const sortedMilestones = useMemo(() => {
        return [...milestones].sort((a, b) => {
            if (!a.due_date && !b.due_date) return a.order_index - b.order_index
            if (!a.due_date) return 1
            if (!b.due_date) return -1
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        })
    }, [milestones])

    if (isLoading) return <div className="py-12 text-center text-slate-400">Loading timeline...</div>
    if (sortedMilestones.length === 0) return (
        <Card className="border-dashed border-2 py-12 text-center text-slate-500">
            <p className="mb-2">No milestones set for this project.</p>
            <p className="text-xs">Add milestones to see your project timeline here.</p>
        </Card>
    )

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-[#9EAE8E]" />
                            Project Timeline
                        </CardTitle>
                        <CardDescription>Scheduled milestones and progress over time.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="relative p-8">
                    {/* Continuous Line */}
                    <div className="absolute left-12 top-0 bottom-0 w-px bg-slate-100 md:left-auto md:right-0 md:top-12 md:bottom-auto md:left-0 md:h-px md:w-full" />

                    <div className="relative flex flex-col gap-8 md:flex-row md:justify-between md:items-start md:gap-4">
                        {sortedMilestones.map((m, index) => {
                            const isOverdue = m.due_date && isBefore(new Date(m.due_date), startOfDay(new Date())) && m.status !== 'completed'
                            const isCompleted = m.status === 'completed'

                            return (
                                <div key={m.id} className="relative flex items-start gap-4 md:flex-col md:items-center md:gap-6 md:flex-1">
                                    {/* Indicator Point */}
                                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm transition-colors ${isCompleted ? 'bg-[#9EAE8E]' : isOverdue ? 'bg-red-400' : 'bg-slate-200'
                                        }`}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-5 w-5 text-white" />
                                        ) : isOverdue ? (
                                            <Clock className="h-5 w-5 text-white" />
                                        ) : (
                                            <Flag className="h-4 w-4 text-slate-500" />
                                        )}
                                    </div>

                                    {/* Content Card */}
                                    <div className={`md:text-center w-full min-w-0 ${isCompleted ? 'opacity-60' : ''}`}>
                                        <h4 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-400' : 'text-[#3D4A67]'}`}>
                                            {m.name}
                                        </h4>
                                        <div className="mt-1 flex flex-col items-start gap-1 md:items-center">
                                            {m.due_date ? (
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {format(new Date(m.due_date), 'MMM d, yyyy')}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">No date set</span>
                                            )}
                                            {m.status === 'in_progress' && (
                                                <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-600 border-amber-200">
                                                    In Progress
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>

            {/* Legend/Footer */}
            <div className="bg-slate-50/50 border-t border-slate-100 px-8 py-3 flex items-center gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#9EAE8E]" />
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-200" />
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Upcoming</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Overdue</span>
                </div>
            </div>
        </Card>
    )
}
