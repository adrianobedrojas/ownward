'use server';

import { createClient } from '@/lib/supabase/server'; // or your server client helper
import { DEFAULT_DOCUMENT_FOLDER } from '@/lib/documents';
import {
  uploadVaultDocument,
  UploadServiceError,
} from '@/lib/documents/upload-service';

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const file = formData.get('file') as File;
  const folder = String(formData.get('folder') ?? DEFAULT_DOCUMENT_FOLDER).toLowerCase();
  try {
    await uploadVaultDocument(supabase, user.id, file, folder, null);
  } catch (error) {
    if (error instanceof UploadServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Upload failed' };
  }

  return { success: true };
}
