'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, Home, Building2 } from 'lucide-react';

interface PortalHeaderProps {
    companyName: string;
    companyLogo?: string | null;
}

export function PortalHeader({ companyName, companyLogo }: PortalHeaderProps) {
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await fetch('/api/portal/logout', { method: 'POST' });
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
            <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
                <div className="flex items-center gap-6">
                    <Link href="/portal/dashboard" className="flex items-center gap-3">
                        {companyLogo ? (
                            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
                                <Image
                                    src={companyLogo}
                                    alt={companyName}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                        )}
                        <span className="font-semibold text-lg text-slate-900">
                            {companyName}
                        </span>
                    </Link>
                    <nav className="hidden md:flex gap-4 ml-4">
                        <Link
                            href="/portal/dashboard"
                            className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <Home className="h-4 w-4" />
                            Dashboard
                        </Link>
                    </nav>
                </div>
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-slate-600 hover:text-slate-900"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </div>
        </header>
    );
}
