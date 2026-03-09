import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-50">
            <AdminSidebar />

            {/* Main content - Adjusted for mobile header (pt-16) and desktop sidebar (md:pl-64) */}
            <main id="main-content" className="md:pl-28 min-h-screen pt-16 md:pt-0 p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    )
}
