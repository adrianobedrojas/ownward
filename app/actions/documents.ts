'use server';

import { createClient } from '@/lib/supabase/server'; // or your server client helper

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const file = formData.get('file') as File;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  const filePath = `${user.id}/${Date.now()}-${file.name}`;

  // 1. Upload to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('documents')
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
      filetype: file.type,
      storage_path: filePath,
    });

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  return { success: true };
}
