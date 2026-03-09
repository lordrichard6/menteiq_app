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

        // 3. Service role queries
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Build org query
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

        // 4. Enrich each org with user and invoice counts
        const enriched = await Promise.all(
            (orgs ?? []).map(async (org) => {
                const [usersResult, invoicesResult] = await Promise.all([
                    supabaseAdmin
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .eq('tenant_id', org.id),
                    supabaseAdmin
                        .from('invoices')
                        .select('id', { count: 'exact', head: true })
                        .eq('tenant_id', org.id),
                ])
                return {
                    ...org,
                    userCount: usersResult.count ?? 0,
                    invoiceCount: invoicesResult.count ?? 0,
                }
            })
        )

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
