/**
 * POST /api/portal/logout
 * Clear portal session and log out client
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('portal_session');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portal logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
