/**
 * Portal Magic Link Authentication
 * Route: /portal/auth/[token]
 *
 * This page handles magic link authentication for client portal access:
 * 1. Verifies the session token
 * 2. Creates a secure session cookie
 * 3. Marks the session as used
 * 4. Updates last_portal_login timestamp
 * 5. Redirects to portal dashboard
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

interface PortalAuthPageProps {
  params: {
    token: string;
  };
}

export default async function PortalAuthPage({
  params,
}: PortalAuthPageProps) {
  const supabase = await createClient();
  const { token } = params;

  try {
    // Verify the portal session token
    const { data, error } = await supabase.rpc('verify_portal_session', {
      session_token: token,
    });

    if (error || !data || data.length === 0) {
      // Invalid or expired token
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Invalid or Expired Link
              </h1>
              <p className="text-slate-600 mb-6">
                This portal access link is invalid or has expired. Portal links
                expire after 1 hour and can only be used once.
              </p>
              <p className="text-sm text-slate-500">
                Please contact your service provider for a new invitation.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const session = data[0];

    // Check if token is still valid (not expired and not used)
    if (!session.is_valid) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Link Expired
              </h1>
              <p className="text-slate-600 mb-6">
                This portal access link has expired or has already been used.
                Portal links can only be used once for security.
              </p>
              <p className="text-sm text-slate-500">
                Please request a new invitation from your service provider.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Mark session as used
    const { error: updateError } = await supabase
      .from('portal_sessions')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (updateError) {
      console.error('Failed to mark session as used:', updateError);
    }

    // Update last_portal_login timestamp
    const { error: loginError } = await supabase
      .from('contacts')
      .update({ last_portal_login: new Date().toISOString() })
      .eq('id', session.contact_id);

    if (loginError) {
      console.error('Failed to update last_portal_login:', loginError);
    }

    // Create secure session cookie
    const cookieStore = await cookies();
    const sessionData = {
      contact_id: session.contact_id,
      contact_email: session.contact_email,
      contact_name: session.contact_name,
      tenant_id: session.tenant_id,
      authenticated_at: new Date().toISOString(),
    };

    cookieStore.set('portal_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/portal',
    });

    // Redirect to portal dashboard
    redirect('/portal/dashboard');
  } catch (error) {
    console.error('Portal auth error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Something Went Wrong
            </h1>
            <p className="text-slate-600 mb-6">
              We encountered an error while processing your portal access.
            </p>
            <p className="text-sm text-slate-500">
              Please try again or contact support if the problem persists.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
