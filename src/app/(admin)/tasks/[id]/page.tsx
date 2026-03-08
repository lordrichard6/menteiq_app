'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTaskStore } from '@/stores/task-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    TASK_STATUS_LABELS,
    TASK_PRIORITY_LABELS,
    TASK_PRIORITY_COLORS,
    TaskStatus,
    TaskPriority,
} from '@/types/task'
import {
    ChevronRight,
    Loader2,
    Trash2,
    AlertCircle,
    Plus,
    X,
    CheckSquare2,
    Info,
    Pencil,
    Check,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Inline editable field ────────────────────────────────────────────────────

function InlineEditText({
    value,
    onSave,
    className = '',
    placeholder = '',
    multiline = false,
    'aria-label': ariaLabel,
}: {
    value: string
    onSave: (val: string) => Promise<void>
    className?: string
    placeholder?: string
    multiline?: boolean
    'aria-label'?: string
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (draft.trim() === value) { setEditing(false); return }
        setSaving(true)
        await onSave(draft.trim())
        setSaving(false)
        setEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); handleSave() }
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
    }

    if (!editing) {
        return (
            <button
                className={`group flex items-start gap-1 text-left w-full hover:bg-slate-50 rounded-md px-1 py-0.5 transition-colors ${className}`}
                onClick={() => { setDraft(value); setEditing(true) }}
                aria-label={ariaLabel ?? `Edit field`}
            >
                <span className="flex-1">{value || <span className="text-slate-400 italic">{placeholder}</span>}</span>
                <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 mt-0.5" aria-hidden />
            </button>
        )
    }

    return (
        <div className="space-y-1">
            {multiline ? (
                <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={3}
                    autoFocus
                    className="text-sm"
                    aria-label={ariaLabel}
                />
            ) : (
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus
                    aria-label={ariaLabel}
                />
            )}
            <div className="flex gap-2">
                <Button size="sm" className="h-7 bg-[#3D4A67]" onClick={handleSave} disabled={saving || !draft.trim()}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => { setDraft(value); setEditing(false) }}>
                    Cancel
                </Button>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
    const params  = useParams()
    const router  = useRouter()
    const taskId  = params.id as string

    const {
        tasks,
        fetchTaskById,
        updateTask,
        deleteTask,
        addSubtask,
        toggleSubtask,
        removeSubtask,
        isLoading,
        error,
    } = useTaskStore()

    const [showDelete, setShowDelete] = useState(false)
    const [deleting, setDeleting]     = useState(false)
    const [newSubtask, setNewSubtask] = useState('')
    const subtaskRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchTaskById(taskId)
    }, [taskId, fetchTaskById])

    const task = tasks.find(t => t.id === taskId)

    // ── Loading / error states ────────────────────────────────────────────────

    if (isLoading && !task) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                <span className="ml-2 text-slate-500">Loading task…</span>
            </div>
        )
    }

    if (error && !task) {
        const isNotFound = error === 'TASK_NOT_FOUND'
        return (
            <div className="text-center py-24">
                <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
                <p className="text-red-500 mt-4 font-medium">
                    {isNotFound ? 'Task not found' : 'Error loading task'}
                </p>
                {!isNotFound && <p className="text-sm text-slate-500 mt-1">{error}</p>}
                <div className="flex gap-3 justify-center mt-4">
                    {!isNotFound && (
                        <Button variant="outline" onClick={() => fetchTaskById(taskId)}>Retry</Button>
                    )}
                    <Button variant="outline" onClick={() => router.push('/tasks')}>Back to Tasks</Button>
                </div>
            </div>
        )
    }

    if (!task) {
        return (
            <div className="text-center py-24">
                <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
                <p className="text-slate-500 mt-4">Task not found.</p>
                <Button variant="outline" onClick={() => router.push('/tasks')} className="mt-4">Back to Tasks</Button>
            </div>
        )
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        setDeleting(true)
        const ok = await deleteTask(task.id)
        setDeleting(false)
        if (ok) {
            toast.success('Task deleted')
            router.push('/tasks')
        } else {
            toast.error(useTaskStore.getState().error ?? 'Failed to delete task')
        }
    }

    const handleAddSubtask = () => {
        const title = newSubtask.trim()
        if (!title) return
        addSubtask(task.id, title)
        setNewSubtask('')
        subtaskRef.current?.focus()
    }

    const completedSubtasks = task.subtasks.filter(s => s.completed).length

    // ── JSX ───────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
                <Link href="/tasks" className="hover:text-slate-700 transition-colors">Tasks</Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                <span className="text-slate-800 font-medium truncate max-w-xs">{task.title}</span>
            </nav>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
                            {TASK_PRIORITY_LABELS[task.priority]}
                        </Badge>
                        <Badge className={
                            task.status === 'done' ? 'bg-green-100 text-green-700' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                        }>
                            {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                        {task.isOverdue && (
                            <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />Overdue
                            </Badge>
                        )}
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                    onClick={() => setShowDelete(true)}
                    aria-label="Delete task"
                >
                    <Trash2 className="h-4 w-4 mr-1" />Delete
                </Button>
            </div>

            {/* Title */}
            <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wide">Title</Label>
                <InlineEditText
                    value={task.title}
                    onSave={async (val) => {
                        await updateTask(task.id, { title: val })
                        if (useTaskStore.getState().error) toast.error('Failed to update title')
                        else toast.success('Title updated')
                    }}
                    className="text-2xl font-bold text-[#3D4A67]"
                    placeholder="Task title"
                    aria-label="Edit task title"
                />
            </div>

            {/* Main editing grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Left: description + subtasks */}
                <div className="space-y-6">
                    {/* Description */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <InlineEditText
                                value={task.description ?? ''}
                                onSave={async (val) => {
                                    await updateTask(task.id, { description: val || undefined })
                                    if (useTaskStore.getState().error) toast.error('Failed to update description')
                                    else toast.success('Description updated')
                                }}
                                multiline
                                placeholder="Add a description…"
                                className="text-sm text-slate-700"
                                aria-label="Edit description"
                            />
                        </CardContent>
                    </Card>

                    {/* Subtasks */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <CheckSquare2 className="h-4 w-4" />
                                    Subtasks
                                    {task.subtasks.length > 0 && (
                                        <span className="text-slate-400 font-normal normal-case">
                                            {completedSubtasks}/{task.subtasks.length}
                                        </span>
                                    )}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Progress bar */}
                            {task.subtasks.length > 0 && (
                                <div
                                    className="h-1.5 bg-slate-100 rounded-full overflow-hidden"
                                    role="progressbar"
                                    aria-valuenow={completedSubtasks}
                                    aria-valuemax={task.subtasks.length}
                                    aria-label="Subtask progress"
                                >
                                    <div
                                        className="h-full bg-[#9EAE8E] rounded-full transition-all"
                                        style={{ width: `${(completedSubtasks / task.subtasks.length) * 100}%` }}
                                    />
                                </div>
                            )}

                            {/* Subtask list */}
                            {task.subtasks.length === 0 && (
                                <p className="text-sm text-slate-400 italic">No subtasks yet</p>
                            )}
                            {task.subtasks.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 group">
                                    <Checkbox
                                        id={`sub-${s.id}`}
                                        checked={s.completed}
                                        onCheckedChange={() => toggleSubtask(task.id, s.id)}
                                        aria-label={`Subtask: ${s.title}`}
                                    />
                                    <label
                                        htmlFor={`sub-${s.id}`}
                                        className={`flex-1 text-sm cursor-pointer ${s.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}
                                    >
                                        {s.title}
                                    </label>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeSubtask(task.id, s.id)}
                                        aria-label={`Remove subtask: ${s.title}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}

                            {/* Add subtask input */}
                            <div className="flex gap-2 mt-2">
                                <Input
                                    ref={subtaskRef}
                                    placeholder="Add subtask…"
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() } }}
                                    className="h-8 text-sm"
                                    aria-label="New subtask title"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 shrink-0"
                                    onClick={handleAddSubtask}
                                    disabled={!newSubtask.trim()}
                                    aria-label="Add subtask"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            <p className="flex items-center gap-1 text-xs text-amber-600">
                                <Info className="h-3 w-3" />
                                Subtasks are session-only (requires DB migration to persist)
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: metadata fields */}
                <Card className="border-slate-200 h-fit">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Status */}
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Status</Label>
                            <Select
                                value={task.status}
                                onValueChange={async (v) => {
                                    const store = useTaskStore.getState()
                                    await store.updateStatus(task.id, v as TaskStatus)
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error(err)
                                    else toast.success('Status updated')
                                }}
                            >
                                <SelectTrigger aria-label="Task status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
                                        <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Priority</Label>
                            <Select
                                value={task.priority}
                                onValueChange={async (v) => {
                                    await updateTask(task.id, { priority: v as TaskPriority })
                                    if (useTaskStore.getState().error) toast.error('Failed to update priority')
                                    else toast.success('Priority updated')
                                }}
                            >
                                <SelectTrigger aria-label="Task priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                                        <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500" htmlFor="due-date">Due Date</Label>
                            <Input
                                id="due-date"
                                type="date"
                                defaultValue={task.dueDate?.toISOString().split('T')[0] ?? ''}
                                onBlur={async (e) => {
                                    const val = e.target.value
                                    const newDate = val ? new Date(val) : undefined
                                    const currentStr = task.dueDate?.toISOString().split('T')[0] ?? ''
                                    if (val === currentStr) return
                                    await updateTask(task.id, { dueDate: newDate })
                                    if (useTaskStore.getState().error) toast.error('Failed to update due date')
                                    else toast.success('Due date updated')
                                }}
                                aria-label="Task due date"
                            />
                        </div>

                        {/* Created / Updated */}
                        <div className="border-t pt-3 space-y-2 text-xs text-slate-500">
                            <div className="flex justify-between">
                                <span>Created</span>
                                <span>{task.createdAt.toLocaleDateString('de-CH')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Last updated</span>
                                <span>{task.updatedAt.toLocaleDateString('de-CH')}</span>
                            </div>
                            {task.projectId && (
                                <div className="flex justify-between">
                                    <span>Project</span>
                                    <Link href={`/projects/${task.projectId}`} className="text-[#3D4A67] hover:underline">
                                        View project
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete confirmation */}
            <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>&ldquo;{task.title}&rdquo;</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
