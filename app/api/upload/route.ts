// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'Formation';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate unique file path: user_id/folder/timestamp_filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${user.id}/${folder.toLowerCase()}/${fileName}`;

    // Convert file to buffer for storage upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage 'vault' bucket
    const { data: storageData, error: storageError } = await supabase.storage
      .from('vault')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      throw storageError;
    }

    // Insert metadata into the 'documents' table
    const { error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: file.name,
        size: file.size,
        folder: folder,
        file_path: storageData.path,
        mime_type: file.type,
      });

    if (dbError) {
      // Cleanup storage file if database record insertion fails
      await supabase.storage.from('vault').remove([storageData.path]);
      throw dbError;
    }

    return NextResponse.json({ success: true, path: storageData.path });
  } catch (err: any) {
    console.error('Ownward Hub upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
