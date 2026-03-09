import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

const VALID_TIERS = ['free', 'pro', 'business'] as const
const MAX_TOKEN_GRANT = 10_000_000

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

// ─── PATCH /api/admin/organizations/[id] ─────────────────────────────────────
// Supported actions:
//   { action: 'update_tier',  tier: 'free' | 'pro' | 'business' }
//   { action: 'add_tokens',   amount: number }

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

        const body = await request.json() as { action: string; tier?: string; amount?: number }

        // ── Update tier ──────────────────────────────────────────────────────
        if (body.action === 'update_tier') {
            if (!body.tier || !(VALID_TIERS as readonly string[]).includes(body.tier)) {
                return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
            }
            const { error: updateError } = await client
                .from('organizations')
                .update({ subscription_tier: body.tier })
                .eq('id', id)
            if (updateError) throw updateError
            return NextResponse.json({ success: true })
        }

        // ── Add tokens ───────────────────────────────────────────────────────
        if (body.action === 'add_tokens') {
            const amount = Number(body.amount)
            if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_TOKEN_GRANT) {
                return NextResponse.json(
                    { error: `Amount must be a positive integer ≤ ${MAX_TOKEN_GRANT.toLocaleString()}` },
                    { status: 400 }
                )
            }

            // Read current balance then increment (atomic via single UPDATE)
            const { data: org, error: fetchError } = await client
                .from('organizations')
                .select('token_balance')
                .eq('id', id)
                .single()
            if (fetchError) throw fetchError

            const { error: updateError } = await client
                .from('organizations')
                .update({ token_balance: (org?.token_balance ?? 0) + amount })
                .eq('id', id)
            if (updateError) throw updateError
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/organizations/[id]' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
