// pdf-parse v1.1.1 — uses CJS default export; require() avoids Turbopack ESM issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import { createClient } from '@/lib/supabase/server';

/**
 * Text Extraction
 * Extract text content from different file types
 */

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

export async function extractTextFromTXT(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}

export async function extractTextFromMarkdown(buffer: Buffer): Promise<string> {
  // For now, treat markdown as plain text
  // In the future, could strip markdown syntax or convert to plain text
  return buffer.toString('utf-8');
}

/**
 * Extract text from any supported file type
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return extractTextFromPDF(buffer);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractTextFromDOCX(buffer);
    case 'text/plain':
      return extractTextFromTXT(buffer);
    case 'text/markdown':
      return extractTextFromMarkdown(buffer);
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Document Chunking
 * Split text into overlapping chunks for better context retrieval
 */

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separator?: string;
}

export interface DocumentChunk {
  content: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    length: number;
  };
}

/**
 * Recursive character text splitter
 * Tries to split on sentence boundaries, then words, then characters
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): DocumentChunk[] {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    separator = '\n\n',
  } = options;

  const chunks: DocumentChunk[] = [];

  // Clean text (remove excessive whitespace)
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleanedText.length === 0) {
    return chunks;
  }

  // Simple recursive splitting
  const separators = [
    separator,       // Paragraphs
    '\n',           // Lines
    '. ',           // Sentences
    '! ',
    '? ',
    ', ',           // Clauses
    ' ',            // Words
    '',             // Characters
  ];

  let currentChunks = [cleanedText];

  for (const sep of separators) {
    const newChunks: string[] = [];
    let shouldContinue = false;

    for (const chunk of currentChunks) {
      if (chunk.length > chunkSize) {
        // Split this chunk
        if (sep === '') {
          // Character-level split (last resort)
          newChunks.push(...splitByLength(chunk, chunkSize, chunkOverlap));
        } else {
          // Split by separator
          const splits = chunk.split(sep);
          let currentGroup = '';

          for (const split of splits) {
            const testGroup = currentGroup
              ? currentGroup + sep + split
              : split;

            if (testGroup.length <= chunkSize) {
              currentGroup = testGroup;
            } else {
              if (currentGroup) {
                newChunks.push(currentGroup);
              }
              currentGroup = split;
            }
          }

          if (currentGroup) {
            newChunks.push(currentGroup);
          }
        }
        shouldContinue = true;
      } else {
        newChunks.push(chunk);
      }
    }

    currentChunks = newChunks;

    if (!shouldContinue) {
      break;
    }
  }

  // Create chunks with overlap
  const finalChunks: DocumentChunk[] = [];
  let charPosition = 0;

  for (let i = 0; i < currentChunks.length; i++) {
    const content = currentChunks[i].trim();

    if (content.length === 0) continue;

    finalChunks.push({
      content,
      index: finalChunks.length,
      metadata: {
        startChar: charPosition,
        endChar: charPosition + content.length,
        length: content.length,
      },
    });

    charPosition += content.length;

    // Add overlap for next chunk (if not last chunk)
    if (i < currentChunks.length - 1 && chunkOverlap > 0) {
      const overlapText = content.slice(-chunkOverlap);
      currentChunks[i + 1] = overlapText + ' ' + currentChunks[i + 1];
    }
  }

  return finalChunks;
}

/**
 * Split text by fixed length (fallback for very long strings)
 */
function splitByLength(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }

  return chunks;
}

/**
 * Process entire document: extract text and chunk it
 */
export async function processDocument(
  documentId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{
  text: string;
  chunks: DocumentChunk[];
  summary: string;
}> {
  // Extract text
  const text = await extractText(buffer, mimeType);

  if (!text || text.trim().length === 0) {
    throw new Error('No text content found in document');
  }

  // Chunk text
  const chunks = chunkText(text, {
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  if (chunks.length === 0) {
    throw new Error('Failed to chunk document');
  }

  // Generate summary (first 500 chars as basic summary)
  const summary = text.slice(0, 500) + (text.length > 500 ? '...' : '');

  return {
    text,
    chunks,
    summary,
  };
}

/**
 * Update document status in database
 */
export async function updateDocumentStatus(
  documentId: string,
  status: 'pending' | 'processing' | 'complete' | 'error',
  summary?: string
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    embedding_status: status,
  };

  if (summary) {
    updateData.content_summary = summary;
  }

  const { error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', documentId);

  if (error) {
    console.error('Failed to update document status:', error);
    throw error;
  }
}
