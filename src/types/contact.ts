// Contact types for OrbitCRM

export type ContactStatus = 'lead' | 'opportunity' | 'client' | 'churned'

export interface Contact {
    id: string
    firstName: string
    lastName: string
    isCompany: boolean
    companyName?: string
    email: string
    phone?: string
    status: ContactStatus
    tags: string[]
    notes: string[]
    createdAt: Date
    updatedAt: Date
    // Portal access fields
    portal_enabled?: boolean
    portal_token?: string
    portal_invited_at?: Date | string
    last_portal_login?: Date | string
}

export interface CreateContactInput {
    firstName: string
    lastName: string
    isCompany: boolean
    companyName?: string
    email: string
    phone?: string
    status?: ContactStatus
    tags?: string[]
}

export const STATUS_LABELS: Record<ContactStatus, string> = {
    lead: 'Lead',
    opportunity: 'Opportunity',
    client: 'Client',
    churned: 'Churned',
}

export const STATUS_COLORS: Record<ContactStatus, string> = {
    lead: 'bg-blue-100 text-blue-700',
    opportunity: 'bg-amber-100 text-amber-700',
    client: 'bg-green-100 text-green-700',
    churned: 'bg-red-100 text-red-700',
}
