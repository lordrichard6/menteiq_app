import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

// Pricing for ACTIVE paid subscriptions only
const TIER_PRICING: Record<string, number> = {
    pro: 29,
    business: 99,
}

export async function GET() {
    try {
        // 1. Auth check via anon client (respects RLS)
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

        // 2. Service role client for cross-tenant queries
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const nowIso = now.toISOString()

        // 3. Parallel aggregate queries — no row-limit issues
        //    - Tier counts use separate count queries (avoids fetching all rows)
        //    - MRR filters active subscriptions only (current_period_end in the future or null)
        //    - Token usage uses server-side SUM via RPC (avoids 1000-row PostgREST limit)
        const [
            orgsResult,
            usersResult,
            freeCount,
            proCount,
            businessCount,
            proActiveCount,
            businessActiveCount,
            tokenResult,
            recentOrgsResult,
        ] = await Promise.all([
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
            // Tier counts
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true })
                .eq('subscription_tier', 'free'),
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true })
                .eq('subscription_tier', 'pro'),
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true })
                .eq('subscription_tier', 'business'),
            // MRR: paid + active (period not yet ended)
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true })
                .eq('subscription_tier', 'pro')
                .or(`current_period_end.is.null,current_period_end.gt.${nowIso}`),
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true })
                .eq('subscription_tier', 'business')
                .or(`current_period_end.is.null,current_period_end.gt.${nowIso}`),
            // Server-side SUM — bypasses 1000-row PostgREST default limit
            supabaseAdmin.rpc('admin_token_usage_this_month', { start_date: startOfMonth }),
            // Recent 5 signups
            supabaseAdmin
                .from('organizations')
                .select('id, name, slug, subscription_tier, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
        ])

        const tierCounts = {
            free: freeCount.count ?? 0,
            pro: proCount.count ?? 0,
            business: businessCount.count ?? 0,
        }

        const estimatedMRR =
            (proActiveCount.count ?? 0) * TIER_PRICING.pro +
            (businessActiveCount.count ?? 0) * TIER_PRICING.business

        return NextResponse.json({
            totalOrganizations: orgsResult.count ?? 0,
            totalUsers: usersResult.count ?? 0,
            paidSubscriptions: tierCounts.pro + tierCounts.business,
            freeTier: tierCounts.free,
            tierCounts,
            estimatedMRR,
            tokensThisMonth: (tokenResult.data as number) ?? 0,
            recentOrganizations: recentOrgsResult.data ?? [],
        })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/stats' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
