import { PortalHeader } from "@/components/layout/portal-header";
import { getPortalSession } from "@/lib/portal/session";
import { createClient } from "@/lib/supabase/server";

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Get portal session to fetch organization data
    let orgName = "Client Portal";
    let orgLogo = null;

    try {
        const session = await getPortalSession();
        if (session) {
            const supabase = await createClient();
            const { data: org } = await supabase
                .from('organizations')
                .select('name, settings')
                .eq('id', session.tenant_id)
                .single();

            if (org) {
                orgName = org.name || "Client Portal";
                orgLogo = (org.settings as any)?.logo_url || null;
            }
        }
    } catch {
        // If not authenticated, just use defaults
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PortalHeader companyName={orgName} companyLogo={orgLogo} />
            <main>
                {children}
            </main>
            <footer className="border-t bg-white mt-16">
                <div className="container px-4 sm:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-slate-600">
                            © {new Date().getFullYear()} {orgName}. All rights reserved.
                        </p>
                        <p className="text-xs text-slate-500">
                            Powered by MenteIQ
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
