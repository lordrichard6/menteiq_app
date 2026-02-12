/**
 * POST /api/portal/toggle
 * Enable or disable portal access for a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { contactId, enabled } = await request.json();

    // Validate input
    if (!contactId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: contactId, enabled' },
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

    // If enabling portal, generate a portal token if it doesn't exist
    let updateData: any = {
      portal_enabled: enabled,
    };

    if (enabled) {
      // Check if contact already has a portal_token
      const { data: contact } = await supabase
        .from('contacts')
        .select('portal_token')
        .eq('id', contactId)
        .single();

      // If no token exists, generate one using the database function
      if (!contact?.portal_token) {
        const { data: tokenData } = await supabase.rpc('generate_portal_token');
        if (tokenData) {
          updateData.portal_token = tokenData;
        }
      }
    }

    // Update contact
    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update contact:', error);
      return NextResponse.json(
        { error: 'Failed to update portal access' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      portal_enabled: data.portal_enabled,
      portal_token: data.portal_token,
    });
  } catch (error) {
    console.error('Portal toggle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
