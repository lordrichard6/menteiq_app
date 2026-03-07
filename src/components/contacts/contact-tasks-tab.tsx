'use client'

import { Contact } from '@/types/contact'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useTaskStore } from '@/stores/task-store'
import { Plus, CheckSquare, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface ContactTasksTabProps {
    contact: Contact
}

const STATUS_COLORS = {
    todo: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
}

const STATUS_LABELS = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
}

export function ContactTasksTab({ contact }: ContactTasksTabProps) {
    const router = useRouter()
    const tasks = useTaskStore((state) => state.tasks)
    const updateTask = useTaskStore((state) => state.updateTask)
    const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all')

    const contactTasks = useMemo(() => {
        const filtered = tasks.filter(task => task.contactId === contact.id)
        if (filter === 'all') return filtered
        return filtered.filter(task => task.status === filter)
    }, [tasks, contact.id, filter])

    const handleToggleComplete = async (taskId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'todo' : 'done'
        try {
            await updateTask(taskId, { status: newStatus })
        } catch (error) {
            console.error('Failed to update task:', error)
            toast.error('Failed to update task status')
        }
    }

    return (
        <div className="space-y-4">
            {/* Header with filters and action */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    {(['all', 'todo', 'in_progress', 'done'] as const).map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter(f)}
                            className={filter === f ? 'bg-[#3D4A67] hover:bg-[#2D3A57]' : ''}
                        >
                            {f === 'all' ? 'All' : STATUS_LABELS[f]}
                        </Button>
                    ))}
                </div>

                <Button
                    onClick={() => router.push(`/tasks/new?contact=${contact.id}`)}
                    className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white shrink-0"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </div>

            {/* Task List */}
            {contactTasks.length > 0 ? (
                <div className="space-y-2">
                    {contactTasks.map((task) => (
                        <Card
                            key={task.id}
                            className="border-slate-200 bg-white hover:shadow-sm transition-shadow"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <Checkbox
                                        checked={task.status === 'done'}
                                        onCheckedChange={() => handleToggleComplete(task.id, task.status)}
                                        className="mt-1"
                                    />
                                    <div
                                        className="flex-1 cursor-pointer"
                                        role="link"
                                        tabIndex={0}
                                        onClick={() => router.push(`/tasks/${task.id}`)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                router.push(`/tasks/${task.id}`)
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-[#3D4A67]'}`}>
                                                {task.title}
                                            </div>
                                            <Badge className={STATUS_COLORS[task.status]}>
                                                {STATUS_LABELS[task.status]}
                                            </Badge>
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}
                                        {task.dueDate && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                                                <Calendar className="h-3 w-3" />
                                                Due: {new Date(task.dueDate).toLocaleDateString('de-CH')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>No tasks yet for this contact.</p>
                    <Button
                        onClick={() => router.push(`/tasks/new?contact=${contact.id}`)}
                        variant="outline"
                        className="mt-4"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Task
                    </Button>
                </div>
            )}
        </div>
    )
}
