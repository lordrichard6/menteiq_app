
import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
    // embedDocument is not yet implemented in RagService
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
