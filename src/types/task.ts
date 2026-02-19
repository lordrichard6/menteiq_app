// Task types for MenteIQ

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
    id: string
    title: string
    description?: string
    status: TaskStatus
    priority: TaskPriority
    dueDate?: Date
    projectId?: string
    contactId?: string
    milestone_id?: string
    dependencies?: string[]
    subtasks: { id: string; title: string; completed: boolean }[]
    createdAt: Date
    updatedAt: Date
}

export interface CreateTaskInput {
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    dueDate?: Date
    projectId?: string
    contactId?: string
    milestone_id?: string
    dependencyIds?: string[]
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
}
