"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_DOCUMENT_FOLDER } from "@/lib/documents";
import {
  uploadVaultDocument,
  UploadServiceError,
} from "@/lib/documents/upload-service";

export async function uploadDocument(formData: FormData) {
  const file = formData.get("document") as File;
  const folder = String(formData.get("folder") ?? DEFAULT_DOCUMENT_FOLDER).toLowerCase();
  const notes = String(formData.get("notes") ?? "").trim();

  const supabase = await createClient();

  // 1. Verify user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  try {
    await uploadVaultDocument(supabase, user.id, file, folder, notes);
  } catch (error) {
    if (error instanceof UploadServiceError) {
      redirect(`/upload?error=${error.code}`);
    }
    console.error("Upload failed:", error);
    redirect("/upload?error=UploadFailed");
  }

  redirect("/documents?success=Uploaded");
}
