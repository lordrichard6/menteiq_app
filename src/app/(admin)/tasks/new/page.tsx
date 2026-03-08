'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTaskStore } from '@/stores/task-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TaskStatus, TaskPriority } from '@/types/task'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// ─── Inner form — reads searchParams so must be wrapped in Suspense ───────────

function NewTaskForm() {
    const router       = useRouter()
    const searchParams = useSearchParams()

    // Pre-fill from query params (e.g. /tasks/new?contact=xxx&project=yyy)
    const defaultContactId = searchParams.get('contact') ?? undefined
    const defaultProjectId = searchParams.get('project') ?? undefined

    const { addTask } = useTaskStore()

    const [title, setTitle]           = useState('')
    const [description, setDesc]      = useState('')
    const [priority, setPriority]     = useState<TaskPriority>('medium')
    const [status, setStatus]         = useState<TaskStatus>('todo')
    const [dueDate, setDueDate]       = useState('')
    const [isSubmitting, setSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || isSubmitting) return
        setSubmitting(true)

        const task = await addTask({
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            status,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            contactId: defaultContactId,
            projectId: defaultProjectId,
        })

        setSubmitting(false)

        if (task) {
            toast.success('Task created')
            router.push(`/tasks/${task.id}`)
        } else {
            toast.error(useTaskStore.getState().error ?? 'Failed to create task')
        }
    }

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
                <Link href="/tasks" className="hover:text-slate-700 transition-colors">Tasks</Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                <span className="text-slate-800 font-medium">New Task</span>
            </nav>

            <h1 className="text-2xl font-bold text-[#3D4A67]">New Task</h1>

            <Card className="border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                        Task Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="Describe the task…"
                                rows={3}
                            />
                        </div>

                        {/* Priority + Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                                    <SelectTrigger id="priority" aria-label="Priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                                            <SelectItem key={v} value={v}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="status">Initial Status</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                                    <SelectTrigger id="status" aria-label="Initial status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
                                            <SelectItem key={v} value={v}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>

                        {/* Context indicators */}
                        {(defaultContactId || defaultProjectId) && (
                            <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 border">
                                {defaultContactId && <p>Linked to contact: <span className="font-mono">{defaultContactId}</span></p>}
                                {defaultProjectId && <p>Linked to project: <span className="font-mono">{defaultProjectId}</span></p>}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-[#E9B949] hover:bg-[#C99929] text-[#1a1a1a]"
                                disabled={isSubmitting || !title.trim()}
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Create Task
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Page wrapper — Suspense required for useSearchParams ─────────────────────

export default function NewTaskPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
            </div>
        }>
            <NewTaskForm />
        </Suspense>
    )
}
