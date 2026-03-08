'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTaskStore } from '@/stores/task-store'
import { createClient } from '@/lib/supabase/client'
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
    Task,
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
    CheckCheck,
    Link2,
    Calendar,
    AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeDueDate(dueDate: Date): { text: string; className: string } {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due   = new Date(dueDate); due.setHours(0, 0, 0, 0)
    const diff  = Math.round((due.getTime() - today.getTime()) / 86400000)
    if (diff === 0)  return { text: 'Today',                      className: 'text-amber-600' }
    if (diff === 1)  return { text: 'Tomorrow',                   className: 'text-slate-500' }
    if (diff === -1) return { text: 'Yesterday — overdue',        className: 'text-red-600'   }
    if (diff > 0)    return { text: `In ${diff} days`,            className: 'text-slate-500' }
    return                  { text: `${Math.abs(diff)} days overdue`, className: 'text-red-600' }
}

function toDateStr(d: Date): string {
    return d.toISOString().split('T')[0]
}

function addDays(n: number): Date {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d
}

// ─── Inline editable field ────────────────────────────────────────────────────

function InlineEditText({
    value,
    onSave,
    className = '',
    placeholder = '',
    multiline = false,
    disabled = false,
    'aria-label': ariaLabel,
}: {
    value: string
    onSave: (val: string) => Promise<void>
    className?: string
    placeholder?: string
    multiline?: boolean
    disabled?: boolean
    'aria-label'?: string
}) {
    const [editing, setEditing] = useState(false)
    const [draft,   setDraft]   = useState(value)
    const [saving,  setSaving]  = useState(false)

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
                className={`group flex items-start gap-1 text-left w-full hover:bg-slate-50 rounded-md px-1 py-0.5 transition-colors break-words min-w-0 ${className}`}
                onClick={() => { if (!disabled) { setDraft(value); setEditing(true) } }}
                aria-label={ariaLabel ?? 'Edit field'}
                disabled={disabled}
            >
                <span className={`flex-1 break-words min-w-0 ${!value ? 'text-slate-400 italic font-normal text-base' : ''}`}>
                    {value || placeholder}
                </span>
                {!disabled && (
                    <Pencil className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 mt-1" aria-hidden />
                )}
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
                    rows={4}
                    autoFocus
                    className="text-sm max-h-48 overflow-y-auto"
                    aria-label={ariaLabel}
                    disabled={saving}
                />
            ) : (
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus
                    aria-label={ariaLabel}
                    disabled={saving}
                />
            )}
            <div className="flex gap-2">
                <Button
                    size="sm"
                    className="h-7 bg-[#3D4A67]"
                    onClick={handleSave}
                    disabled={saving || !draft.trim()}
                >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => { setDraft(value); setEditing(false) }}
                    disabled={saving}
                >
                    Cancel
                </Button>
            </div>
        </div>
    )
}

// ─── Inline relational edit (select + cancel) ─────────────────────────────────

interface Option { id: string; name: string }

