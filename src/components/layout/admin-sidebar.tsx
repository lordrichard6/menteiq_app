'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu, LayoutDashboard, Users, FolderKanban, CheckSquare,
  MessageSquare, FileText, Receipt, Settings, LogOut,
  Activity, HelpCircle, PanelLeft, PanelLeftClose,
} from 'lucide-react';
import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/contacts",  icon: Users,          label: "Contacts"  },
  { href: "/projects",  icon: FolderKanban,   label: "Projects"  },
  { href: "/invoices",  icon: Receipt,        label: "Invoices"  },
  { href: "/tasks",     icon: CheckSquare,    label: "Tasks"     },
  { href: "/documents", icon: FileText,       label: "Vault"     },
  { href: "/chat",      icon: MessageSquare,  label: "Mente AI"  },
  { href: "/activity",  icon: Activity,       label: "Activity"  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name?: string, email?: string): string {
  if (name?.trim()) {
    return name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

function linkClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-sm",
    active
      ? "bg-white/10 text-white font-medium"
      : "text-white/75 hover:bg-white/10 hover:text-white"
  );
}

// ─── Sub-components (defined at module level to satisfy React Compiler) ──────

interface NavItemsProps {
  pathname: string;
  onNavigate?: () => void;
}

function NavItems({ pathname, onNavigate }: NavItemsProps) {
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        aria-current={isActive('/dashboard', true) ? 'page' : undefined}
        className={linkClass(isActive('/dashboard', true))}
      >
        <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>Dashboard</span>
      </Link>
      {NAV_LINKS.map(l => (
        <Link
          key={l.href}
          href={l.href}
          onClick={onNavigate}
          aria-current={isActive(l.href) ? 'page' : undefined}
          className={linkClass(isActive(l.href))}
        >
          <l.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{l.label}</span>
        </Link>
      ))}
    </>
  );
}

interface UserProfileCardProps {
  name?: string;
  email?: string;
}

