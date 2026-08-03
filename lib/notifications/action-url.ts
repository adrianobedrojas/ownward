/**
 * Notification action-URL validator.
 *
 * Only safe, internal paths are accepted.
 * External URLs, protocol-relative URLs, javascript: URIs,
 * data: URIs, and malformed inputs are all rejected.
 */

const INTERNAL_PATH_RE = /^\/[a-zA-Z0-9\-_/?=&#+%@:.~]*$/;
const DOUBLE_SLASH_RE = /^\/\//;

/**
 * Returns `true` when the URL is a safe internal destination.
 */
export function isSafeActionUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  // Reject empty or overly long strings
  if (url.trim() === '' || url.length > 2048) return false;

  const trimmed = url.trim();

  // Reject protocol-relative (//...)
  if (DOUBLE_SLASH_RE.test(trimmed)) return false;

  // Reject javascript:, data:, vbscript:, and other unsafe schemes
  const lc = trimmed.toLowerCase();
  if (
    lc.startsWith('javascript:') ||
    lc.startsWith('data:') ||
    lc.startsWith('vbscript:') ||
    lc.startsWith('mailto:') ||
    lc.startsWith('tel:')
  ) {
    return false;
  }

  // Allow absolute internal paths starting with /
  if (trimmed.startsWith('/')) {
    return INTERNAL_PATH_RE.test(trimmed) && !DOUBLE_SLASH_RE.test(trimmed);
  }

  // Reject anything that doesn't start with / (external URLs, etc.)
  return false;
}

/**
 * Sanitizes an action URL: returns the URL if safe, otherwise null.
 */
export function sanitizeActionUrl(url: string | null | undefined): string | null {
  return isSafeActionUrl(url) ? (url as string).trim() : null;
}
