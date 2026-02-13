import { createClient } from '@/lib/supabase/server';
import { generateQueryEmbedding } from './embeddings';
import { type DocVisibility } from '@/lib/types/schema';

/**
 * Document Search Result
 */
export interface SearchResult {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  similarity: number;
  chunkIndex: number;
  visibility: DocVisibility;
  projectId: string | null;
  contactId: string | null;
}

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  threshold?: number; // Minimum similarity score (0-1)
  visibility?: DocVisibility | 'all'; // Filter by visibility
  projectId?: string | null; // Filter by project
  contactId?: string | null; // Filter by contact
}

/**
 * Semantic search across document chunks using vector similarity
 * Uses pgvector cosine similarity with OpenAI embeddings
 */
export async function searchDocuments(
  query: string,
  tenantId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = 5,
    threshold = 0.5,
    visibility = 'all',
    projectId,
    contactId,
  } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Generate embedding for query
    const queryEmbedding = await generateQueryEmbedding(query);

    const supabase = await createClient();

    // Build RPC call for vector similarity search
    // This uses a custom Postgres function for efficient similarity search
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_tenant_id: tenantId,
      match_threshold: threshold,
      match_count: limit,
      match_visibility: visibility === 'all' ? null : visibility,
      match_project_id: projectId,
      match_contact_id: contactId,
    });

    if (error) {
      console.error('Vector search error:', error);
      throw new Error('Failed to search documents');
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform results
    const results: SearchResult[] = data.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      documentName: row.document_name,
      content: row.content,
      similarity: row.similarity,
      chunkIndex: row.chunk_index,
      visibility: row.visibility,
      projectId: row.project_id,
      contactId: row.contact_id,
    }));

    return results;
  } catch (error) {
    console.error('Document search error:', error);
    throw error;
  }
}

/**
 * Hybrid search: combines keyword search with vector similarity
 * Better recall than pure vector search
 */
export async function hybridSearch(
  query: string,
  tenantId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 5 } = options;

  try {
    // Run both searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      searchDocuments(query, tenantId, { ...options, limit: limit * 2 }),
      keywordSearchDocuments(query, tenantId, options),
    ]);

    // Combine and deduplicate results
    const resultMap = new Map<string, SearchResult>();

    // Add vector results (higher priority)
    for (const result of vectorResults) {
      resultMap.set(result.id, result);
    }

    // Add keyword results (fill gaps)
    for (const result of keywordResults) {
      if (!resultMap.has(result.id)) {
        resultMap.set(result.id, result);
      }
    }

    // Sort by similarity and limit
    const combined = Array.from(resultMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return combined;
  } catch (error) {
    console.error('Hybrid search error:', error);
    throw error;
  }
}

/**
 * Keyword-based search using PostgreSQL full-text search
 * Faster but less semantic than vector search
 */
export async function keywordSearchDocuments(
  query: string,
  tenantId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = 5,
    visibility = 'all',
    projectId,
    contactId,
  } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const supabase = await createClient();

    // Build query
    let queryBuilder = supabase
      .from('document_chunks')
      .select(`
        id,
        document_id,
        content,
        chunk_index,
        documents!inner (
          id,
          name,
          visibility,
          project_id,
          contact_id,
          tenant_id
        )
      `)
      .eq('documents.tenant_id', tenantId)
      .textSearch('content', query, {
        type: 'websearch',
        config: 'english',
      })
      .limit(limit);

    // Apply filters
    if (visibility !== 'all') {
      queryBuilder = queryBuilder.eq('documents.visibility', visibility);
    }

    if (projectId) {
      queryBuilder = queryBuilder.eq('documents.project_id', projectId);
    }

    if (contactId) {
      queryBuilder = queryBuilder.eq('documents.contact_id', contactId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Keyword search error:', error);
      throw new Error('Failed to search documents');
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform results (similarity = 0.75 as approximate value for keyword matches)
    const results: SearchResult[] = data.map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      documentName: row.documents.name,
      content: row.content,
      similarity: 0.75, // Approximate score for keyword matches
      chunkIndex: row.chunk_index,
      visibility: row.documents.visibility,
      projectId: row.documents.project_id,
      contactId: row.documents.contact_id,
    }));

    return results;
  } catch (error) {
    console.error('Keyword search error:', error);
    throw error;
  }
}

/**
 * Get related chunks from the same document
 * Useful for providing context around a search result
 */
export async function getRelatedChunks(
  documentId: string,
  chunkIndex: number,
  contextWindow = 2
): Promise<{ content: string; index: number }[]> {
  try {
    const supabase = await createClient();

    const startIndex = Math.max(0, chunkIndex - contextWindow);
    const endIndex = chunkIndex + contextWindow;

    const { data, error } = await supabase
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', documentId)
      .gte('chunk_index', startIndex)
      .lte('chunk_index', endIndex)
      .order('chunk_index', { ascending: true });

    if (error) {
      console.error('Error fetching related chunks:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      content: row.content,
      index: row.chunk_index,
    }));
  } catch (error) {
    console.error('Get related chunks error:', error);
    return [];
  }
}
