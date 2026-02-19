'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Menu, LayoutDashboard, Users, FolderKanban, CheckSquare, MessageSquare, FileText, Receipt, Settings, LogOut } from 'lucide-react';
import * as React from "react";
import { createClient } from "@/lib/supabase/client";

const links = [
    { href: "/contacts", icon: Users, label: "Contacts" },
    { href: "/projects", icon: FolderKanban, label: "Projects" },
    { href: "/invoices", icon: Receipt, label: "Invoices" },
    { href: "/tasks", icon: CheckSquare, label: "Tasks" },
    { href: "/documents", icon: FileText, label: "Vault" },
    { href: "/chat", icon: MessageSquare, label: "Mente AI" },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            // Clear any localStorage data
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

    const NavContent = () => (
        <div className="flex flex-col h-full">
            <div className="mb-8 pl-4">
                <h1 className="text-xl font-bold text-white">MenteIQ</h1>
            </div>
            <nav className="space-y-1 flex-1">
                <Link href="/dashboard"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${pathname === '/dashboard' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                </Link>
                {links.map(l => (
                    <Link key={l.href} href={l.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${pathname.startsWith(l.href) ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                        <l.icon className="h-5 w-5" />
                        {l.label}
                    </Link>
                ))}
            </nav>
            <div className="mt-auto space-y-1">
                <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                    <Settings className="h-5 w-5" />
                    Settings
                </Link>
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full justify-start gap-3 text-white/80 hover:bg-white/10 hover:text-white"
                >
                    <LogOut className="h-5 w-5" />
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar - Hover Expand */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-20 hover:w-64 bg-[#3D4A67] transition-all duration-300 ease-in-out flex-col z-50 overflow-hidden group shadow-xl">
                <div className="flex flex-col h-full w-64">
                    {/* Fixed width container inside to prevent text squashing during transition */}
                    <div className="mb-8 pl-6 h-16 flex items-center">
                        <h1 className="text-xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">MenteIQ</h1>
                    </div>
                    <nav className="space-y-1 flex-1 px-3">
                        <Link href="/dashboard"
                            className={`flex items-center gap-4 rounded-lg px-3 py-3 transition-colors ${pathname === '/dashboard' ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                            <LayoutDashboard className="h-6 w-6 min-w-[24px]" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Dashboard</span>
                        </Link>
                        {links.map(l => (
                            <Link key={l.href} href={l.href}
                                className={`flex items-center gap-4 rounded-lg px-3 py-3 transition-colors ${pathname.startsWith(l.href) ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                                <l.icon className="h-6 w-6 min-w-[24px]" />
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{l.label}</span>
                            </Link>
                        ))}
                    </nav>
                    <div className="mt-auto space-y-1 mb-8 px-3">
                        <Link href="/settings" className="flex items-center gap-4 rounded-lg px-3 py-3 text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                            <Settings className="h-6 w-6 min-w-[24px]" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Settings</span>
                        </Link>
                        <Button
                            variant="ghost"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full justify-start gap-4 px-3 py-3 h-auto text-white/80 hover:bg-white/10 hover:text-white"
                        >
                            <LogOut className="h-6 w-6 min-w-[24px]" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </span>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#3D4A67] flex items-center px-4 z-40">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </DialogTrigger>
                    {/* Using Dialog as a rough mobile drawer replacement since Sheet is missing */}
                    <DialogContent className="bg-[#3D4A67] border-0 text-white h-full sm:max-w-xs absolute left-0 top-0 bottom-0 rounded-none data-[state=open]:slide-in-from-left-1/2">
                        <NavContent />
                    </DialogContent>
                </Dialog>
                <span className="ml-4 font-bold text-white">MenteIQ</span>
            </div>
        </>
    );
}
