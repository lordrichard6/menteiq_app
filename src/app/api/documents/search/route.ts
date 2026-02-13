import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchDocuments, hybridSearch, keywordSearchDocuments } from '@/lib/ai/document-search';
import { type DocVisibility } from '@/lib/types/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Search documents using semantic similarity
 * GET /api/documents/search?q=query&method=vector&limit=5
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const method = searchParams.get('method') || 'hybrid'; // 'vector', 'keyword', or 'hybrid'
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const threshold = parseFloat(searchParams.get('threshold') || '0.5');
    const visibility = (searchParams.get('visibility') || 'all') as DocVisibility | 'all';
    const projectId = searchParams.get('projectId');
    const contactId = searchParams.get('contactId');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
    }

    const options = {
      limit,
      threshold,
      visibility,
      projectId: projectId || undefined,
      contactId: contactId || undefined,
    };

    let results;

    switch (method) {
      case 'vector':
        results = await searchDocuments(query, profile.tenant_id, options);
        break;
      case 'keyword':
        results = await keywordSearchDocuments(query, profile.tenant_id, options);
        break;
      case 'hybrid':
      default:
        results = await hybridSearch(query, profile.tenant_id, options);
        break;
    }

    return NextResponse.json({
      query,
      method,
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for more complex search queries
 * POST /api/documents/search
 * Body: { query, method, filters: { visibility, projectId, contactId }, limit, threshold }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const {
      query,
      method = 'hybrid',
      filters = {},
      limit = 5,
      threshold = 0.5,
    } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const options = {
      limit,
      threshold,
      visibility: filters.visibility || 'all',
      projectId: filters.projectId,
      contactId: filters.contactId,
    };

    let results;

    switch (method) {
      case 'vector':
        results = await searchDocuments(query, profile.tenant_id, options);
        break;
      case 'keyword':
        results = await keywordSearchDocuments(query, profile.tenant_id, options);
        break;
      case 'hybrid':
      default:
        results = await hybridSearch(query, profile.tenant_id, options);
        break;
    }

    return NextResponse.json({
      query,
      method,
      filters,
      results,
      count: results.length,
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
