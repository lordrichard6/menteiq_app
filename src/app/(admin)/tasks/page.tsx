'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTaskStore } from '@/stores/task-store'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    TASK_STATUS_LABELS,
    TASK_PRIORITY_LABELS,
    TASK_PRIORITY_COLORS,
    TaskStatus,
    TaskPriority,
    Task,
} from '@/types/task'
import {
    Plus,
    List,
    LayoutGrid,
    X,
    Loader2,
    Search,
    AlertCircle,
    ArrowUpDown,
    Download,
    Trash2,
    CheckSquare2,
    ClipboardList,
    MoreHorizontal,
    Calendar,
    Briefcase,
    ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_SORT_ORDER: Record<TaskPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
}

const COLUMN_COLORS: Record<TaskStatus, string> = {
    todo: '#3D4A67',
    in_progress: '#E9B949',
    done: '#9EAE8E',
}

const PRIORITY_BORDER_COLORS: Record<TaskPriority, string> = {
    low: 'border-l-slate-300',
    medium: 'border-l-blue-400',
    high: 'border-l-amber-400',
    urgent: 'border-l-red-500',
}

const COLUMN_BG_TINTS: Record<TaskStatus, string> = {
    todo: 'bg-[#3D4A67]/5',
    in_progress: 'bg-[#E9B949]/8',
    done: 'bg-[#9EAE8E]/8',
}

const PRIORITY_DOT_COLORS: Record<TaskPriority, string> = {
    low: 'bg-slate-400',
    medium: 'bg-blue-500',
    high: 'bg-amber-500',
    urgent: 'bg-red-500',
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatDueDate(dueDate: Date): { label: string; className: string } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        const abs = Math.abs(diffDays)
        return { label: abs === 1 ? '1 day overdue' : `${abs} days overdue`, className: 'text-red-600 font-medium' }
    }
    if (diffDays === 0) return { label: 'Due today', className: 'text-amber-600 font-medium' }
    if (diffDays === 1) return { label: 'Tomorrow', className: 'text-amber-500' }
    if (diffDays <= 7) return { label: `In ${diffDays} days`, className: 'text-slate-500' }
    return { label: due.toLocaleDateString('de-CH'), className: 'text-slate-400' }
}

function getContactInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
}

// ─── Droppable column wrapper ─────────────────────────────────────────────────

function DroppableColumn({
    status,
    children,
}: {
    status: TaskStatus
    children: React.ReactNode
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status })
    return (
        <div
            ref={setNodeRef}
            className={`min-h-[120px] space-y-2.5 rounded-lg transition-all duration-200
                ${isOver ? 'bg-[#E9B949]/10 ring-2 ring-[#E9B949]/30 ring-inset' : ''}
            `}
            role="list"
            aria-label={`${TASK_STATUS_LABELS[status]} tasks`}
        >
            {children}
        </div>
    )
}

// ─── Draggable task card (premium) ───────────────────────────────────────────

