import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processDocument, updateDocumentStatus } from '@/lib/ai/document-processor';
import { generateEmbeddings } from '@/lib/ai/embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for document processing

/**
 * Process a document: extract text, chunk, and generate embeddings
 * POST /api/documents/process
 * Body: { documentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document ID from request
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Fetch document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document belongs to user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.tenant_id !== document.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update status to processing
    await updateDocumentStatus(documentId, 'processing');

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (downloadError || !fileData) {
        throw new Error('Failed to download file from storage');
      }

      // Convert to Buffer
      const buffer = Buffer.from(await fileData.arrayBuffer());

      // Process document (extract text and chunk)
      const { chunks, summary } = await processDocument(
        documentId,
        buffer,
        document.file_type || 'application/pdf'
      );

      // chunks.length chunks created for documentId

      // Generate embeddings for all chunks (batch)
      const chunkTexts = chunks.map(c => c.content);
      const { embeddings, totalTokens } = await generateEmbeddings(chunkTexts);

      // embeddings.length embeddings generated using totalTokens tokens

      // Store chunks with embeddings in database
      const chunkRecords = chunks.map((chunk, index) => ({
        document_id: documentId,
        chunk_index: index,
        content: chunk.content,
        embedding: embeddings[index],
      }));

      // Insert in batches (Supabase has row limit per request)
      const BATCH_SIZE = 100;
      for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
        const batch = chunkRecords.slice(i, i + BATCH_SIZE);

        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert(batch);

        if (insertError) {
          console.error('Failed to insert chunk batch:', insertError);
          throw new Error('Failed to store document chunks');
        }
      }

      // Update document status to complete with summary
      await updateDocumentStatus(documentId, 'complete', summary);

      // Log token usage for billing
      await supabase.from('token_usage').insert([
        {
          tenant_id: document.tenant_id,
          user_id: user.id,
          model: 'text-embedding-3-small',
          tokens_in: totalTokens,
          tokens_out: 0,
          multiplier: 1,
          effective_tokens: totalTokens,
          conversation_id: null,
        },
      ]);

      return NextResponse.json({
        success: true,
        documentId,
        chunksCreated: chunks.length,
        tokensUsed: totalTokens,
        summary: summary.slice(0, 200),
      });

    } catch (processingError) {
      // Update status to error
      await updateDocumentStatus(documentId, 'error');

      console.error('Document processing error:', processingError);

      return NextResponse.json(
        {
          error: processingError instanceof Error
            ? processingError.message
            : 'Failed to process document',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get processing status for a document
 * GET /api/documents/process?documentId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, name, embedding_status, content_summary, created_at')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get chunk count
    const { count } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    return NextResponse.json({
      documentId: document.id,
      name: document.name,
      status: document.embedding_status,
      summary: document.content_summary,
      chunksCount: count || 0,
      createdAt: document.created_at,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
