"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";

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

  const billing = await getUserBillingState(supabase, user.id);
  const { count: documentCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((documentCount ?? 0) >= billing.entitlements.documentLimit) {
    redirect("/upload?error=DocumentLimitReached");
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
    filename: file.name,
    storage_path: filePath,
    folder,
    filesize: file.size,
    filetype: file.type || "application/octet-stream",
    notes: notes || null,
    public_url: null,
  });

  if (dbError) {
    console.error("Database insert error:", dbError.message);
    redirect("/upload?error=DatabaseError");
  }

  redirect("/documents?success=Uploaded");
}
