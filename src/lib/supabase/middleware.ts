// Supabase middleware for session refresh and auth protection
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/forgot-password', '/verify-email', '/privacy', '/terms', '/', '/auth/callback']

export async function updateSession(request: NextRequest) {
    // Skip Supabase initialization if env vars are not set (allows landing page to work)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired - important for Server Components
    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname

    // Check if current path is public
    const isPublicRoute = publicRoutes.some(route => path === route || path.startsWith('/api/'))

    if (!user && !isPublicRoute) {
        // User is not authenticated and trying to access protected route
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(redirectUrl)
    }

    if (user) {
        // Fetch user role from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single()

        // Role hierarchy: platform_admin > owner > member
        const role = profile?.role || 'member'
        const isAdmin = role === 'owner' || role === 'platform_admin'

        // 1. Redirect authenticated users away from auth pages
        if (path === '/login' || path === '/signup' || path === '/verify-email') {
            return NextResponse.redirect(new URL(isAdmin ? '/dashboard' : '/portal/dashboard', request.url))
        }

        // 2. Root redirect based on role
        if (path === '/') {
            return NextResponse.redirect(new URL(isAdmin ? '/dashboard' : '/portal/dashboard', request.url))
        }

        // 3. Protect admin/owner routes from members
        // Members can only access /portal routes
        if (role === 'member' && !path.startsWith('/portal')) {
            return NextResponse.redirect(new URL('/portal/dashboard', request.url))
        }
    }

    return supabaseResponse
}
