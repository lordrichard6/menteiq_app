import { PlatformAdminSidebar } from '@/components/platform-admin/platform-admin-sidebar'

export const metadata = {
    title: 'Platform Admin — MenteIQ',
}

export default function PlatformAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-50">
            <PlatformAdminSidebar />
            <main className="md:pl-64 min-h-screen pt-16 md:pt-0 p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    )
}
