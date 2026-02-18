/**
 * GET /api/portal/documents/[id]/download
 * Download document from client portal
 * Uses portal session authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: documentId } = await params;

    // Get portal session (verify client is authenticated)
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Portal session required' },
        { status: 401 }
      );
    }

    // Fetch document metadata
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Security checks:
    // 1. Document must belong to this portal contact
    if (document.contact_id !== session.contact_id) {
      return NextResponse.json(
        { error: 'Unauthorized - This document does not belong to you' },
        { status: 403 }
      );
    }

    // 2. Document must be marked as shared
    if (document.visibility !== 'shared') {
      return NextResponse.json(
        { error: 'This document is not shared with you' },
        { status: 403 }
      );
    }

    // Get document from Supabase Storage
    if (!document.storage_path) {
      return NextResponse.json(
        { error: 'Document file not found' },
        { status: 404 }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download document' },
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer();

    // Determine content type from file extension or stored metadata
    const contentType = document.mime_type || 'application/octet-stream';

    // Return file
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${document.name}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Portal document download error:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
}
