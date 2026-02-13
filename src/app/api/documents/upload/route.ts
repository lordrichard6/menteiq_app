import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type DocVisibility } from '@/lib/types/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const visibility = (formData.get('visibility') as DocVisibility) || 'internal';
    const projectId = formData.get('project_id') as string | null;
    const contactId = formData.get('contact_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, TXT, MD, DOCX' },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${profile.tenant_id}/${timestamp}-${randomId}-${sanitizedName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert([
        {
          tenant_id: profile.tenant_id,
          project_id: projectId,
          contact_id: contactId,
          name: file.name,
          file_path: storagePath,
          file_type: file.type,
          size_bytes: file.size,
          visibility,
          embedding_status: 'pending', // Will be processed by background job
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);

      // Cleanup: delete uploaded file if DB insert fails
      await supabase.storage.from('documents').remove([storagePath]);

      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // TODO: Trigger background job to process document (extract text, chunk, embed)
    // For now, we'll handle this in Task #2

    return NextResponse.json({
      success: true,
      id: document.id,
      name: document.name,
      size: document.size_bytes,
      path: document.file_path,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
