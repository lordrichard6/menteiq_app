'use client'

import { useEffect, useState } from 'react'
import { useMilestoneStore } from '@/stores/milestone-store'
import { useTaskStore } from '@/stores/task-store'
import { useTimeStore } from '@/stores/time-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Flag, Calendar, MoreVertical, CheckCircle2, Circle, Clock, Loader2, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MilestoneSectionProps {
    projectId: string
}

export function MilestoneSection({ projectId }: MilestoneSectionProps) {
    const { milestones, isLoading, fetchMilestones, addMilestone, updateMilestone } = useMilestoneStore()
    const { tasks } = useTaskStore()
    const { timeEntries } = useTimeStore()
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDueDate, setNewDueDate] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchMilestones(projectId)
    }, [projectId, fetchMilestones])

    const completedCount = milestones.filter(m => m.status === 'completed').length
    const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName || isSubmitting) return

        setIsSubmitting(true)
        try {
            await addMilestone({
                project_id: projectId,
                name: newName,
                due_date: newDueDate || null,
                order_index: milestones.length
            })
            setIsAddOpen(false)
            setNewName('')
            setNewDueDate('')
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleStatus = async (milestone: any) => {
        const nextStatus = milestone.status === 'completed' ? 'pending' : 'completed'
        await updateMilestone(milestone.id, { status: nextStatus })
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Flag className="h-5 w-5 text-[#9EAE8E]" />
                            Project Milestones
                        </CardTitle>
                        <CardDescription>Track key phases and high-level goals.</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-slate-200 hover:bg-slate-50"
                        onClick={() => setIsAddOpen(true)}
                    >
                        <Plus className="h-4 w-4" /> Add
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {milestones.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <span>Progression</span>
                            <span>{completedCount} / {milestones.length} Completed</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-slate-100" />
                    </div>
                )}

                <div className="space-y-1">
                    {isLoading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Loading milestones...</div>
                    ) : milestones.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm italic border-2 border-dashed border-slate-100 rounded-lg">
                            No milestones defined yet.
                        </div>
                    ) : (
                        milestones.map((m) => {
                            const milestoneTasks = tasks.filter(t => t.milestone_id === m.id)
                            const completedTasks = milestoneTasks.filter(t => t.status === 'done').length
                            const taskProgress = milestoneTasks.length > 0
                                ? (completedTasks / milestoneTasks.length) * 100
                                : m.status === 'completed' ? 100 : 0

                            const milestoneHours = timeEntries
                                .filter(e => milestoneTasks.some(t => t.id === e.task_id))
                                .reduce((acc, curr) => acc + curr.duration_minutes, 0)

                            const formatDuration = (mins: number) => {
                                const h = Math.floor(mins / 60)
                                const m = mins % 60
                                return m === 0 ? `${h}h` : `${h}h ${m}m`
                            }

                            return (
                                <div
                                    key={m.id}
                                    className="group flex flex-col p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <button
                                                onClick={() => toggleStatus(m)}
                                                className="mt-0.5 flex-shrink-0"
                                            >
                                                {m.status === 'completed' ? (
                                                    <CheckCircle2 className="h-5 w-5 text-[#9EAE8E]" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-slate-300" />
                                                )}
                                            </button>
                                            <div className="min-w-0">
                                                <p className={`font-semibold text-sm truncate ${m.status === 'completed' ? 'text-slate-400 line-through' : 'text-[#3D4A67]'}`}>
                                                    {m.name}
                                                </p>
                                                {m.due_date && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                                        <Clock className="h-3 w-3" />
                                                        {format(new Date(m.due_date), 'MMM d, yyyy')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {milestoneHours > 0 && (
                                                <Badge variant="secondary" className="h-5 text-[10px] bg-[#9EAE8E]/10 text-[#7E8E6E] hover:bg-[#9EAE8E]/20 border-0 px-1.5 shadow-none">
                                                    {formatDuration(milestoneHours)}
                                                </Badge>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {milestoneTasks.length > 0 && (
                                        <div className="space-y-1 px-8">
                                            <div className="flex justify-between items-center text-[10px] font-medium text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <BarChart3 className="h-3 w-3" />
                                                    Tasks: {completedTasks}/{milestoneTasks.length}
                                                </span>
                                                <span>{Math.round(taskProgress)}%</span>
                                            </div>
                                            <Progress value={taskProgress} className="h-1 bg-slate-100" />
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </CardContent>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleAdd}>
                        <DialogHeader>
                            <DialogTitle className="text-[#3D4A67]">Add Milestone</DialogTitle>
                            <DialogDescription>
                                Set a high-level goal for this project.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Phase Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Design Discovery"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                    className="border-slate-200"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="due_date">Due Date (Optional)</Label>
                                <div className="relative">
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={newDueDate}
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                        className="border-slate-200 pl-9"
                                    />
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddOpen(false)}
                                disabled={isSubmitting}
                                className="border-slate-200"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !newName}
                                className="bg-[#9EAE8E] hover:bg-[#8E9E7E] text-white"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
