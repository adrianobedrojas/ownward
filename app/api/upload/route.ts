// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_DOCUMENT_FOLDER } from '@/lib/documents';
import {
  uploadVaultDocument,
  UploadServiceError,
} from '@/lib/documents/upload-service';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = ((formData.get('folder') as string) || DEFAULT_DOCUMENT_FOLDER).toLowerCase();
    const notes = String(formData.get('notes') ?? '').trim();

    const supabase = await createClient();

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await uploadVaultDocument(
      supabase,
      user.id,
      file,
      folder,
      notes
    );

    return NextResponse.json({ success: true, path: result.storagePath });
  } catch (err: unknown) {
    if (err instanceof UploadServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === 'DOCUMENT_LIMIT_REACHED' || err.code === 'STORAGE_LIMIT_REACHED' ? 403 : 400 }
      );
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Ownward Hub upload error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
