export type MilestoneStatus = 'pending' | 'in_progress' | 'completed'

export interface Milestone {
    id: string
    tenant_id: string
    project_id: string
    name: string
    description?: string | null
    due_date?: string | null
    status: MilestoneStatus
    order_index: number
    created_at: string
    updated_at: string
}

export interface CreateMilestoneInput {
    project_id: string
    name: string
    description?: string | null
    due_date?: string | null
    status?: MilestoneStatus
    order_index?: number
}

export interface UpdateMilestoneInput {
    name?: string
    description?: string | null
    due_date?: string | null
    status?: MilestoneStatus
    order_index?: number
}
