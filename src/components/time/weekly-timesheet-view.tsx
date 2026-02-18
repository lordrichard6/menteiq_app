'use client'

import { useState, useMemo } from 'react'
import { TimeEntry } from '@/types/time'
import { Task } from '@/types/task'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WeeklyTimesheetViewProps {
    timeEntries: TimeEntry[]
    tasks: Task[]
}

export function WeeklyTimesheetView({ timeEntries, tasks }: WeeklyTimesheetViewProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    )

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
    }, [currentWeekStart])

    const groupedEntries = useMemo(() => {
        // Group entries by task or "General"
        const groups: Record<string, { taskName: string; days: Record<string, number> }> = {}

        timeEntries.forEach(entry => {
            const entryDate = parseISO(entry.date)
            if (entryDate >= currentWeekStart && entryDate < addDays(currentWeekStart, 7)) {
                const key = entry.task_id || 'general'
                if (!groups[key]) {
                    const task = tasks.find(t => t.id === entry.task_id)
                    groups[key] = {
                        taskName: task ? task.title : 'General Project Time',
                        days: {}
                    }
                }
                const dateKey = entry.date // YYYY-MM-DD
                groups[key].days[dateKey] = (groups[key].days[dateKey] || 0) + entry.duration_minutes
            }
        })

        return Object.entries(groups)
    }, [timeEntries, tasks, currentWeekStart])

    const formatDuration = (mins: number) => {
        if (!mins) return '-'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        return m === 0 ? `${h}h` : `${h}h ${m}m`
    }

    const getDayTotal = (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        return timeEntries
            .filter(e => e.date === dateKey)
            .reduce((acc, curr) => acc + curr.duration_minutes, 0)
    }

    const weekTotal = weekDays.reduce((acc, day) => acc + getDayTotal(day), 0)

    return (
        <Card className="border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h4 className="text-sm font-bold text-[#3D4A67] uppercase tracking-tight flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-[#9EAE8E]" />
                        Weekly Summary
                    </h4>
                    <div className="flex items-center bg-white border border-slate-200 rounded-md p-1 shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500"
                            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-semibold px-2 min-w-[140px] text-center">
                            {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500"
                            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="text-sm font-bold text-[#3D4A67]">
                    Total: <span className="text-[#9EAE8E]">{formatDuration(weekTotal)}</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-4 py-3 font-semibold text-slate-500 border-b border-r border-slate-100 min-w-[200px]">Task / Category</th>
                            {weekDays.map(day => (
                                <th key={day.toISOString()} className="px-2 py-3 font-semibold text-center border-b border-slate-100 min-w-[80px]">
                                    <div className="text-[10px] uppercase text-slate-400">{format(day, 'EEE')}</div>
                                    <div className={`text-sm ${isSameDay(day, new Date()) ? 'text-[#9EAE8E] font-bold' : 'text-slate-600'}`}>
                                        {format(day, 'd')}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {groupedEntries.map(([key, group]) => (
                            <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-[#3D4A67] border-r border-slate-100">
                                    {group.taskName}
                                </td>
                                {weekDays.map(day => {
                                    const dateKey = format(day, 'yyyy-MM-dd')
                                    const duration = group.days[dateKey]
                                    return (
                                        <td key={dateKey} className="px-2 py-3 text-center text-slate-500">
                                            {duration ? (
                                                <span className="font-semibold text-[#3D4A67]">{formatDuration(duration)}</span>
                                            ) : (
                                                <span className="text-slate-200">-</span>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                        {groupedEntries.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                                    No time entries found for this week.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-slate-50/30 font-bold border-t border-slate-200">
                        <tr>
                            <td className="px-4 py-3 text-[#3D4A67] border-r border-slate-100">Daily Totals</td>
                            {weekDays.map(day => (
                                <td key={day.toISOString()} className="px-2 py-3 text-center text-[#3D4A67]">
                                    {formatDuration(getDayTotal(day))}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Card>
    )
}