function DraggableTaskCard({
    task,
    isSelected,
    onSelect,
    onDelete,
    onNavigate,
    onStatusChange,
}: {
    task: Task
    isSelected: boolean
    onSelect: (id: string, checked: boolean) => void
    onDelete: (task: Task) => void
    onNavigate: (id: string) => void
    onStatusChange: (id: string, status: TaskStatus) => Promise<void>
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

    return (
        <Card
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            className={`
                group relative bg-white border-l-4 shadow-sm cursor-pointer
                transition-all duration-200
                hover:shadow-md hover:-translate-y-0.5
                ${PRIORITY_BORDER_COLORS[task.priority]}
                ${task.isOverdue ? 'border-t border-r border-b border-red-200 bg-red-50/20' : 'border-t border-r border-b border-slate-200/80'}
                ${isSelected ? 'ring-2 ring-[#3D4A67] ring-offset-1' : ''}
            `}
            role="listitem"
            onClick={() => onNavigate(task.id)}
        >
            <CardContent className="p-3.5">
                <div className="flex items-start gap-2.5">
                    {/* Bulk-select checkbox */}
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => onSelect(task.id, !!c)}
                        aria-label={`Select task: ${task.title}`}
                        className="mt-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Title + priority pill */}
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-slate-900 text-sm leading-snug line-clamp-2">
                                {task.title}
                            </p>
                            <span className={`
                                inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5
                                text-[10px] font-semibold uppercase tracking-wide
                                ${TASK_PRIORITY_COLORS[task.priority]}
                            `}>
                                <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT_COLORS[task.priority]}`} />
                                {TASK_PRIORITY_LABELS[task.priority]}
                            </span>
                        </div>

                        {/* Description preview */}
                        {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                {task.description}
                            </p>
                        )}

                        {/* Context row: contact, project, due date */}
                        {(task.contactName || task.projectName || task.dueDate) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                                {/* Contact initials + name */}
                                {task.contactName && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3D4A67]/10 text-[9px] font-bold text-[#3D4A67]">
                                            {getContactInitials(task.contactName)}
                                        </span>
                                        <span className="text-xs text-slate-500 truncate max-w-[100px]">
                                            {task.contactName}
                                        </span>
                                    </div>
                                )}

                                {/* Project */}
                                {task.projectName && (
                                    <div className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3 text-slate-400" />
                                        <span className="text-xs text-slate-500 truncate max-w-[100px]">
                                            {task.projectName}
                                        </span>
                                    </div>
                                )}

                                {/* Due date (relative) */}
                                {task.dueDate && (() => {
                                    const { label, className } = formatDueDate(task.dueDate)
                                    return (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            <span className={`text-xs ${className}`}>{label}</span>
                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Three-dot menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-slate-400 hover:text-slate-600"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                aria-label={`Actions for: ${task.title}`}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="cursor-pointer">
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                    Move to
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[])
                                        .filter((s) => s !== task.status)
                                        .map((s) => (
                                            <DropdownMenuItem
                                                key={s}
                                                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, s) }}
                                                className="cursor-pointer"
                                            >
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                                                    style={{ backgroundColor: COLUMN_COLORS[s] }}
                                                />
                                                {TASK_STATUS_LABELS[s]}
                                            </DropdownMenuItem>
                                        ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onDelete(task) }}
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Ghost card for DragOverlay ───────────────────────────────────────────────

function TaskGhostCard({ task }: { task: Task }) {
    return (
        <Card className={`
            bg-white shadow-2xl border-l-4 rotate-2 scale-105
            ${PRIORITY_BORDER_COLORS[task.priority]}
            ${task.isOverdue ? 'border-t border-r border-b border-red-400' : 'border-t border-r border-b border-[#3D4A67]'}
        `}>
            <CardContent className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 text-sm truncate">{task.title}</p>
                    <span className={`
                        inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5
                        text-[10px] font-semibold uppercase tracking-wide
                        ${TASK_PRIORITY_COLORS[task.priority]}
                    `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT_COLORS[task.priority]}`} />
                        {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Task actions three-dot menu (shared by list view) ───────────────────────

function TaskActionsMenu({
    task,
    onDelete,
    onStatusChange,
}: {
    task: Task
    onDelete: (task: Task) => void
    onStatusChange: (id: string, status: TaskStatus) => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                    aria-label={`Actions for: ${task.title}`}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Move to
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[])
                            .filter((s) => s !== task.status)
                            .map((s) => (
                                <DropdownMenuItem
                                    key={s}
                                    onClick={() => onStatusChange(task.id, s)}
                                    className="cursor-pointer"
                                >
                                    <div
                                        className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                                        style={{ backgroundColor: COLUMN_COLORS[s] }}
                                    />
                                    {TASK_STATUS_LABELS[s]}
                                </DropdownMenuItem>
                            ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => onDelete(task)}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
    const router = useRouter()
    const { tasks, addTask, deleteTask, updateStatus, fetchTasks, isLoading, error } = useTaskStore()

    // ── View / filter state ───────────────────────────────────────────────────
    const [view, setView]                       = useState<'list' | 'kanban'>('kanban')
    const [search, setSearch]                   = useState('')
    const [filterStatus, setFilterStatus]       = useState<TaskStatus | 'all'>('all')
    const [filterPriority, setFilterPriority]   = useState<TaskPriority | 'all'>('all')
    const [filterOverdue, setFilterOverdue]     = useState(false)
    const [sortBy, setSortBy]                   = useState<'created_desc' | 'due_asc' | 'priority' | 'status'>('priority')

    // ── Dialog state ──────────────────────────────────────────────────────────
    const [newOpen, setNewOpen]                 = useState(false)
    const [deleteTarget, setDeleteTarget]       = useState<Task | null>(null)
    const [bulkDeleteOpen, setBulkDeleteOpen]   = useState(false)

    // ── New task form ─────────────────────────────────────────────────────────
    const [title, setTitle]       = useState('')
    const [description, setDesc]  = useState('')
    const [priority, setPriority] = useState<TaskPriority>('medium')
    const [dueDate, setDueDate]   = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // ── Bulk selection ────────────────────────────────────────────────────────
    const [selected, setSelected] = useState<Set<string>>(new Set())

    // ── DND ───────────────────────────────────────────────────────────────────
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    // Keyboard shortcut: N = new task (when not in an input)
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
        if (e.key === 'n' || e.key === 'N') setNewOpen(true)
    }, [])

    useEffect(() => {
        fetchTasks()
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [fetchTasks, handleKeyDown])

    // ── Derived data ──────────────────────────────────────────────────────────
    const filteredTasks = useMemo(() => {
        let result = [...tasks]

        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.description?.toLowerCase().includes(q)
            )
        }
        if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus)
        if (filterPriority !== 'all') result = result.filter(t => t.priority === filterPriority)
        if (filterOverdue) result = result.filter(t => t.isOverdue)

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'priority':
                    return PRIORITY_SORT_ORDER[a.priority] - PRIORITY_SORT_ORDER[b.priority]
                case 'due_asc': {
                    if (!a.dueDate && !b.dueDate) return 0
                    if (!a.dueDate) return 1
                    if (!b.dueDate) return -1
                    return a.dueDate.getTime() - b.dueDate.getTime()
                }
                case 'status': {
                    const order: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2 }
                    return order[a.status] - order[b.status]
                }
                default: // created_desc
                    return b.createdAt.getTime() - a.createdAt.getTime()
            }
        })
        return result
    }, [tasks, search, filterStatus, filterPriority, filterOverdue, sortBy])

    const tasksByStatus = useMemo(() => ({
        todo:        filteredTasks.filter(t => t.status === 'todo'),
        in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
        done:        filteredTasks.filter(t => t.status === 'done'),
    }), [filteredTasks])

    const overdueCount = useMemo(() => tasks.filter(t => t.isOverdue).length, [tasks])

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || isSubmitting) return
        setIsSubmitting(true)
        const task = await addTask({
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            dueDate: dueDate ? new Date(dueDate) : undefined,
        })
        setIsSubmitting(false)
        if (task) {
            toast.success('Task created')
            setTitle(''); setDesc(''); setPriority('medium'); setDueDate('')
            setNewOpen(false)
        } else {
            toast.error(useTaskStore.getState().error ?? 'Failed to create task')
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        const ok = await deleteTask(deleteTarget.id)
        if (ok) toast.success('Task deleted')
        else toast.error(useTaskStore.getState().error ?? 'Failed to delete task')
        setDeleteTarget(null)
    }

    const handleBulkDelete = async () => {
        setBulkDeleteOpen(false)
        let failed = 0
        for (const id of selected) {
            const ok = await deleteTask(id)
            if (!ok) failed++
        }
        if (failed === 0) toast.success(`${selected.size} task${selected.size > 1 ? 's' : ''} deleted`)
        else toast.error(`${failed} deletion(s) failed`)
        setSelected(new Set())
    }

    const handleSelect = (id: string, checked: boolean) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (checked) next.add(id); else next.delete(id)
            return next
        })
    }

    const handleSelectAll = (checked: boolean) => {
        setSelected(checked ? new Set(filteredTasks.map(t => t.id)) : new Set())
    }

    const handleExportCSV = () => {
        const headers = ['Title', 'Status', 'Priority', 'Due Date', 'Overdue', 'Description']
        const rows = filteredTasks.map(t => [
            `"${t.title.replace(/"/g, '""')}"`,
            t.status,
            t.priority,
            t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
            t.isOverdue ? 'Yes' : 'No',
            `"${(t.description || '').replace(/"/g, '""')}"`,
        ])
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = 'tasks.csv'; link.click()
        URL.revokeObjectURL(url)
        toast.success('Tasks exported')
    }

    // ── DND handlers ──────────────────────────────────────────────────────────

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id)
        setActiveTask(task ?? null)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveTask(null)
        if (!over) return

        const draggedTask = tasks.find(t => t.id === active.id)
        if (!draggedTask) return

        const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[]

        let targetStatus: TaskStatus | null = null
        if (STATUSES.includes(over.id as TaskStatus)) {
            targetStatus = over.id as TaskStatus
        } else {
            const overTask = tasks.find(t => t.id === over.id)
            if (overTask) targetStatus = overTask.status
        }

        if (targetStatus && draggedTask.status !== targetStatus) {
            await updateStatus(draggedTask.id, targetStatus)
            const storeError = useTaskStore.getState().error
            if (storeError) toast.error(storeError)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const hasFilters = search || filterStatus !== 'all' || filterPriority !== 'all' || filterOverdue

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3D4A67] tracking-tight">Tasks</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                        {overdueCount > 0 && (
                            <span className="ml-2 text-red-500 font-medium">
                                ({overdueCount} overdue)
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* View toggle */}
                    <div className="flex gap-1 border border-slate-200 rounded-md p-0.5">
                        <Button
                            variant={view === 'list' ? 'default' : 'ghost'}
                            className={view === 'list' ? 'bg-[#3D4A67] h-8' : 'h-8'}
                            onClick={() => setView('list')}
                            size="sm"
                            aria-label="List view"
                            aria-pressed={view === 'list'}
                        >
                            <List className="h-4 w-4 mr-1" />List
                        </Button>
                        <Button
                            variant={view === 'kanban' ? 'default' : 'ghost'}
                            className={view === 'kanban' ? 'bg-[#3D4A67] h-8' : 'h-8'}
                            onClick={() => setView('kanban')}
                            size="sm"
                            aria-label="Kanban view"
                            aria-pressed={view === 'kanban'}
                        >
                            <LayoutGrid className="h-4 w-4 mr-1" />Kanban
                        </Button>
                    </div>

                    {/* Export */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="border-slate-300"
                        disabled={filteredTasks.length === 0}
                        aria-label="Export tasks to CSV"
                    >
                        <Download className="h-4 w-4 mr-1" />Export
                    </Button>

                    {/* New task */}
                    <Dialog open={newOpen} onOpenChange={setNewOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#E9B949] hover:bg-[#C99929] text-[#1a1a1a] gap-2" aria-label="Create new task (N)">
                                <Plus className="h-4 w-4" />New Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle className="text-[#3D4A67]">Add New Task</DialogTitle>
                                    <DialogDescription>Create a task to track your work. Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">N</kbd> anywhere to open.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Title *</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Review proposal"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDesc(e.target.value)}
                                            placeholder="Describe the task..."
                                            rows={2}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
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
                                        <div className="grid gap-2">
                                            <Label htmlFor="dueDate">Due Date</Label>
                                            <Input
                                                id="dueDate"
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                                    <Button type="submit" className="bg-[#E9B949] hover:bg-[#C99929] text-[#1a1a1a]" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Create Task
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search tasks…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9"
                        aria-label="Search tasks"
                    />
                </div>

                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TaskStatus | 'all')}>
                    <SelectTrigger className="w-36 h-9" aria-label="Filter by status">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as TaskPriority | 'all')}>
                    <SelectTrigger className="w-36 h-9" aria-label="Filter by priority">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="w-44 h-9" aria-label="Sort by">
                        <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="priority">Priority (high → low)</SelectItem>
                        <SelectItem value="due_asc">Due Date (soonest first)</SelectItem>
                        <SelectItem value="created_desc">Newest first</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    variant={filterOverdue ? 'default' : 'outline'}
                    size="sm"
                    className={filterOverdue ? 'bg-red-600 hover:bg-red-700 text-white h-9' : 'border-slate-300 h-9'}
                    onClick={() => setFilterOverdue(v => !v)}
                    aria-pressed={filterOverdue}
                    aria-label="Filter overdue tasks"
                >
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    Overdue{overdueCount > 0 && ` (${overdueCount})`}
                </Button>

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-slate-500"
                        onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPriority('all'); setFilterOverdue(false) }}
                        aria-label="Clear filters"
                    >
                        <X className="h-3.5 w-3.5 mr-1" />Clear
                    </Button>
                )}
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#3D4A67] text-white rounded-lg">
                    <CheckSquare2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{selected.size} selected</span>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-white hover:text-red-200 hover:bg-white/10 h-7"
                        onClick={() => setBulkDeleteOpen(true)}
                        aria-label="Delete selected tasks"
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete selected
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/70 hover:text-white hover:bg-white/10 h-7"
                        onClick={() => setSelected(new Set())}
                        aria-label="Deselect all"
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <Card className="border-slate-200">
                    <CardContent className="py-12 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#3D4A67]" />
                        <span className="ml-2 text-slate-500">Loading tasks…</span>
                    </CardContent>
                </Card>
            ) : error ? (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-8 text-center">
                        <AlertCircle className="h-8 w-8 mx-auto text-red-400 mb-2" />
                        <p className="text-red-600 font-medium">Failed to load tasks</p>
                        <p className="text-sm text-red-500 mt-1">{error}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchTasks()}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : filteredTasks.length === 0 ? (
                <Card className="border-slate-200 bg-white">
                    <CardContent className="py-16 text-center">
                        <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-700 font-medium text-lg">
                            {hasFilters ? 'No tasks match your filters' : 'No tasks yet'}
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                            {hasFilters
                                ? 'Try adjusting your search or filter settings'
                                : 'Create your first task by clicking "New Task" or pressing N'}
                        </p>
                        {!hasFilters && (
                            <Button className="mt-6 bg-[#E9B949] hover:bg-[#C99929] text-[#1a1a1a]" onClick={() => setNewOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />Create First Task
                            </Button>
                        )}
                    </CardContent>
                </Card>

            ) : view === 'kanban' ? (
                /* ── Kanban view (premium) ──────────────────────────────────── */
                <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="overflow-x-auto pb-2">
                        <div className="grid gap-5 md:grid-cols-3 min-w-[720px]">
                            {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((status) => {
                                const col = tasksByStatus[status]
                                return (
                                    <div key={status} className="flex flex-col min-w-[240px]">
                                        {/* Column header */}
                                        <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${COLUMN_BG_TINTS[status]}`}>
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="w-3 h-3 rounded-full ring-2 ring-white/80"
                                                    style={{ backgroundColor: COLUMN_COLORS[status] }}
                                                    aria-hidden="true"
                                                />
                                                <h3 className="font-semibold text-[#3D4A67] text-sm tracking-tight">
                                                    {TASK_STATUS_LABELS[status]}
                                                </h3>
                                            </div>
                                            <span className="text-lg font-bold text-[#3D4A67]/40">
                                                {col.length}
                                            </span>
                                        </div>

                                        {/* Column body */}
                                        <div className="bg-slate-50/50 rounded-b-xl border border-t-0 border-slate-200/60 p-3 flex-1">
                                            <DroppableColumn status={status}>
                                                {col.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                            <ClipboardList className="h-6 w-6 text-slate-300" />
                                                        </div>
                                                        <p className="text-sm text-slate-400">
                                                            No {TASK_STATUS_LABELS[status].toLowerCase()} tasks
                                                        </p>
                                                        {status === 'todo' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="mt-2 text-xs text-[#E9B949] hover:text-[#C99929]"
                                                                onClick={() => setNewOpen(true)}
                                                            >
                                                                <Plus className="h-3.5 w-3.5 mr-1" />Add a task
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    col.map((task) => (
                                                        <DraggableTaskCard
                                                            key={task.id}
                                                            task={task}
                                                            isSelected={selected.has(task.id)}
                                                            onSelect={handleSelect}
                                                            onDelete={setDeleteTarget}
                                                            onNavigate={(id) => router.push(`/tasks/${id}`)}
                                                            onStatusChange={updateStatus}
                                                        />
                                                    ))
                                                )}
                                            </DroppableColumn>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <DragOverlay>
                        {activeTask && <TaskGhostCard task={activeTask} />}
                    </DragOverlay>
                </DndContext>

            ) : (
                /* ── List view ────────────────────────────────────────────────── */
                <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="select-all"
                                checked={selected.size === filteredTasks.length && filteredTasks.length > 0}
                                onCheckedChange={(c) => handleSelectAll(!!c)}
                                aria-label="Select all tasks"
                            />
                            <Label htmlFor="select-all" className="text-xs text-slate-500 font-normal cursor-pointer">
                                Select all
                            </Label>
                        </div>
                    </CardHeader>
                    <CardContent className="divide-y p-0">
                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors
                                    ${task.isOverdue ? 'bg-red-50/30' : ''}
                                    ${selected.has(task.id) ? 'bg-blue-50/30' : ''}
                                `}
                            >
                                <Checkbox
                                    checked={selected.has(task.id)}
                                    onCheckedChange={(c) => handleSelect(task.id, !!c)}
                                    aria-label={`Select task: ${task.title}`}
                                />
                                <Checkbox
                                    checked={task.status === 'done'}
                                    onCheckedChange={() => updateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                                    className="h-4 w-4 accent-[#9EAE8E]"
                                    aria-label={`Mark task ${task.status === 'done' ? 'incomplete' : 'done'}: ${task.title}`}
                                />
                                <button
                                    className={`flex-1 text-left text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}
                                    onClick={() => router.push(`/tasks/${task.id}`)}
                                >
                                    {task.title}
                                </button>
                                {task.isOverdue && (
                                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                        <AlertCircle className="h-3 w-3" />Overdue
                                    </span>
                                )}
                                {task.dueDate && !task.isOverdue && (
                                    <span className="text-xs text-slate-400">
                                        Due {task.dueDate.toLocaleDateString('de-CH')}
                                    </span>
                                )}
                                <Badge className={`${TASK_PRIORITY_COLORS[task.priority]} text-xs`}>
                                    {TASK_PRIORITY_LABELS[task.priority]}
                                </Badge>
                                <Badge className="text-xs bg-slate-100 text-slate-600">
                                    {TASK_STATUS_LABELS[task.status]}
                                </Badge>
                                <TaskActionsMenu
                                    task={task}
                                    onDelete={setDeleteTarget}
                                    onStatusChange={updateStatus}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* ── Delete single task confirmation ───────────────────────────── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Bulk delete confirmation ──────────────────────────────────── */}
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.size} Tasks</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{selected.size}</strong> task{selected.size !== 1 ? 's' : ''}. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
