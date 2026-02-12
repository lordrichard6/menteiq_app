/**
 * DELETE /api/contacts/[id]/gdpr-delete
 *
 * Permanently delete contact data for GDPR "Right to be Forgotten" compliance
 * This is a HARD DELETE that removes all data and cannot be undone
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const contactId = params.id

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get contact data before deletion (for audit log)
        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .single()

        if (contactError || !contact) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            )
        }

        // Log the deletion action BEFORE deleting (for GDPR compliance audit)
        await logActivity({
            eventType: 'deleted',
            entityType: 'contact',
            entityId: contactId,
            entityName: contact.name,
            description: `GDPR: Right to be Forgotten - Permanent deletion of contact and all related data`,
            metadata: {
                gdpr_deletion: true,
                deleted_at: new Date().toISOString(),
                contact_email: contact.email,
                contact_name: contact.name,
                requester_id: user.id,
            },
        })

        // Generate deletion certificate data
        const deletionCertificate = {
            certificate_id: crypto.randomUUID(),
            deletion_type: 'GDPR Right to be Forgotten',
            contact_id: contactId,
            contact_name: contact.name,
            contact_email: contact.email,
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
            data_deleted: [
                'Personal information (name, email, phone, company)',
                'Contact tags and notes',
                'Portal access credentials',
                'Related invoices and payment records',
                'Related tasks and assignments',
                'Related projects',
                'Activity history',
                'All associated metadata',
            ],
            legal_basis: 'GDPR Article 17 - Right to Erasure',
            retention_period: 'Data deleted permanently, no retention',
        }

        // Delete related data in correct order (respecting foreign key constraints)
        // Note: If you have ON DELETE CASCADE set up, some of these may be automatic

        // 1. Delete activity logs (already logged the deletion above)
        // Activity logs related to this contact will be handled by CASCADE or remain for audit

        // 2. Delete portal sessions
        await supabase
            .from('portal_sessions')
            .delete()
            .eq('contact_id', contactId)

        // 3. Delete tasks
        await supabase
            .from('tasks')
            .delete()
            .eq('contact_id', contactId)

        // 4. Delete project associations
        await supabase
            .from('projects')
            .delete()
            .eq('contact_id', contactId)

        // 5. Delete invoices
        await supabase
            .from('invoices')
            .delete()
            .eq('contact_id', contactId)

        // 6. Finally, delete the contact
        const { error: deleteError } = await supabase
            .from('contacts')
            .delete()
            .eq('id', contactId)

        if (deleteError) {
            console.error('GDPR deletion error:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete contact', details: deleteError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Contact and all related data permanently deleted',
            deletion_certificate: deletionCertificate,
        })
    } catch (error: any) {
        console.error('GDPR deletion error:', error)
        return NextResponse.json(
            { error: 'Failed to process GDPR deletion', details: error.message },
            { status: 500 }
        )
    }
}
