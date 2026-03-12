import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

const VALID_ROLES = ['owner', 'member', 'platform_admin'] as const

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAdminSupabase() {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: () => {},
            },
        }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return { error: 'Unauthorized' as const, status: 401 as const, client: null }

    const { data: profile } = await supabaseAuth
        .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'platform_admin') {
        return { error: 'Forbidden' as const, status: 403 as const, client: null }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { error: 'Service role key not configured' as const, status: 500 as const, client: null }
    }

    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    return { error: null, status: null, client }
}

// ─── PATCH /api/admin/users/[id] ─────────────────────────────────────────────
// Supported actions:
//   { action: 'update_role', role: 'owner' | 'member' | 'platform_admin' }

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error, status, client } = await getAdminSupabase()
        if (error || !client) {
            return NextResponse.json({ error }, { status: status ?? 500 })
        }

        const { id } = await params
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

        const body = await request.json() as { action: string; role?: string }

        // ── Update role ──────────────────────────────────────────────────────
        if (body.action === 'update_role') {
            if (!body.role || !(VALID_ROLES as readonly string[]).includes(body.role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
            }
            const { error: updateError } = await client
                .from('profiles')
                .update({ role: body.role })
                .eq('id', id)
            if (updateError) throw updateError
            await client.from('admin_audit_log').insert({ action: 'update_role', target_type: 'user', target_id: id, details: { role: body.role } }).then(null, () => {})
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/users/[id]' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// ─── DELETE /api/admin/users/[id] ────────────────────────────────────────────
// Permanently deletes a user profile and their auth account. Irreversible.
// Cannot delete platform_admin accounts for safety.

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error, status, client } = await getAdminSupabase()
        if (error || !client) {
            return NextResponse.json({ error }, { status: status ?? 500 })
        }

        const { id } = await params
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

        // Safety: refuse to delete platform_admin accounts
        const { data: profile } = await client
            .from('profiles')
            .select('role, email')
            .eq('id', id)
            .single()

        if (profile?.role === 'platform_admin') {
            return NextResponse.json(
                { error: 'Cannot delete a platform_admin account' },
                { status: 403 }
            )
        }

        // 1. Delete from Supabase Auth (profile cascades via DB trigger)
        const { error: authError } = await client.auth.admin.deleteUser(id)
        if (authError) throw authError

        // 2. Log to admin audit log
        await client.from('admin_audit_log').insert({
            action: 'delete_user',
            target_type: 'user',
            target_id: id,
            details: { email: profile?.email },
        }).throwOnError().then(null, () => {}) // non-blocking

        return NextResponse.json({ success: true })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/users/[id] DELETE' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
