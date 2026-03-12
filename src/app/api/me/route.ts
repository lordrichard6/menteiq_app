import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * GET /api/me
 * Returns the current user's profile data including role.
 * Uses service role to bypass RLS — safe because we verify
 * the user's identity via their session cookie first.
 */
export async function GET() {
  try {
    // 1. Verify who the caller is (reads session from cookie)
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch their profile using the service role (bypasses RLS)
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, full_name, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ role: 'member' });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: profile.role,
      full_name: profile.full_name,
      tenant_id: profile.tenant_id,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
