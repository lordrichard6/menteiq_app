'use client'

import { useEffect, useState } from 'react'
import { useTimeStore } from '@/stores/time-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WeeklyTimesheetView } from './weekly-timesheet-view'
import { LogTimeDialog } from './log-time-dialog'
import { useTaskStore } from '@/stores/task-store'
import { format } from 'date-fns'
import { Clock, Plus, Trash2, User, CheckCircle2, XCircle, List, Calendar as CalendarIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProjectTimeTabProps {
    projectId: string
}

export function ProjectTimeTab({ projectId }: ProjectTimeTabProps) {
    const { timeEntries, isLoading, fetchTimeEntries, deleteTimeEntry } = useTimeStore()
    const { tasks } = useTaskStore()
    const [isLogTimeOpen, setIsLogTimeOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'weekly'>('list')

    useEffect(() => {
        fetchTimeEntries(projectId)
    }, [projectId, fetchTimeEntries])

    const totalMinutes = timeEntries.reduce((acc, curr) => acc + curr.duration_minutes, 0)
    const billableMinutes = timeEntries
        .filter(e => e.is_billable)
        .reduce((acc, curr) => acc + curr.duration_minutes, 0)

    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return `${h}h ${m}m`
    }

    const billablePercentage = totalMinutes > 0 ? (billableMinutes / totalMinutes) * 100 : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-[#3D4A67]">Time Tracking</h3>
                    <p className="text-sm text-slate-500">Log and manage hours spent on this project.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`h-7 px-3 gap-2 ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-3.5 w-3.5" />
                            <span className="text-xs">List</span>
                        </Button>
                        <Button
                            variant={viewMode === 'weekly' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`h-7 px-3 gap-2 ${viewMode === 'weekly' ? 'bg-white shadow-sm' : ''}`}
                            onClick={() => setViewMode('weekly')}
                        >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span className="text-xs">Weekly</span>
                        </Button>
                    </div>
                    <Button
                        onClick={() => setIsLogTimeOpen(true)}
                        className="bg-[#9EAE8E] hover:bg-[#8E9E7E] text-white gap-2"
                    >
                        <Plus className="h-4 w-4" /> Log Time
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-slate-200 shadow-sm bg-slate-50/30">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Logged</CardDescription>
                        <CardTitle className="text-3xl font-bold text-[#3D4A67]">{formatDuration(totalMinutes)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-400">Lifetime project hours</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-slate-50/30 md:col-span-2">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-400">Billability</CardDescription>
                            <span className="text-xs font-bold text-[#9EAE8E]">{Math.round(billablePercentage)}% Billable</span>
                        </div>
                        <CardTitle className="text-3xl font-bold text-[#3D4A67]">{formatDuration(billableMinutes)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Progress value={billablePercentage} className="h-2 bg-slate-100" />
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>NON-BILLABLE: {formatDuration(totalMinutes - billableMinutes)}</span>
                            <span>BILLABLE: {formatDuration(billableMinutes)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {viewMode === 'weekly' ? (
                <WeeklyTimesheetView
                    timeEntries={timeEntries}
                    tasks={tasks.filter(t => t.projectId === projectId)}
                />
            ) : (
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 font-semibold text-[#3D4A67]">User & Work</th>
                                    <th className="px-6 py-4 font-semibold text-[#3D4A67]">Date</th>
                                    <th className="px-6 py-4 font-semibold text-[#3D4A67]">Billable</th>
                                    <th className="px-6 py-4 font-semibold text-[#3D4A67]">Duration</th>
                                    <th className="px-6 py-4 font-semibold text-[#3D4A67]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            Loading time entries...
                                        </td>
                                    </tr>
                                ) : timeEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                            No time entries recorded for this project yet.
                                        </td>
                                    </tr>
                                ) : (
                                    timeEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-[#3D4A67]">
                                                            {entry.user?.first_name} {entry.user?.last_name}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{entry.description || 'No description provided'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {format(new Date(entry.date), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-6 py-4">
                                                {entry.is_billable ? (
                                                    <Badge variant="outline" className="text-[#9EAE8E] border-[#9EAE8E]/30 bg-[#9EAE8E]/5 gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Yes
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-400 border-slate-200 gap-1">
                                                        <XCircle className="h-3 w-3" /> No
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-[#3D4A67]">{formatDuration(entry.duration_minutes)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-500 transition-colors"
                                                    onClick={() => deleteTimeEntry(entry.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <LogTimeDialog
                open={isLogTimeOpen}
                onOpenChange={setIsLogTimeOpen}
                projectId={projectId}
            />
        </div>
    )
}
