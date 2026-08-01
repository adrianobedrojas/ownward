export const DEFAULT_DOCUMENT_FOLDER = "formation";
export const DOCUMENT_DOWNLOAD_SIGNED_URL_EXPIRY_SECONDS = 60;
export const DOCUMENT_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const DOCUMENT_ALLOWED_FOLDERS = [
  "formation",
  "customers",
  "agreements",
  "quotes",
  "invoices",
  "receipts",
  "expenses",
  "taxes",
  "marketing",
] as const;

export const DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/msword",
  "image/png",
  "image/jpeg",
]);

export const DOCUMENT_ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "csv",
  "xlsx",
  "xls",
  "docx",
  "doc",
  "png",
  "jpg",
  "jpeg",
]);

export function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.replace(/^./, (character) => character.toUpperCase());
}

export function formatFolderName(folder?: string | null) {
  return capitalizeFirst((folder || DEFAULT_DOCUMENT_FOLDER).toLowerCase());
}

export function isInvalidDocumentFilename(filename: string) {
  return (
    filename.includes("..") ||
    filename.startsWith(".") ||
    filename.includes("/") ||
    filename.includes("\\")
  );
}

export function sanitizeDocumentFilename(filename: string) {
  const extensionIndex = filename.lastIndexOf(".");
  const hasExtensionSeparator = extensionIndex >= 1;
  const rawBasename = hasExtensionSeparator ? filename.slice(0, extensionIndex) : filename;
  const rawExtension = hasExtensionSeparator ? filename.slice(extensionIndex + 1) : "";
  const fallbackId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}`;
  const fallbackBasename = `document-${fallbackId}`;
  const sanitizedBasename = (rawBasename || fallbackBasename).replace(/[^a-zA-Z0-9_-]/g, "_");
  const sanitizedExtension = rawExtension.replace(/[^a-zA-Z0-9]/g, "");

  return sanitizedExtension
    ? `${sanitizedBasename}.${sanitizedExtension}`
    : sanitizedBasename;
}

export function getFileExtension(filename: string) {
  const index = filename.lastIndexOf(".");
  if (index < 0) return "";
  return filename.slice(index + 1).toLowerCase();
}
