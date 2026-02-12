/**
 * GET /api/portal/verify?token=xxx
 * Verify if a portal session token is valid
 * Used for debugging and frontend validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        { status: 400 }
      );
    }

    // Use the database function to verify the session
    const { data, error } = await supabase.rpc('verify_portal_session', {
      session_token: token,
    });

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired token',
        },
        { status: 404 }
      );
    }

    const session = data[0];

    return NextResponse.json({
      valid: session.is_valid,
      contact_id: session.contact_id,
      contact_name: session.contact_name,
      contact_email: session.contact_email,
    });
  } catch (error) {
    console.error('Portal verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
