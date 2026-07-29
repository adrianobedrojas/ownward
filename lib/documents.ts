export const DEFAULT_DOCUMENT_FOLDER = "formation";

export function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.replace(/^./, (character) => character.toUpperCase());
}

export function formatFolderName(folder?: string | null) {
  return capitalizeFirst((folder || DEFAULT_DOCUMENT_FOLDER).toLowerCase());
}
