"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function uploadDocument(formData: FormData) {
  const file = formData.get("document") as File;
  const folder = String(formData.get("folder") ?? "formation");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!file || file.size === 0) {
    redirect("/upload?error=NoFileSelected");
  }

  const supabase = await createClient();

  // 1. Verify user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Prepare isolated file path: user_id/folder/timestamp-filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${Date.now()}-${sanitizedName}`;
  const filePath = `${user.id}/${folder}/${fileName}`;

  // 3. Upload file to Supabase Storage bucket "vault"
  const { error: storageError } = await supabase.storage
    .from("vault")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    console.error("Storage upload error:", storageError.message);
    redirect("/upload?error=UploadFailed");
  }

  // 4. Record document metadata in PostgreSQL "documents" table
  const { error: dbError } = await supabase.from("documents").insert({
    user_id: user.id,
    name: file.name,
    file_path: filePath,
    folder,
    file_size: file.size,
    file_type: file.type || "application/octet-stream",
    notes: notes || null,
  });

  if (dbError) {
    console.error("Database insert error:", dbError.message);
    redirect("/upload?error=DatabaseError");
  }

  redirect("/documents?success=Uploaded");
}
