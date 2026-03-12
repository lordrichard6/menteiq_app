import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import * as Sentry from '@sentry/nextjs'

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAdminSupabase() {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
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

// ─── GET /api/admin/billing ───────────────────────────────────────────────────
// Returns orgs with Stripe data, optionally enriched with live Stripe subscription status.
// Query params: page, pageSize, status (active | trialing | past_due | canceled | free)

export async function GET(request: NextRequest) {
    try {
        const { error, status, client } = await getAdminSupabase()
        if (error || !client) {
            return NextResponse.json({ error }, { status: status ?? 500 })
        }

        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
        const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
        const statusFilter = searchParams.get('status') ?? ''

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        // Fetch orgs that have Stripe customer IDs (or all if no filter)
        let query = client
            .from('organizations')
            .select(`
                id,
                name,
                slug,
                subscription_tier,
                stripe_customer_id,
                stripe_subscription_id,
                current_period_end,
                created_at
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (statusFilter === 'free') {
            query = query.is('stripe_customer_id', null)
        } else if (statusFilter) {
            query = query.not('stripe_customer_id', 'is', null)
        }

        const { data: orgs, count, error: dbError } = await query
        if (dbError) throw dbError

        // Optionally fetch live Stripe data if STRIPE_SECRET_KEY is set
        let enriched = (orgs ?? []) as Array<Record<string, unknown>>
        if (process.env.STRIPE_SECRET_KEY && enriched.length > 0) {
            try {
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
                enriched = await Promise.all(
                    enriched.map(async (org) => {
                        if (!org.stripe_subscription_id) return { ...org, stripe_status: 'free' }
                        try {
                            const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id as string)
                            return { ...org, stripe_status: sub.status, stripe_current_period_end: sub.current_period_end }
                        } catch {
                            return { ...org, stripe_status: 'unknown' }
                        }
                    })
                )
            } catch {
                // Stripe enrichment failed — return raw DB data
            }
        }

        const total = count ?? 0
        return NextResponse.json({
            organizations: enriched,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
        })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/billing' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
