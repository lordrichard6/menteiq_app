-- Create function for vector similarity search on document chunks
-- This function is used by the RAG system to find relevant document chunks
-- based on semantic similarity (using pgvector cosine similarity)

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  match_visibility text DEFAULT NULL, -- 'internal', 'shared', or NULL for all
  match_project_id uuid DEFAULT NULL,
  match_contact_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_name text,
  content text,
  chunk_index int,
  similarity float,
  visibility text,
  project_id uuid,
  contact_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    d.name AS document_name,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.visibility::text,
    d.project_id,
    d.contact_id
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    -- Organization filter (required for multi-tenancy)
    d.tenant_id = match_tenant_id

    -- Similarity threshold
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold

    -- Only search complete documents (skip pending/processing/error)
    AND d.embedding_status = 'complete'

    -- Visibility filter (optional)
    AND (match_visibility IS NULL OR d.visibility::text = match_visibility)

    -- Project filter (optional)
    AND (match_project_id IS NULL OR d.project_id = match_project_id)

    -- Contact filter (optional)
    AND (match_contact_id IS NULL OR d.contact_id = match_contact_id)

  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION match_document_chunks IS
'Performs vector similarity search on document chunks using cosine similarity.
Returns the most relevant chunks for a given query embedding.
Filters by organization (required), visibility, project, and contact (optional).
Only searches documents with embedding_status = complete.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_document_chunks TO authenticated;

-- Example usage:
-- SELECT * FROM match_document_chunks(
--   query_embedding := '{0.1, 0.2, ...}'::vector(1536),
--   match_tenant_id := '123e4567-e89b-12d3-a456-426614174000'::uuid,
--   match_threshold := 0.5,
--   match_count := 5,
--   match_visibility := 'internal'
-- );
