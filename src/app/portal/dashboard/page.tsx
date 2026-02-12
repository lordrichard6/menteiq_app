/**
 * Client Portal Dashboard
 * Authenticated view for clients to access their invoices, documents, and projects
 */

import { redirect } from 'next/navigation';
import { requirePortalAuth } from '@/lib/portal/session';
import { createClient } from '@/lib/supabase/server';
import { PortalDashboardClient } from './portal-dashboard-client';

export default async function PortalDashboard() {
  // Require authentication - redirect if not authenticated
  let session;
  try {
    session = await requirePortalAuth();
  } catch {
    redirect('/portal/login');
  }

  const supabase = await createClient();

  // Fetch client data
  const [invoicesRes, docsRes, projectsRes] = await Promise.all([
    // Get invoices for this contact
    supabase
      .from('invoices')
      .select('*')
      .eq('contact_id', session.contact_id)
      .order('created_at', { ascending: false }),

    // Get shared documents
    supabase
      .from('documents')
      .select('*')
      .eq('contact_id', session.contact_id)
      .eq('visibility', 'shared')
      .order('created_at', { ascending: false }),

    // Get projects
    supabase
      .from('projects')
      .select('*')
      .eq('contact_id', session.contact_id)
      .order('created_at', { ascending: false }),
  ]);

  const invoices = invoicesRes.data || [];
  const documents = docsRes.data || [];
  const projects = projectsRes.data || [];

  return (
    <PortalDashboardClient
      session={session}
      invoices={invoices}
      documents={documents}
      projects={projects}
    />
  );
}
