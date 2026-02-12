/**
 * POST /api/portal/invite
 * Send portal invitation email with magic link
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPortalInvitation } from '@/lib/email/resend-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { contactId } = await request.json();

    // Validate input
    if (!contactId) {
      return NextResponse.json(
        { error: 'Missing required field: contactId' },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, email, portal_enabled, portal_token, tenant_id')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify contact has email
    if (!contact.email) {
      return NextResponse.json(
        { error: 'Contact has no email address' },
        { status: 400 }
      );
    }

    // Verify portal is enabled
    if (!contact.portal_enabled) {
      return NextResponse.json(
        { error: 'Portal access not enabled for this contact' },
        { status: 400 }
      );
    }

    // Verify contact has a portal_token
    if (!contact.portal_token) {
      return NextResponse.json(
        { error: 'Contact has no portal token' },
        { status: 400 }
      );
    }

    // Get organization details for company name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', contact.tenant_id)
      .single();

    const companyName = org?.name || 'Your Company';

    // Generate magic link session token (expires in 1 hour)
    const { data: sessionToken } = await supabase.rpc('generate_session_token');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Failed to generate session token' },
        { status: 500 }
      );
    }

    // Create portal session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    const { error: sessionError } = await supabase
      .from('portal_sessions')
      .insert({
        contact_id: contactId,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.ip,
        user_agent: request.headers.get('user-agent') || null,
      });

    if (sessionError) {
      console.error('Failed to create portal session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      );
    }

    // Generate magic link URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLink = `${baseUrl}/portal/auth/${sessionToken}`;

    // Send invitation email
    const emailResult = await sendPortalInvitation({
      to: contact.email,
      contactName: contact.name,
      companyName,
      magicLink,
      expiresInHours: 1,
    });

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    // Update contact's portal_invited_at timestamp
    await supabase
      .from('contacts')
      .update({ portal_invited_at: new Date().toISOString() })
      .eq('id', contactId);

    return NextResponse.json({
      success: true,
      message: 'Portal invitation sent successfully',
      email: contact.email,
    });
  } catch (error) {
    console.error('Portal invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
