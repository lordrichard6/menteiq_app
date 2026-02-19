// Activity log types for MenteIQ

export type ActivityEventType =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'viewed'
    | 'emailed'
    | 'called'
    | 'noted'
    | 'tagged'
    | 'status_changed'
    | 'assigned'
    | 'completed'
    | 'invoiced'
    | 'paid'
    | 'uploaded'
    | 'downloaded'

export type ActivityEntityType =
    | 'contact'
    | 'project'
    | 'task'
    | 'invoice'
    | 'document'

export interface ActivityLog {
    id: string
    tenantId: string
    userId?: string
    eventType: ActivityEventType
    entityType: ActivityEntityType
    entityId: string
    entityName?: string
    description?: string
    metadata: Record<string, any>
    createdAt: Date
    userName?: string
    userAvatar?: string
}
