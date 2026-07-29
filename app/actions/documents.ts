'use server';

import { createClient } from '@/lib/supabase/server'; // or your server client helper
import { DEFAULT_DOCUMENT_FOLDER } from '@/lib/documents';

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const file = (formData.get('file') ?? formData.get('document')) as File;
  const folder = String(formData.get('folder') ?? DEFAULT_DOCUMENT_FOLDER).toLowerCase();
  if (!file) {
    return { success: false, error: 'No file provided' };
  }
  if (file.name.includes('..') || file.name.startsWith('.')) {
    return { success: false, error: 'Invalid filename' };
  }

  const extensionIndex = file.name.lastIndexOf('.');
  const rawBasename = extensionIndex > 0 ? file.name.slice(0, extensionIndex) : file.name;
  const rawExtension = extensionIndex > 0 ? file.name.slice(extensionIndex + 1) : '';
  const fallbackBasename = `document-${crypto.randomUUID()}`;
  const sanitizedBasename = (rawBasename || fallbackBasename).replace(/[^a-zA-Z0-9-]/g, '_');
  const sanitizedExtension = rawExtension.replace(/[^a-zA-Z0-9-]/g, '');
  const safeFilename = sanitizedExtension
    ? `${sanitizedBasename}.${sanitizedExtension}`
    : sanitizedBasename;
  const filePath = `${user.id}/${folder}/${Date.now()}-${safeFilename}`;

  // 1. Upload to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('vault')
    .upload(filePath, file);

  if (storageError) {
    return { success: false, error: storageError.message };
  }

  // 2. Insert metadata into database table
  const { error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      filename: file.name,
      filesize: file.size,
      filetype: file.type || 'application/octet-stream',
      storage_path: filePath,
      folder,
      notes: null,
      public_url: null,
    });

  if (dbError) {
    const { error: cleanupError } = await supabase.storage.from('vault').remove([filePath]);
    if (cleanupError) {
      console.error('Storage cleanup error after database failure:', cleanupError.message);
    }
    return { success: false, error: dbError.message };
  }

  return { success: true };
}
