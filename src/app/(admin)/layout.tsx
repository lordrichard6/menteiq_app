import type { Metadata } from "next";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

// Authenticated app routes must never be indexed by search engines.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            <AdminSidebar />

            {/* Main content - Adjusted for mobile header (pt-16) and desktop sidebar (md:pl-64) */}
            <main id="main-content" className="md:pl-28 min-h-screen pt-16 md:pt-0 p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    )
}
