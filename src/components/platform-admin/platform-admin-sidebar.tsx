'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    LayoutDashboard,
    Building2,
    Users,
    LogOut,
    Menu,
    ArrowLeft,
    ShieldCheck,
    ClipboardList,
    CreditCard,
} from 'lucide-react'
import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ─── Constants ──────────────────────────────────────────────────────────────

const NAV_LINKS = [
    { href: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
    { href: '/admin/organizations', icon: Building2, label: 'Organizations', exact: false },
    { href: '/admin/users', icon: Users, label: 'Users', exact: false },
    { href: '/admin/billing', icon: CreditCard, label: 'Billing', exact: false },
    { href: '/admin/audit-log', icon: ClipboardList, label: 'Audit Log', exact: false },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function linkClass(active: boolean) {
    return cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-sm',
        active
            ? 'bg-white/10 text-white font-medium'
            : 'text-white/75 hover:bg-white/10 hover:text-white'
    )
}

// ─── Nav Content ─────────────────────────────────────────────────────────────

interface NavContentProps {
    pathname: string
    onClose: () => void
}

function NavContent({ pathname, onClose }: NavContentProps) {
    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href)

    return (
        <>
            {NAV_LINKS.map((l) => (
                <Link
                    key={l.href}
                    href={l.href}
                    onClick={onClose}
                    aria-current={isActive(l.href, l.exact) ? 'page' : undefined}
                    className={linkClass(isActive(l.href, l.exact))}
                >
                    <l.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{l.label}</span>
                </Link>
            ))}
        </>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PlatformAdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileOpen, setMobileOpen] = React.useState(false)
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)
    const [userEmail, setUserEmail] = React.useState<string | null>(null)

    React.useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserEmail(user.email ?? null)
        }
        fetchUser()
    }, [])

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
        } catch {
            setIsLoggingOut(false)
        }
    }

    const closeMobile = () => setMobileOpen(false)

    return (
        <>
            {/* ── Desktop Sidebar ────────────────────────────────────────── */}
            <aside
                aria-label="Platform admin navigation"
                className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-[#2C3547] flex-col z-50 shadow-xl"
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="h-16 flex items-center px-5 shrink-0 border-b border-white/10">
                        <Image
                            src="/menteiq_logo_white.svg"
                            alt="MenteIQ"
                            width={90}
                            height={28}
                            priority
                        />
                        <span className="ml-3 text-xs font-semibold bg-white/10 text-white/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Platform Admin
                        </span>
                    </div>

                    {/* Admin badge */}
                    <div className="mx-4 mt-4 mb-2 flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-xs text-white/70 truncate">{userEmail ?? 'Admin'}</span>
                    </div>

                    {/* Navigation */}
                    <nav
                        role="navigation"
                        aria-label="Admin menu"
                        className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto"
                    >
                        <NavContent pathname={pathname} onClose={closeMobile} />
                    </nav>

                    {/* Bottom section */}
                    <div className="mt-auto mb-4 px-3 space-y-0.5 shrink-0 border-t border-white/10 pt-4">
                        {/* Back to App */}
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 shrink-0" />
                            <span>Back to App</span>
                        </Link>

                        {/* Logout */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button
                                    disabled={isLoggingOut}
                                    aria-label="Logout"
                                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <LogOut className="h-5 w-5 shrink-0" />
                                    <span>{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent size="sm">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Log out?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You&apos;ll need to sign in again to access MenteIQ.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleLogout} variant="destructive">
                                        Log out
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </aside>

            {/* ── Mobile Header ──────────────────────────────────────────── */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#2C3547] flex items-center px-4 z-40 shadow-md">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 hover:text-white"
                            aria-label="Open admin navigation"
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent aria-label="Admin navigation">
                        <div className="flex flex-col h-full pt-14 pb-6 px-4">
                            <div className="flex items-center gap-2 mb-5 bg-white/5 rounded-lg px-3 py-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span className="text-xs text-white/70 truncate">{userEmail ?? 'Admin'}</span>
                            </div>
                            <nav role="navigation" aria-label="Admin menu" className="flex-1 space-y-0.5">
                                <NavContent pathname={pathname} onClose={closeMobile} />
                            </nav>
                            <div className="space-y-0.5 mt-4 border-t border-white/10 pt-4">
                                <Link href="/dashboard" onClick={closeMobile} className={linkClass(false)}>
                                    <ArrowLeft className="h-5 w-5 shrink-0" />
                                    Back to App
                                </Link>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="ml-3 flex items-center gap-2">
                    <Image src="/menteiq_logo_white.svg" alt="MenteIQ" width={80} height={24} priority />
                    <span className="text-xs font-semibold bg-white/10 text-white/80 px-2 py-0.5 rounded-full">
                        Admin
                    </span>
                </div>
            </div>
        </>
    )
}
