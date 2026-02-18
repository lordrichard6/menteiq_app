/**
 * GET /api/contacts/[id]/export?format=json|csv
 *
 * Export all contact data for GDPR compliance (data portability)
 * Includes personal data, related invoices, tasks, projects, notes, and activity history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: contactId } = await params

        // Get query params
        const searchParams = request.nextUrl.searchParams
        const format = searchParams.get('format') || 'json'

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get contact data
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

        // Get related data
        const [invoices, tasks, projects, notes, activities] = await Promise.all([
            // Invoices
            supabase
                .from('invoices')
                .select('*')
                .eq('contact_id', contactId)
                .then(({ data }) => data || []),

            // Tasks
            supabase
                .from('tasks')
                .select('*')
                .eq('contact_id', contactId)
                .then(({ data }) => data || []),

            // Projects
            supabase
                .from('projects')
                .select('*')
                .eq('contact_id', contactId)
                .then(({ data }) => data || []),

            // Notes (assuming they're stored in contact.notes field)
            Promise.resolve(contact.notes || []),

            // Activity history
            supabase
                .from('activity_feed')
                .select('*')
                .eq('entity_type', 'contact')
                .eq('entity_id', contactId)
                .order('created_at', { ascending: false })
                .then(({ data }) => data || []),
        ])

        // Compile complete data export
        const exportData = {
            export_info: {
                exported_at: new Date().toISOString(),
                export_format: format,
                contact_id: contactId,
                gdpr_compliant: true,
            },
            personal_data: {
                id: contact.id,
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                company: contact.company,
                status: contact.status,
                tags: contact.tags,
                notes: contact.notes,
                created_at: contact.created_at,
                updated_at: contact.updated_at,
                // Portal access info
                portal_enabled: contact.portal_enabled,
                portal_invited_at: contact.portal_invited_at,
                last_portal_login: contact.last_portal_login,
                // Consent info (if exists)
                marketing_consent: contact.marketing_consent,
                data_processing_consent: contact.data_processing_consent,
                consent_date: contact.consent_date,
            },
            invoices: invoices.map(inv => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                status: inv.status,
                total: inv.total,
                due_date: inv.due_date,
                paid_date: inv.paid_date,
                created_at: inv.created_at,
            })),
            tasks: tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                due_date: task.due_date,
                created_at: task.created_at,
            })),
            projects: projects.map(proj => ({
                id: proj.id,
                name: proj.name,
                description: proj.description,
                status: proj.status,
                start_date: proj.start_date,
                end_date: proj.end_date,
                created_at: proj.created_at,
            })),
            activity_history: activities.map(act => ({
                event_type: act.event_type,
                description: act.description,
                user_name: act.user_name,
                created_at: act.created_at,
            })),
        }

        // Generate response based on format
        if (format === 'csv') {
            // Generate CSV format
            const csv = generateCSV(exportData)
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="contact-${contactId}-export.csv"`,
                },
            })
        } else {
            // Default to JSON
            const json = JSON.stringify(exportData, null, 2)
            return new NextResponse(json, {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="contact-${contactId}-export.json"`,
                },
            })
        }
    } catch (error: any) {
        console.error('Contact export error:', error)
        return NextResponse.json(
            { error: 'Failed to export contact data', details: error.message },
            { status: 500 }
        )
    }
}

function generateCSV(data: any): string {
    const lines: string[] = []

    // Header
    lines.push('GDPR Data Export')
    lines.push(`Exported at: ${data.export_info.exported_at}`)
    lines.push('')

    // Personal Data
    lines.push('=== PERSONAL DATA ===')
    lines.push('Field,Value')
    Object.entries(data.personal_data).forEach(([key, value]) => {
        lines.push(`${key},"${String(value || '').replace(/"/g, '""')}"`)
    })
    lines.push('')

    // Invoices
    lines.push('=== INVOICES ===')
    if (data.invoices.length > 0) {
        const invoiceKeys = Object.keys(data.invoices[0])
        lines.push(invoiceKeys.join(','))
        data.invoices.forEach((inv: any) => {
            lines.push(invoiceKeys.map(k => `"${String(inv[k] || '').replace(/"/g, '""')}"`).join(','))
        })
    } else {
        lines.push('No invoices found')
    }
    lines.push('')

    // Tasks
    lines.push('=== TASKS ===')
    if (data.tasks.length > 0) {
        const taskKeys = Object.keys(data.tasks[0])
        lines.push(taskKeys.join(','))
        data.tasks.forEach((task: any) => {
            lines.push(taskKeys.map(k => `"${String(task[k] || '').replace(/"/g, '""')}"`).join(','))
        })
    } else {
        lines.push('No tasks found')
    }
    lines.push('')

    // Projects
    lines.push('=== PROJECTS ===')
    if (data.projects.length > 0) {
        const projKeys = Object.keys(data.projects[0])
        lines.push(projKeys.join(','))
        data.projects.forEach((proj: any) => {
            lines.push(projKeys.map(k => `"${String(proj[k] || '').replace(/"/g, '""')}"`).join(','))
        })
    } else {
        lines.push('No projects found')
    }
    lines.push('')

    // Activity History
    lines.push('=== ACTIVITY HISTORY ===')
    if (data.activity_history.length > 0) {
        const actKeys = Object.keys(data.activity_history[0])
        lines.push(actKeys.join(','))
        data.activity_history.forEach((act: any) => {
            lines.push(actKeys.map(k => `"${String(act[k] || '').replace(/"/g, '""')}"`).join(','))
        })
    } else {
        lines.push('No activity history found')
    }

    return lines.join('\n')
}
