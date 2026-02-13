/**
 * GDPR Data Export API
 *
 * Provides complete account data export as required by GDPR Article 20
 * (Right to Data Portability)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user profile and organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        const tenantId = profile.tenant_id

        // Collect all user data
        const exportData: any = {
            exportDate: new Date().toISOString(),
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.created_at,
            },
            profile: {
                firstName: profile.first_name,
                lastName: profile.last_name,
                role: profile.role,
                avatarUrl: profile.avatar_url,
            },
            organization: null,
            contacts: [],
            projects: [],
            tasks: [],
            invoices: [],
            aiConversations: [],
            activityLog: [],
            notifications: [],
        }

        // Get organization data
        if (tenantId) {
            const { data: org } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', tenantId)
                .single()

            if (org) {
                exportData.organization = {
                    id: org.id,
                    name: org.name,
                    createdAt: org.created_at,
                }
            }

            // Get contacts
            const { data: contacts } = await supabase
                .from('contacts')
                .select('*')
                .eq('tenant_id', tenantId)

            exportData.contacts = contacts || []

            // Get projects
            const { data: projects } = await supabase
                .from('projects')
                .select('*')
                .eq('tenant_id', tenantId)

            exportData.projects = projects || []

            // Get tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('tenant_id', tenantId)

            exportData.tasks = tasks || []

            // Get invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('*')
                .eq('tenant_id', tenantId)

            exportData.invoices = invoices || []

            // Get AI conversations
            const { data: conversations } = await supabase
                .from('ai_conversations')
                .select(`
                    *,
                    ai_messages (*)
                `)
                .eq('user_id', user.id)

            exportData.aiConversations = conversations || []

            // Get activity log
            const { data: activityLog } = await supabase
                .from('activity_log')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1000) // Limit to last 1000 activities

            exportData.activityLog = activityLog || []

            // Get notifications
            const { data: notifications } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            exportData.notifications = notifications || []
        }

        // Create filename with timestamp
        const filename = `orbit-crm-data-export-${user.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'X-Export-Date': new Date().toISOString(),
                'X-Export-Format': 'JSON',
            },
        })
    } catch (error: any) {
        console.error('GDPR export error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to export data' },
            { status: 500 }
        )
    }
}
