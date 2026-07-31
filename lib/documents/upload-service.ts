import { createHash, randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserBillingState } from "@/lib/billing";
import {
  DEFAULT_DOCUMENT_FOLDER,
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_ALLOWED_FOLDERS,
  DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_FILE_BYTES,
  getFileExtension,
  isInvalidDocumentFilename,
  sanitizeDocumentFilename,
} from "@/lib/documents";

type UploadErrorCode =
  | "NO_FILE"
  | "INVALID_FILENAME"
  | "INVALID_FOLDER"
  | "INVALID_FILE_TYPE"
  | "INVALID_MIME_TYPE"
  | "INVALID_FILE_SIGNATURE"
  | "FILE_TOO_LARGE"
  | "DOCUMENT_LIMIT_REACHED"
  | "STORAGE_LIMIT_REACHED"
  | "DUPLICATE_FILE"
  | "UPLOAD_FAILED"
  | "DATABASE_ERROR";

export class UploadServiceError extends Error {
  constructor(
    message: string,
    public readonly code: UploadErrorCode
  ) {
    super(message);
  }
}

type VaultUploadResult = {
  documentId: string;
  storagePath: string;
  checksum: string;
};

function isAllowedFolder(folder: string): boolean {
  return (DOCUMENT_ALLOWED_FOLDERS as readonly string[]).includes(folder);
}

function hasValidSignature(
  file: File,
  bytes: Uint8Array,
  extension: string
): boolean {
  if (extension === "pdf") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    );
  }

  if (extension === "png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (extension === "jpg" || extension === "jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (extension === "docx" || extension === "xlsx") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    );
  }

  if (extension === "csv" || extension === "doc" || extension === "xls") {
    return true;
  }

  return file.type === "application/octet-stream";
}

function normalizeFolder(folder: string | null | undefined): string {
  const normalized = (folder || DEFAULT_DOCUMENT_FOLDER).toLowerCase();
  if (!isAllowedFolder(normalized)) {
    throw new UploadServiceError(
      "Invalid folder. Please choose one of the predefined vault folders.",
      "INVALID_FOLDER"
    );
  }
  return normalized;
}

export async function uploadVaultDocument(
  supabase: SupabaseClient,
  userId: string,
  file: File | null,
  folderInput: string | null | undefined,
  notes: string | null
): Promise<VaultUploadResult> {
  if (!file || file.size === 0) {
    throw new UploadServiceError("No file selected.", "NO_FILE");
  }
  if (file.size > DOCUMENT_MAX_FILE_BYTES) {
    throw new UploadServiceError(
      "File exceeds the 50 MB upload limit.",
      "FILE_TOO_LARGE"
    );
  }
  if (isInvalidDocumentFilename(file.name)) {
    throw new UploadServiceError("Invalid filename.", "INVALID_FILENAME");
  }

  const folder = normalizeFolder(folderInput);
  const extension = getFileExtension(file.name);
  if (!DOCUMENT_ALLOWED_EXTENSIONS.has(extension)) {
    throw new UploadServiceError(
      "File type not allowed for vault uploads.",
      "INVALID_FILE_TYPE"
    );
  }
  if (file.type && !DOCUMENT_ALLOWED_MIME_TYPES.has(file.type)) {
    throw new UploadServiceError("File MIME type not allowed.", "INVALID_MIME_TYPE");
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (!hasValidSignature(file, bytes, extension)) {
    throw new UploadServiceError(
      "File signature does not match the extension.",
      "INVALID_FILE_SIGNATURE"
    );
  }

  const billing = await getUserBillingState(supabase, userId);
  const { count: documentCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if ((documentCount ?? 0) >= billing.entitlements.documentLimit) {
    throw new UploadServiceError(
      "Document limit reached for your current plan.",
      "DOCUMENT_LIMIT_REACHED"
    );
  }

  const { data: storageRows, error: storageQueryError } = await supabase
    .from("documents")
    .select("filesize")
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (storageQueryError) {
    throw new UploadServiceError(
      "Could not validate storage usage.",
      "DATABASE_ERROR"
    );
  }

  const currentBytes = (storageRows ?? []).reduce(
    (sum, row) => sum + Number(row.filesize ?? 0),
    0
  );
  const maxBytes = Math.max(1, billing.entitlements.documentLimit) * DOCUMENT_MAX_FILE_BYTES;
  if (currentBytes + file.size > maxBytes) {
    throw new UploadServiceError(
      "Storage quota reached for your current plan.",
      "STORAGE_LIMIT_REACHED"
    );
  }

  const checksum = createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");

  const { data: duplicate } = await supabase
    .from("documents")
    .select("id")
    .eq("user_id", userId)
    .eq("sha256_checksum", checksum)
    .is("deleted_at", null)
    .maybeSingle();

  if (duplicate) {
    throw new UploadServiceError(
      "This file already exists in your vault.",
      "DUPLICATE_FILE"
    );
  }

  const storageKey = `${userId}/${folder}/${randomUUID()}-${sanitizeDocumentFilename(
    file.name
  )}`;

  const { error: storageError } = await supabase.storage
    .from("vault")
    .upload(storageKey, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (storageError) {
    throw new UploadServiceError("Upload failed. Please try again.", "UPLOAD_FAILED");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      filename: file.name,
      storage_path: storageKey,
      folder,
      filesize: file.size,
      filetype: file.type || "application/octet-stream",
      notes: notes?.trim() ? notes.trim() : null,
      public_url: null,
      sha256_checksum: checksum,
      retention_status: "active",
      malware_scan_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await supabase.storage.from("vault").remove([storageKey]);
    throw new UploadServiceError(
      "Could not save document metadata.",
      "DATABASE_ERROR"
    );
  }

  return {
    documentId: inserted.id as string,
    storagePath: storageKey,
    checksum,
  };
}
