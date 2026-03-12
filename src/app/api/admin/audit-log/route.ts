import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

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

    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    return { error: null, status: null, client }
}

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────────
// Returns paginated audit log entries.
// Query params: page, pageSize, action (filter), target_type (filter)

export async function GET(request: NextRequest) {
    try {
        const { error, status, client } = await getAdminSupabase()
        if (error || !client) {
            return NextResponse.json({ error }, { status: status ?? 500 })
        }

        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
        const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50')))
        const actionFilter = searchParams.get('action') ?? ''
        const targetTypeFilter = searchParams.get('target_type') ?? ''

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let query = client
            .from('admin_audit_log')
            .select(`
                id,
                created_at,
                action,
                target_type,
                target_id,
                details,
                admin_id
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (actionFilter) query = query.eq('action', actionFilter)
        if (targetTypeFilter) query = query.eq('target_type', targetTypeFilter)

        const { data: logs, count, error: dbError } = await query
        if (dbError) throw dbError

        const total = count ?? 0
        return NextResponse.json({
            logs: logs ?? [],
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/audit-log' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
