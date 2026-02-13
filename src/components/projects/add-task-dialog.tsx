'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTaskStore } from '@/stores/task-store'
import { useMilestoneStore } from '@/stores/milestone-store'
import { TaskPriority, TASK_PRIORITY_LABELS } from '@/types/task'
import { Plus, Loader2 } from 'lucide-react'

interface AddTaskDialogProps {
    projectId: string
    contactId?: string
    buttonVariant?: "default" | "outline" | "ghost"
    buttonSize?: "sm" | "default" | "lg"
    buttonClassName?: string
}

export function AddTaskDialog({
    projectId,
    contactId,
    buttonVariant = "default",
    buttonSize = "default",
    buttonClassName
}: AddTaskDialogProps) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState<TaskPriority>('medium')
    const [dueDate, setDueDate] = useState('')
    const [selectedMilestone, setSelectedMilestone] = useState<string>('none')
    const [selectedDependencies, setSelectedDependencies] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const addTask = useTaskStore((state) => state.addTask)
    const tasks = useTaskStore((state) => state.tasks)
    const milestones = useMilestoneStore((state) => state.milestones)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || isSubmitting) return

        setIsSubmitting(true)
        try {
            await addTask({
                title,
                description: description || undefined,
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                projectId,
                contactId,
                milestone_id: selectedMilestone === 'none' ? undefined : selectedMilestone,
                dependencyIds: selectedDependencies
            })
            setTitle('')
            setDescription('')
            setPriority('medium')
            setDueDate('')
            setSelectedMilestone('none')
            setSelectedDependencies([])
            setOpen(false)
        } catch (error) {
            console.error('Failed to add task:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={buttonVariant} size={buttonSize} className={buttonClassName}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-[#3D4A67]">Add New Task</DialogTitle>
                        <DialogDescription>
                            Create a task linked to this project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Task title..."
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe the task..."
                                disabled={isSubmitting}
                                className="resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={priority}
                                    onValueChange={(v) => setPriority(v as TaskPriority)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger id="priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {/* Milestones */}
                        <div className="grid gap-2">
                            <Label htmlFor="milestone">Project Milestone</Label>
                            <Select
                                value={selectedMilestone}
                                onValueChange={setSelectedMilestone}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger id="milestone">
                                    <SelectValue placeholder="Select milestone..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Milestone</SelectItem>
                                    {milestones.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dependencies */}
                        {tasks.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="dependencies">Depends On (Prerequisites)</Label>
                                <Select
                                    value={selectedDependencies[0] || "none"}
                                    onValueChange={(v) => {
                                        if (v === "none") setSelectedDependencies([])
                                        else setSelectedDependencies([v])
                                    }}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger id="dependencies">
                                        <SelectValue placeholder="Select prerequisite task..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Prerequisite</SelectItem>
                                        {tasks.filter(t => t.status !== 'done').map(t => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-slate-500">
                                    This task will be locked until the selected prerequisite is completed.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Task'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
