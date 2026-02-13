export interface TimeEntry {
    id: string
    tenant_id: string
    project_id: string
    task_id?: string | null
    user_id: string
    duration_minutes: number
    description?: string | null
    date: string
    is_billable: boolean
    created_at: string
    updated_at: string
    user?: {
        first_name: string | null
        last_name: string | null
    }
}

export interface CreateTimeEntryInput {
    project_id: string
    task_id?: string | null
    duration_minutes: number
    description?: string | null
    date: string
    is_billable: boolean
}