function UserProfileCard({ name, email }: UserProfileCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 overflow-hidden">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
          {getInitials(name, email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-white text-sm font-medium truncate leading-tight">
          {name || email?.split('@')[0] || '\u2014'}
        </p>
        <p className="text-white/50 text-xs truncate leading-tight">
          {email || ''}
        </p>
      </div>
    </div>
  );
}

interface LogoutDialogProps {
  isLoggingOut: boolean;
  onLogout: () => void;
  labelAlwaysVisible: boolean;
}

function LogoutDialog({ isLoggingOut, onLogout, labelAlwaysVisible }: LogoutDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={isLoggingOut}
          aria-label="Logout"
          className="w-full flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          <LogOut className="h-5 w-5 min-w-[20px]" aria-hidden="true" />
          <span className={cn(
            "whitespace-nowrap transition-opacity duration-300",
            labelAlwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {isLoggingOut ? 'Logging out\u2026' : 'Logout'}
          </span>
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
          <AlertDialogAction onClick={onLogout} variant="destructive">
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [user, setUser] = React.useState<{ name?: string; email?: string } | null>(null);

  // Restore pinned state from localStorage on mount
  React.useEffect(() => {
    if (localStorage.getItem('menteiq-sidebar-pinned') === 'true') {
      setPinned(true);
    }
  }, []);

  // Fetch authenticated user
  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
          email: authUser.email,
        });
      }
    };
    fetchUser();
  }, []);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem('menteiq-sidebar-pinned', String(next));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      localStorage.removeItem('menteiq-contacts');
      localStorage.removeItem('menteiq-projects');
      localStorage.removeItem('menteiq-tasks');
      localStorage.removeItem('menteiq-chat');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const textVisible = (alwaysOn: boolean) =>
    cn(
      "whitespace-nowrap transition-opacity duration-300",
      alwaysOn ? "opacity-100" : "opacity-0 group-hover:opacity-100"
    );

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside
        aria-label="Main navigation"
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 bg-[#3D4A67] transition-all duration-300 ease-in-out flex-col z-50 overflow-hidden shadow-xl",
          pinned ? "w-64" : "w-20 hover:w-64 group"
        )}
      >
        {/* Inner wrapper fixed at w-64 so content doesn't squash during transition */}
        <div className="flex flex-col h-full w-64">

          {/* Logo */}
          <div className="h-16 flex items-center pl-6 shrink-0 overflow-hidden">
            <Image
              src="/menteiq_logo_white.svg"
              alt="MenteIQ"
              width={90}
              height={30}
              priority
              className={cn(
                "transition-opacity duration-300",
                pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            />
          </div>

          {/* User profile */}
          <div className={cn(
            "mx-3 mb-3 transition-opacity duration-300",
            pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <UserProfileCard name={user?.name} email={user?.email} />
          </div>

          {/* Main nav */}
          <nav
            role="navigation"
            aria-label="Main menu"
            className="space-y-0.5 flex-1 px-3 overflow-y-auto"
          >
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              aria-current={isActive('/dashboard', true) ? 'page' : undefined}
              className={cn(
                "flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors text-sm",
                isActive('/dashboard', true)
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <LayoutDashboard className="h-5 w-5 min-w-[20px]" aria-hidden="true" />
              <span className={textVisible(pinned)}>Dashboard</span>
            </Link>

            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                aria-label={l.label}
                aria-current={isActive(l.href) ? 'page' : undefined}
                className={cn(
                  "flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors text-sm",
                  isActive(l.href)
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <l.icon className="h-5 w-5 min-w-[20px]" aria-hidden="true" />
                <span className={textVisible(pinned)}>{l.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="mt-auto mb-4 px-3 space-y-0.5 shrink-0">

            {/* Settings */}
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={isActive('/settings') ? 'page' : undefined}
              className={cn(
                "flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors text-sm",
                isActive('/settings')
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <Settings className="h-5 w-5 min-w-[20px]" aria-hidden="true" />
              <span className={textVisible(pinned)}>Settings</span>
            </Link>

            {/* Help */}
            <a
              href="mailto:support@menteiq.ch"
              aria-label="Help and Support"
              className="flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors"
            >
              <HelpCircle className="h-5 w-5 min-w-[20px]" aria-hidden="true" />
              <span className={textVisible(pinned)}>Help &amp; Support</span>
            </a>

            {/* Pin / Unpin */}
            <button
              onClick={togglePin}
              aria-label={pinned ? "Collapse sidebar" : "Pin sidebar open"}
              title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
              className="w-full flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors"
            >
              {pinned
                ? <PanelLeftClose className="h-5 w-5 min-w-[20px]" aria-hidden="true" />
                : <PanelLeft      className="h-5 w-5 min-w-[20px]" aria-hidden="true" />
              }
              <span className={textVisible(pinned)}>
                {pinned ? "Collapse sidebar" : "Pin sidebar"}
              </span>
            </button>

            {/* Logout */}
            <LogoutDialog
              isLoggingOut={isLoggingOut}
              onLogout={handleLogout}
              labelAlwaysVisible={pinned}
            />
          </div>
        </div>
      </aside>

      {/* ── Mobile Header ───────────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#3D4A67] flex items-center px-4 z-40 shadow-md">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </Button>
          </SheetTrigger>

          <SheetContent aria-label="Navigation menu">
            <div className="flex flex-col h-full pt-14 pb-6 px-4">

              {/* User profile */}
              <div className="mb-5">
                <UserProfileCard name={user?.name} email={user?.email} />
              </div>

              {/* Nav */}
              <nav role="navigation" aria-label="Main menu" className="flex-1 space-y-0.5">
                <NavItems pathname={pathname} onNavigate={closeMobile} />
              </nav>

              {/* Bottom */}
              <div className="space-y-0.5 mt-4 border-t border-white/10 pt-4">
                <Link
                  href="/settings"
                  onClick={closeMobile}
                  aria-current={isActive('/settings') ? 'page' : undefined}
                  className={linkClass(isActive('/settings'))}
                >
                  <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Settings
                </Link>
                <a
                  href="mailto:support@menteiq.ch"
                  className={linkClass(false)}
                >
                  <HelpCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Help &amp; Support
                </a>

                {/* Mobile logout */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={isLoggingOut}
                      className={cn(linkClass(false), "w-full")}
                    >
                      <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {isLoggingOut ? 'Logging out\u2026' : 'Logout'}
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
          </SheetContent>
        </Sheet>

        <Image
          src="/menteiq_logo_white.svg"
          alt="MenteIQ"
          width={90}
          height={28}
          priority
          className="ml-4"
        />
      </div>
    </>
  );
}
