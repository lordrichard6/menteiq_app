import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: NextRequest) {
    try {
        // 1. Auth check
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
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabaseAuth
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'platform_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Parse query params
        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
        const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
        const search = searchParams.get('search') ?? ''
        const tier = searchParams.get('tier') ?? ''
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        // 3. Service role client
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 4. Main org query
        let orgsQuery = supabaseAdmin
            .from('organizations')
            .select('id, name, slug, subscription_tier, stripe_customer_id, token_balance, current_period_end, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)

        if (search) {
            orgsQuery = orgsQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
        }
        if (tier) {
            orgsQuery = orgsQuery.eq('subscription_tier', tier)
        }

        const { data: orgs, count, error } = await orgsQuery
        if (error) throw error

        // 5. Batch-enrich with user and invoice counts (2 queries instead of N*2)
        const orgIds = (orgs ?? []).map((o) => o.id)

        const [userCountsResult, invoiceCountsResult] = orgIds.length > 0
            ? await Promise.all([
                supabaseAdmin.from('profiles').select('tenant_id').in('tenant_id', orgIds),
                supabaseAdmin.from('invoices').select('tenant_id').in('tenant_id', orgIds),
            ])
            : [{ data: [] as Array<{ tenant_id: string }> }, { data: [] as Array<{ tenant_id: string }> }]

        // Build count maps
        const userCountMap = new Map<string, number>()
        for (const row of userCountsResult.data ?? []) {
            const id = row.tenant_id
            userCountMap.set(id, (userCountMap.get(id) ?? 0) + 1)
        }

        const invoiceCountMap = new Map<string, number>()
        for (const row of invoiceCountsResult.data ?? []) {
            const id = row.tenant_id
            invoiceCountMap.set(id, (invoiceCountMap.get(id) ?? 0) + 1)
        }

        const enriched = (orgs ?? []).map((org) => ({
            ...org,
            userCount: userCountMap.get(org.id) ?? 0,
            invoiceCount: invoiceCountMap.get(org.id) ?? 0,
        }))

        return NextResponse.json({
            organizations: enriched,
            total: count ?? 0,
            page,
            pageSize,
            totalPages: Math.ceil((count ?? 0) / pageSize),
        })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/organizations' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
