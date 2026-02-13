'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTimeStore } from '@/stores/time-store'
import { useTaskStore } from '@/stores/task-store'
import { Loader2, Clock, Calendar } from 'lucide-react'

interface LogTimeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    taskId?: string
}

export function LogTimeDialog({
    open,
    onOpenChange,
    projectId,
    taskId: initialTaskId
}: LogTimeDialogProps) {
    const { addTimeEntry } = useTimeStore()
    const { tasks } = useTaskStore()
    const [duration, setDuration] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [isBillable, setIsBillable] = useState(true)
    const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId || 'none')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const projectTasks = tasks.filter(t => t.projectId === projectId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!duration || isSubmitting) return

        setIsSubmitting(true)
        try {
            // Parser for duration (supports "1.5" or "1:30")
            let durationMinutes = 0
            if (duration.includes(':')) {
                const [h, m] = duration.split(':').map(Number)
                durationMinutes = (h * 60) + (m || 0)
            } else {
                durationMinutes = Math.round(parseFloat(duration) * 60)
            }

            if (isNaN(durationMinutes) || durationMinutes <= 0) {
                throw new Error('Invalid duration')
            }

            await addTimeEntry({
                project_id: projectId,
                task_id: selectedTaskId === 'none' ? null : selectedTaskId,
                duration_minutes: durationMinutes,
                description,
                date,
                is_billable: isBillable
            })

            onOpenChange(false)
            setDuration('')
            setDescription('')
            setDate(new Date().toISOString().split('T')[0])
            setIsBillable(true)
            setSelectedTaskId('none')
        } catch (error) {
            console.error('Error logging time:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-[#3D4A67] flex items-center gap-2">
                            <Clock className="h-5 w-5 text-[#9EAE8E]" />
                            Log Time
                        </DialogTitle>
                        <DialogDescription>
                            Record hours spent on this project.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="duration">Duration (hrs)</Label>
                                <Input
                                    id="duration"
                                    placeholder="e.g. 1.5 or 1:30"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    required
                                    className="border-slate-200"
                                />
                                <p className="text-[10px] text-slate-400">Use decimal (1.5) or h:m (1:30)</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="date">Date</Label>
                                <div className="relative">
                                    <Input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                        className="border-slate-200 pl-9"
                                    />
                                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="task">Link to Task (Optional)</Label>
                            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                                <SelectTrigger className="border-slate-200">
                                    <SelectValue placeholder="Select a task..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">General Project Time</SelectItem>
                                    {projectTasks.map(task => (
                                        <SelectItem key={task.id} value={task.id}>
                                            {task.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">What did you work on?</Label>
                            <Textarea
                                id="description"
                                placeholder="Details of the work performed..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="border-slate-200 min-h-[100px]"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="space-y-0.5">
                                <Label htmlFor="billable" className="text-sm font-semibold">Billable</Label>
                                <p className="text-xs text-slate-400 font-normal">This time will be included in next invoice.</p>
                            </div>
                            <Switch
                                id="billable"
                                checked={isBillable}
                                onCheckedChange={setIsBillable}
                                className="data-[state=checked]:bg-[#9EAE8E]"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="border-slate-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !duration}
                            className="bg-[#9EAE8E] hover:bg-[#8E9E7E] text-white"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging...</>
                            ) : (
                                'Log Time'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