function RelationalField({
    label,
    currentId,
    currentName,
    href,
    options,
    saving,
    onEdit,
    onChange,
    onClear,
    noProjectMsg,
}: {
    label: string
    currentId?: string
    currentName?: string
    href?: string
    options: Option[]
    saving: boolean
    onEdit: () => void
    onChange: (id: string) => void
    onClear: () => void
    noProjectMsg?: string
}) {
    const [editing, setEditing] = useState(false)

    const handleEdit = async () => {
        await onEdit()
        setEditing(true)
    }

    return (
        <div className="space-y-1">
            <Label className="text-xs text-slate-500">{label}</Label>
            {!editing ? (
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 text-sm truncate">
                        {currentId && href ? (
                            <Link href={href} className="text-[#3D4A67] hover:underline">{currentName ?? currentId}</Link>
                        ) : currentId ? (
                            <span className="text-slate-700">{currentName ?? currentId}</span>
                        ) : (
                            <span className="text-slate-400 italic">None</span>
                        )}
                    </div>
                    {!noProjectMsg && (
                        <Button size="sm" variant="ghost" className="h-6 shrink-0" onClick={handleEdit} aria-label={`Edit ${label}`}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex gap-2">
                    <Select
                        value={currentId ?? 'none'}
                        disabled={saving}
                        onValueChange={(v) => {
                            if (v === 'none') { onClear(); setEditing(false) }
                            else { onChange(v); setEditing(false) }
                        }}
                    >
                        <SelectTrigger className="flex-1 text-sm h-9">
                            {saving ? (
                                <span className="flex items-center gap-2 text-slate-500">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…
                                </span>
                            ) : (
                                <SelectValue placeholder={`Select ${label.toLowerCase()}…`} />
                            )}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {options.map(o => (
                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-9 shrink-0" onClick={() => setEditing(false)} aria-label="Cancel">
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
            {noProjectMsg && <p className="text-xs text-slate-400">{noProjectMsg}</p>}
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
        fetchTasks,
        updateTask,
        updateStatus,
        clearTaskField,
        deleteTask,
        addSubtask,
        toggleSubtask,
        removeSubtask,
        isLoading,
        error,
    } = useTaskStore()

    // ── UI state ──────────────────────────────────────────────────────────────

    const [showDelete,      setShowDelete]      = useState(false)
    const [deleting,        setDeleting]        = useState(false)
    const [newSubtask,      setNewSubtask]      = useState('')
    const subtaskRef = useRef<HTMLInputElement>(null)

    // Controlled due date (fixes #1 — defaultValue → value)
    const [dueDate, setDueDate] = useState<string>('')

    // Per-field save loading (fixes #12)
    const [savingStatus,    setSavingStatus]    = useState(false)
    const [savingPriority,  setSavingPriority]  = useState(false)
    const [savingDueDate,   setSavingDueDate]   = useState(false)
    const [savingContact,   setSavingContact]   = useState(false)
    const [savingProject,   setSavingProject]   = useState(false)
    const [savingMilestone, setSavingMilestone] = useState(false)
    const [savingDeps,      setSavingDeps]      = useState(false)

    // Lazy-loaded relational option lists
    const [contactOptions,   setContactOptions]   = useState<Option[]>([])
    const [projectOptions,   setProjectOptions]   = useState<Option[]>([])
    const [milestoneOptions, setMilestoneOptions] = useState<Option[]>([])

    // ── Initial data fetch ────────────────────────────────────────────────────

    useEffect(() => {
        fetchTaskById(taskId)
        fetchTasks() // load all tasks for dependency management + blockers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId])

    const task = tasks.find(t => t.id === taskId)

    // Sync controlled due date when task loads/changes (fixes #1)
    useEffect(() => {
        if (task) setDueDate(task.dueDate ? toDateStr(task.dueDate) : '')
    }, [task?.dueDate]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Keyboard shortcuts (fixes #11) ────────────────────────────────────────

    const handleMarkDone = useCallback(async () => {
        if (!task || task.status === 'done') return
        setSavingStatus(true)
        await updateStatus(task.id, 'done')
        setSavingStatus(false)
        const err = useTaskStore.getState().error
        if (err) toast.error(err)
        else toast.success('Task marked as done!')
    }, [task, updateStatus])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
            if (e.key === 'Escape') router.back()
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault()
                handleMarkDone()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [router, handleMarkDone])

    // ── Lazy loaders for relational option lists ───────────────────────────────

    const loadContacts = async () => {
        if (contactOptions.length > 0) return
        const supabase = createClient()
        const { data } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, company_name, is_company')
            .order('first_name')
        if (data) {
            setContactOptions(data.map(c => ({
                id: c.id,
                name: c.is_company
                    ? (c.company_name || `${c.first_name} ${c.last_name}`.trim())
                    : `${c.first_name} ${c.last_name}`.trim(),
            })))
        }
    }

    const loadProjects = async () => {
        if (projectOptions.length > 0) return
        const supabase = createClient()
        const { data } = await supabase.from('projects').select('id, name').order('name')
        if (data) setProjectOptions(data.map(p => ({ id: p.id, name: p.name })))
    }

    const loadMilestones = async (projectId: string) => {
        const supabase = createClient()
        const { data } = await supabase
            .from('project_milestones')
            .select('id, name')
            .eq('project_id', projectId)
            .order('order_index')
        setMilestoneOptions(data ? data.map(m => ({ id: m.id, name: m.name })) : [])
    }

    // ── Copy link (fixes #9 / #17) ────────────────────────────────────────────

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success('Task link copied!')
    }

    // ── Loading / error / not-found states ────────────────────────────────────

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

    // ── Derived state ─────────────────────────────────────────────────────────

    const completedSubtasks = task.subtasks.filter(s => s.completed).length

    // Dependency blocking detection (fixes #10)
    const blockers = (task.dependencies ?? [])
        .map(depId => tasks.find(t => t.id === depId))
        .filter((t): t is Task => !!t && t.status !== 'done')

    // Dependency tasks for display (fixes #4)
    const depTasks = (task.dependencies ?? []).map(depId => ({
        id: depId,
        task: tasks.find(t => t.id === depId),
    }))

    // Available tasks for dependency editing
    const availableTasks = tasks.filter(t => t.id !== task.id)

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

    const saveDueDate = async (val: string) => {
        setSavingDueDate(true)
        if (!val) {
            await clearTaskField(task.id, 'due_date')
        } else {
            await updateTask(task.id, { dueDate: new Date(val) })
        }
        setSavingDueDate(false)
        const err = useTaskStore.getState().error
        if (err) toast.error('Failed to update due date')
        else toast.success('Due date updated')
    }

    // ── JSX ───────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-3xl mx-auto space-y-6">

            {/* ── Breadcrumb (fixes #13 — aria-current) ── */}
            <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
                <Link href="/tasks" className="hover:text-slate-700 transition-colors">Tasks</Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                <span className="text-slate-800 font-medium truncate max-w-xs" aria-current="page">
                    {task.title}
                </span>
            </nav>

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge className={
                        task.status === 'done'        ? 'bg-green-100 text-green-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700'  :
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

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Mark as Done quick button (fixes #8) */}
                    {task.status !== 'done' && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleMarkDone}
                            disabled={savingStatus || blockers.length > 0}
                            title={blockers.length > 0
                                ? `Blocked by: ${blockers.map(b => b.title).join(', ')}`
                                : 'Mark as done (⌘D)'}
                            aria-label="Mark task as done"
                        >
                            {savingStatus
                                ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                : <CheckCheck className="h-4 w-4 mr-1" />
                            }
                            Mark Done
                        </Button>
                    )}
                    {/* Copy task link (fixes #9 / #17) */}
                    <Button size="sm" variant="outline" onClick={copyLink} aria-label="Copy task link" title="Copy link to clipboard">
                        <Link2 className="h-4 w-4 mr-1" />Copy Link
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setShowDelete(true)}
                        aria-label="Delete task"
                    >
                        <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                </div>
            </div>

            {/* ── Blocker warning (fixes #10) ── */}
            {blockers.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-medium">
                            Blocked by {blockers.length} task{blockers.length !== 1 ? 's' : ''}:{' '}
                        </span>
                        {blockers.map(b => b.title).join(', ')}
                    </div>
                </div>
            )}

            {/* ── Title (fixes #7 disable-during-save, #14 break-words) ── */}
            <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wide">Title</Label>
                <InlineEditText
                    value={task.title}
                    onSave={async (val) => {
                        await updateTask(task.id, { title: val })
                        const err = useTaskStore.getState().error
                        if (err) toast.error('Failed to update title')
                        else toast.success('Title updated')
                    }}
                    className="text-2xl font-bold text-[#3D4A67]"
                    placeholder="Task title"
                    aria-label="Edit task title"
                />
            </div>

            {/* ── Main 2-col grid ── */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* ── Left: Description + Dependencies + Subtasks ── */}
                <div className="space-y-6">

                    {/* Description (fixes #14 — max-h + scroll for long content) */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-64 overflow-y-auto">
                                <InlineEditText
                                    value={task.description ?? ''}
                                    onSave={async (val) => {
                                        await updateTask(task.id, { description: val || undefined })
                                        const err = useTaskStore.getState().error
                                        if (err) toast.error('Failed to update description')
                                        else toast.success('Description updated')
                                    }}
                                    multiline
                                    placeholder="Add a description…"
                                    className="text-sm text-slate-700"
                                    aria-label="Edit description"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dependencies (fixes #4 — display + #4 edit) */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                    Dependencies
                                </CardTitle>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs"
                                    onClick={() => useTaskStore.setState((s) => ({ ...s }))} // triggers re-render
                                    aria-label="Toggle dependency editor"
                                    id="dep-toggle"
                                >
                                    {/* The editing state is handled inside the section below */}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <DependencySection
                                task={task}
                                depTasks={depTasks}
                                availableTasks={availableTasks}
                                savingDeps={savingDeps}
                                onToggle={async (depId, checked) => {
                                    const current = task.dependencies ?? []
                                    const newDeps = checked
                                        ? [...current, depId]
                                        : current.filter(id => id !== depId)
                                    setSavingDeps(true)
                                    await updateTask(task.id, { dependencies: newDeps })
                                    setSavingDeps(false)
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error('Failed to update dependencies')
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* Subtasks */}
                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <CheckSquare2 className="h-4 w-4" />
                                Subtasks
                                {task.subtasks.length > 0 && (
                                    <span className="text-slate-400 font-normal normal-case">
                                        {completedSubtasks}/{task.subtasks.length}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
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

                {/* ── Right: Details card ── */}
                <div className="space-y-4">
                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {/* Status (fixes #6 hook error, #10 blocker warning, #12 loading) */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Status</Label>
                                {blockers.length > 0 && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Blocked — complete prerequisites first
                                    </p>
                                )}
                                <Select
                                    value={task.status}
                                    disabled={savingStatus}
                                    onValueChange={async (v) => {
                                        setSavingStatus(true)
                                        await updateStatus(task.id, v as TaskStatus)
                                        setSavingStatus(false)
                                        const err = useTaskStore.getState().error
                                        if (err) toast.error(err)
                                        else toast.success('Status updated')
                                    }}
                                >
                                    <SelectTrigger aria-label="Task status">
                                        {savingStatus
                                            ? <span className="flex items-center gap-2 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span>
                                            : <SelectValue />
                                        }
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
                                            <SelectItem key={v} value={v}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Priority (fixes #12 loading) */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Priority</Label>
                                <Select
                                    value={task.priority}
                                    disabled={savingPriority}
                                    onValueChange={async (v) => {
                                        setSavingPriority(true)
                                        await updateTask(task.id, { priority: v as TaskPriority })
                                        setSavingPriority(false)
                                        const err = useTaskStore.getState().error
                                        if (err) toast.error('Failed to update priority')
                                        else toast.success('Priority updated')
                                    }}
                                >
                                    <SelectTrigger aria-label="Task priority">
                                        {savingPriority
                                            ? <span className="flex items-center gap-2 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span>
                                            : <SelectValue />
                                        }
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                                            <SelectItem key={v} value={v}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Due Date (fixes #1 controlled, #12 loading, #15 relative, #16 quick picks) */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500" htmlFor="due-date">Due Date</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="due-date"
                                        type="date"
                                        value={dueDate}
                                        disabled={savingDueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        onBlur={async (e) => {
                                            const val = e.target.value
                                            const current = task.dueDate ? toDateStr(task.dueDate) : ''
                                            if (val === current) return
                                            await saveDueDate(val)
                                        }}
                                        aria-label="Task due date"
                                        className="flex-1"
                                    />
                                    {savingDueDate && <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />}
                                </div>

                                {/* Relative text (fixes #15) */}
                                {task.dueDate && (() => {
                                    const rel = relativeDueDate(task.dueDate)
                                    return <p className={`text-xs ${rel.className}`}>{rel.text}</p>
                                })()}

                                {/* Quick-pick buttons (fixes #16) */}
                                <div className="flex gap-1 flex-wrap">
                                    {([
                                        { label: 'Today',     offset: 0 },
                                        { label: 'Tomorrow',  offset: 1 },
                                        { label: 'Next Week', offset: 7 },
                                    ] as const).map(({ label, offset }) => {
                                        const d   = addDays(offset)
                                        const str = toDateStr(d)
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
                                                disabled={savingDueDate || dueDate === str}
                                                onClick={async () => {
                                                    setDueDate(str)
                                                    await saveDueDate(str)
                                                }}
                                            >
                                                <Calendar className="h-2.5 w-2.5 inline mr-0.5" />
                                                {label}
                                            </button>
                                        )
                                    })}
                                    {dueDate && (
                                        <button
                                            type="button"
                                            className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                                            disabled={savingDueDate}
                                            onClick={async () => {
                                                setDueDate('')
                                                await saveDueDate('')
                                            }}
                                        >
                                            <X className="h-2.5 w-2.5 inline mr-0.5" />Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Contact (fixes #2 — display + editable) */}
                            <RelationalField
                                label="Contact"
                                currentId={task.contactId}
                                currentName={task.contactName}
                                href={task.contactId ? `/contacts/${task.contactId}` : undefined}
                                options={contactOptions}
                                saving={savingContact}
                                onEdit={loadContacts}
                                onChange={async (id) => {
                                    setSavingContact(true)
                                    await updateTask(task.id, { contactId: id })
                                    setSavingContact(false)
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error('Failed to update contact')
                                    else toast.success('Contact updated')
                                }}
                                onClear={async () => {
                                    setSavingContact(true)
                                    await clearTaskField(task.id, 'contact_id')
                                    setSavingContact(false)
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error('Failed to clear contact')
                                    else toast.success('Contact removed')
                                }}
                            />

                            {/* Project (fixes #5 — editable, not just link) */}
                            <RelationalField
                                label="Project"
                                currentId={task.projectId}
                                currentName={task.projectName}
                                href={task.projectId ? `/projects/${task.projectId}` : undefined}
                                options={projectOptions}
                                saving={savingProject}
                                onEdit={loadProjects}
                                onChange={async (id) => {
                                    setSavingProject(true)
                                    await updateTask(task.id, { projectId: id })
                                    setSavingProject(false)
                                    setMilestoneOptions([]) // reset milestones for new project
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error('Failed to update project')
                                    else toast.success('Project updated')
                                }}
                                onClear={async () => {
                                    setSavingProject(true)
                                    await clearTaskField(task.id, 'project_id')
                                    setSavingProject(false)
                                    setMilestoneOptions([])
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error('Failed to clear project')
                                    else toast.success('Project removed')
                                }}
                            />

                            {/* Milestone (fixes #3 — display + editable) */}
                            <RelationalField
                                label="Milestone"
                                currentId={task.milestone_id}
                                currentName={task.milestoneName}
                                options={milestoneOptions}
                                saving={savingMilestone}
                                onEdit={async () => {
                                    if (task.projectId) await loadMilestones(task.projectId)
                                }}
                                onChange={async (id) => {
                                    setSavingMilestone(true)
                                    await updateTask(task.id, { milestone_id: id })
                                    setSavingMilestone(false)
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error('Failed to update milestone')
                                    else toast.success('Milestone updated')
                                }}
                                onClear={async () => {
                                    setSavingMilestone(true)
                                    await clearTaskField(task.id, 'milestone_id')
                                    setSavingMilestone(false)
                                    const err = useTaskStore.getState().error
                                    if (err) toast.error('Failed to clear milestone')
                                    else toast.success('Milestone removed')
                                }}
                                noProjectMsg={!task.projectId ? 'Assign to a project first to link a milestone' : undefined}
                            />

                            {/* Timestamps */}
                            <div className="border-t pt-3 space-y-2 text-xs text-slate-500">
                                <div className="flex justify-between">
                                    <span>Created</span>
                                    <span>{task.createdAt.toLocaleDateString('de-CH')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Last updated</span>
                                    <span>{task.updatedAt.toLocaleDateString('de-CH')}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Keyboard shortcuts hint (fixes #11) */}
                    <p className="text-[10px] text-slate-400 text-center select-none">
                        <kbd className="px-1 rounded border border-slate-200 bg-slate-50 font-sans">Esc</kbd>
                        {' '}back ·{' '}
                        <kbd className="px-1 rounded border border-slate-200 bg-slate-50 font-sans">⌘D</kbd>
                        {' '}mark done
                    </p>
                </div>
            </div>

            {/* ── Delete confirmation ── */}
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

// ─── DependencySection — extracted to manage its own editing toggle ────────────

function DependencySection({
    task,
    depTasks,
    availableTasks,
    savingDeps,
    onToggle,
}: {
    task: Task
    depTasks: { id: string; task: Task | undefined }[]
    availableTasks: Task[]
    savingDeps: boolean
    onToggle: (depId: string, checked: boolean) => Promise<void>
}) {
    const [editing, setEditing] = useState(false)

    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">
                    {depTasks.length === 0 ? 'No dependencies' : `${depTasks.length} prerequisite${depTasks.length !== 1 ? 's' : ''}`}
                </span>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => setEditing(!editing)}
                    aria-label={editing ? 'Close dependency editor' : 'Edit dependencies'}
                >
                    {editing ? 'Done' : <><Pencil className="h-3 w-3 mr-1" />Edit</>}
                </Button>
            </div>

            {!editing ? (
                depTasks.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">None — no blockers</p>
                ) : (
                    <ul className="space-y-1.5">
                        {depTasks.map(({ id, task: depTask }) => (
                            <li key={id} className="flex items-center gap-2 text-sm">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${depTask?.status === 'done' ? 'bg-green-500' : 'bg-amber-400'}`} />
                                {depTask ? (
                                    <Link href={`/tasks/${id}`} className="text-[#3D4A67] hover:underline truncate flex-1">
                                        {depTask.title}
                                    </Link>
                                ) : (
                                    <span className="text-slate-400 font-mono text-xs flex-1 truncate">{id}</span>
                                )}
                                {depTask && (
                                    <Badge className={`text-[10px] shrink-0 ${depTask.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {TASK_STATUS_LABELS[depTask.status]}
                                    </Badge>
                                )}
                            </li>
                        ))}
                    </ul>
                )
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-slate-500">Check tasks this task should wait for:</p>
                    <div className="border border-slate-200 rounded-md p-2 max-h-40 overflow-y-auto space-y-1 bg-slate-50">
                        {availableTasks.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No other tasks</p>
                        )}
                        {availableTasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`dep-${t.id}`}
                                    checked={(task.dependencies ?? []).includes(t.id)}
                                    disabled={savingDeps}
                                    onCheckedChange={async (checked) => {
                                        await onToggle(t.id, !!checked)
                                    }}
                                />
                                <label
                                    htmlFor={`dep-${t.id}`}
                                    className="text-xs cursor-pointer text-slate-700 line-clamp-1 flex-1"
                                >
                                    {t.title}
                                    {t.status === 'done' && <span className="ml-1 text-slate-400">(done)</span>}
                                </label>
                            </div>
                        ))}
                    </div>
                    {savingDeps && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />Saving…
                        </p>
                    )}
                </div>
            )}
        </>
    )
}
