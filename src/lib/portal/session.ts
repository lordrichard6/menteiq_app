/**
 * Portal Session Management
 * Helpers for managing client portal authentication sessions
 */

import { cookies } from 'next/headers';

export interface PortalSession {
  contact_id: string;
  contact_email: string;
  contact_name: string;
  tenant_id: string;
  authenticated_at: string;
}

/**
 * Get the current portal session from cookies
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('portal_session');

    if (!sessionCookie) {
      return null;
    }

    const session = JSON.parse(sessionCookie.value) as PortalSession;

    // Verify session has required fields
    if (
      !session.contact_id ||
      !session.contact_email ||
      !session.tenant_id
    ) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to parse portal session:', error);
    return null;
  }
}

/**
 * Clear the portal session (logout)
 */
export async function clearPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('portal_session');
}

/**
 * Check if user is authenticated for portal access
 */
export async function isPortalAuthenticated(): Promise<boolean> {
  const session = await getPortalSession();
  return session !== null;
}

/**
 * Require portal authentication (throws if not authenticated)
 * Use this in portal pages to protect them
 */
export async function requirePortalAuth(): Promise<PortalSession> {
  const session = await getPortalSession();

  if (!session) {
    throw new Error('Portal authentication required');
  }

  return session;
}
