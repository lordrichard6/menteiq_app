// Project types for OrbitCRM

export type ProjectStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'archived'

export interface ProjectFilters {
    search: string
    status: ProjectStatus | 'all'
    clientId: string | 'all'
}

export interface ProjectSort {
    column: 'name' | 'deadline' | 'created_at' | 'status'
    direction: 'asc' | 'desc'
}

export interface Project {
    id: string
    name: string
    description?: string
    clientId?: string
    clientName?: string
    status: ProjectStatus
    deadline?: Date
    budget_amount?: number
    budget_currency?: string
    is_recurring?: boolean
    recurrence_interval?: 'monthly' | 'quarterly' | 'yearly' | 'fixed_interval'
    next_occurrence_date?: Date
    archivedAt?: Date
    custom_fields?: Record<string, any>
    createdAt: Date
    updatedAt: Date
}

export interface CreateProjectInput {
    name: string
    description?: string
    clientId?: string
    status?: ProjectStatus
    deadline?: Date
    budget_amount?: number
    budget_currency?: string
    is_recurring?: boolean
    recurrence_interval?: 'monthly' | 'quarterly' | 'yearly' | 'fixed_interval'
    next_occurrence_date?: Date
    custom_fields?: Record<string, any>
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    lead: 'Lead/Planning',
    active: 'Active',
    on_hold: 'On Hold',
    completed: 'Completed',
    archived: 'Archived',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
    lead: 'bg-purple-100 text-purple-700',
    active: 'bg-green-100 text-green-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-slate-100 text-slate-700',
}
