/**
 * Activity Logging Utility
 *
 * Provides helper functions for logging user activities to the activity_log table.
 * This creates an audit trail and powers the timeline features.
 */

import { createClient } from '@/lib/supabase/client'

export type EventType =
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

export type EntityType =
    | 'contact'
    | 'project'
    | 'task'
    | 'invoice'
    | 'document'
    | 'note'
    | 'tag'

export interface ActivityLogEntry {
    eventType: EventType
    entityType: EntityType
    entityId: string
    entityName?: string
    description?: string
    metadata?: Record<string, any>
}

/**
 * Log an activity to the database
 */
export async function logActivity({
    eventType,
    entityType,
    entityId,
    entityName,
    description,
    metadata = {},
}: ActivityLogEntry): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // Get current user and org
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!profile?.tenant_id) {
            return { success: false, error: 'No organization found' }
        }

        // Insert activity log
        const { error } = await supabase
            .from('activity_log')
            .insert({
                tenant_id: profile.tenant_id,
                user_id: user.id,
                event_type: eventType,
                entity_type: entityType,
                entity_id: entityId,
                entity_name: entityName,
                description: description,
                metadata: metadata,
            })

        if (error) {
            console.error('Failed to log activity:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error: any) {
        console.error('Activity logging error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Helper functions for common activities
 */

export const ActivityLogger = {
    // Contact activities
    contactCreated: (contactId: string, contactName: string) =>
        logActivity({
            eventType: 'created',
            entityType: 'contact',
            entityId: contactId,
            entityName: contactName,
            description: `Created contact: ${contactName}`,
        }),

    contactUpdated: (contactId: string, contactName: string, changes?: Record<string, any>) =>
        logActivity({
            eventType: 'updated',
            entityType: 'contact',
            entityId: contactId,
            entityName: contactName,
            description: `Updated contact: ${contactName}`,
            metadata: changes,
        }),

    contactDeleted: (contactId: string, contactName: string) =>
        logActivity({
            eventType: 'deleted',
            entityType: 'contact',
            entityId: contactId,
            entityName: contactName,
            description: `Deleted contact: ${contactName}`,
        }),

    contactStatusChanged: (
        contactId: string,
        contactName: string,
        oldStatus: string,
        newStatus: string
    ) =>
        logActivity({
            eventType: 'status_changed',
            entityType: 'contact',
            entityId: contactId,
            entityName: contactName,
            description: `Changed status from ${oldStatus} to ${newStatus}`,
            metadata: { old_status: oldStatus, new_status: newStatus },
        }),

    contactEmailed: (contactId: string, contactName: string, subject?: string) =>
        logActivity({
            eventType: 'emailed',
            entityType: 'contact',
            entityId: contactId,
            entityName: contactName,
            description: subject ? `Emailed: ${subject}` : 'Sent email',
            metadata: { subject },
        }),

    contactCalled: (contactId: string, contactName: string, duration?: number) =>
        logActivity({
            eventType: 'called',
            entityType: 'contact',
            entityId: contactId,
            entityName: contactName,
            description: duration ? `Called (${duration}min)` : 'Called contact',
            metadata: { duration },
        }),

    contactNoted: (contactId: string, contactName: string, note: string) =>
        logActivity({
            eventType: 'noted',
            entityType: 'contact',
            entityId: contactId,
            entityName: contactName,
            description: 'Added note',
            metadata: { note: note.slice(0, 100) }, // Store truncated note
        }),

    // Project activities
    projectCreated: (projectId: string, projectName: string) =>
        logActivity({
            eventType: 'created',
            entityType: 'project',
            entityId: projectId,
            entityName: projectName,
            description: `Created project: ${projectName}`,
        }),

    projectUpdated: (projectId: string, projectName: string, changes?: Record<string, any>) =>
        logActivity({
            eventType: 'updated',
            entityType: 'project',
            entityId: projectId,
            entityName: projectName,
            description: `Updated project: ${projectName}`,
            metadata: changes,
        }),

    projectDeleted: (projectId: string, projectName: string) =>
        logActivity({
            eventType: 'deleted',
            entityType: 'project',
            entityId: projectId,
            entityName: projectName,
            description: `Deleted project: ${projectName}`,
        }),

    projectCompleted: (projectId: string, projectName: string) =>
        logActivity({
            eventType: 'completed',
            entityType: 'project',
            entityId: projectId,
            entityName: projectName,
            description: `Completed project: ${projectName}`,
        }),

    // Task activities
    taskCreated: (taskId: string, taskTitle: string) =>
        logActivity({
            eventType: 'created',
            entityType: 'task',
            entityId: taskId,
            entityName: taskTitle,
            description: `Created task: ${taskTitle}`,
        }),

    taskCompleted: (taskId: string, taskTitle: string) =>
        logActivity({
            eventType: 'completed',
            entityType: 'task',
            entityId: taskId,
            entityName: taskTitle,
            description: `Completed task: ${taskTitle}`,
        }),

    // Invoice activities
    invoiceCreated: (invoiceId: string, invoiceNumber: string, amount: number) =>
        logActivity({
            eventType: 'invoiced',
            entityType: 'invoice',
            entityId: invoiceId,
            entityName: invoiceNumber,
            description: `Created invoice ${invoiceNumber} for CHF ${amount}`,
            metadata: { amount, currency: 'CHF' },
        }),

    invoicePaid: (invoiceId: string, invoiceNumber: string, amount: number) =>
        logActivity({
            eventType: 'paid',
            entityType: 'invoice',
            entityId: invoiceId,
            entityName: invoiceNumber,
            description: `Invoice ${invoiceNumber} paid (CHF ${amount})`,
            metadata: { amount, currency: 'CHF' },
        }),
}

/**
 * Fetch activity log for a specific entity (e.g., contact timeline)
 */
export async function getEntityActivity(
    entityType: EntityType,
    entityId: string,
    limit = 50
) {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Failed to fetch entity activity:', error)
        return []
    }

    return data || []
}

/**
 * Fetch recent activity for the organization
 */
export async function getOrganizationActivity(limit = 50) {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id) return []

    const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Failed to fetch organization activity:', error)
        return []
    }

    return data || []
}
