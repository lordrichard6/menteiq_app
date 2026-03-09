import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import * as Sentry from '@sentry/nextjs'

// Pricing tiers for MRR calculation
const TIER_PRICING: Record<string, number> = {
    free: 0,
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

        // 2. Use service role to bypass RLS for cross-tenant queries
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 3. Parallel queries for efficiency
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [
            orgsResult,
            usersResult,
            tierCountsResult,
            tokenUsageResult,
            recentOrgsResult,
        ] = await Promise.all([
            // Total org count
            supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true }),
            // Total user count
            supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
            // Tier distribution
            supabaseAdmin
                .from('organizations')
                .select('subscription_tier'),
            // AI token usage this month
            supabaseAdmin
                .from('usage_logs')
                .select('effective_tokens')
                .gte('created_at', startOfMonth),
            // Recent 5 org signups
            supabaseAdmin
                .from('organizations')
                .select('id, name, slug, subscription_tier, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
        ])

        // Calculate tier breakdown and MRR
        const tierCounts: Record<string, number> = { free: 0, pro: 0, business: 0 }
        if (tierCountsResult.data) {
            for (const org of tierCountsResult.data) {
                const tier = org.subscription_tier as string
                tierCounts[tier] = (tierCounts[tier] ?? 0) + 1
            }
        }

        const estimatedMRR = Object.entries(tierCounts).reduce((sum, [tier, count]) => {
            return sum + (TIER_PRICING[tier] ?? 0) * count
        }, 0)

        const paidSubscriptions = (tierCounts.pro ?? 0) + (tierCounts.business ?? 0)

        // Sum AI tokens this month
        const tokensThisMonth = tokenUsageResult.data?.reduce(
            (sum, row) => sum + (row.effective_tokens ?? 0),
            0
        ) ?? 0

        return NextResponse.json({
            totalOrganizations: orgsResult.count ?? 0,
            totalUsers: usersResult.count ?? 0,
            paidSubscriptions,
            freeTier: tierCounts.free ?? 0,
            tierCounts,
            estimatedMRR,
            tokensThisMonth,
            recentOrganizations: recentOrgsResult.data ?? [],
        })
    } catch (error) {
        Sentry.captureException(error, { tags: { route: 'admin/stats' } })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
