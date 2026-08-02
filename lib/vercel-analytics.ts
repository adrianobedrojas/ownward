import type { BeforeSendEvent } from '@vercel/analytics/next';

/**
 * Ordered list of route patterns. Each entry matches a known dynamic route
 * and replaces its dynamic segments with bracket-notation placeholders.
 * Rules are tested in order — put more specific patterns before broader ones.
 */
const ROUTE_PATTERNS: Array<[pattern: RegExp, replacement: string]> = [
  // /[locale]/deals/invite/[token]
  [/^(\/[^/]+\/deals\/invite\/)([^/]+)$/, '$1[token]'],
  // /[locale]/deals/[dealRoomId]  — exclude static sub-routes like "invite"
  [/^(\/[^/]+\/deals\/)(?!invite(?:\/|$))([^/]+)$/, '$1[dealRoomId]'],
  // /[locale]/business/[businessId]  — exclude "new"
  [/^(\/[^/]+\/business\/)(?!new(?:\/|$))([^/]+)$/, '$1[businessId]'],
  // /[locale]/messages/[conversationId]
  [/^(\/[^/]+\/messages\/)([^/]+)$/, '$1[conversationId]'],
  // /[locale]/money/[transactionId]/edit
  [/^(\/[^/]+\/money\/)(?!export(?:\/|$)|reports(?:\/|$))([^/]+)(\/edit)$/, '$1[transactionId]$3'],
  // /[locale]/money/[transactionId]  — exclude static sub-routes like "export" and "reports"
  [/^(\/[^/]+\/money\/)(?!export(?:\/|$)|reports(?:\/|$))([^/]+)$/, '$1[transactionId]'],
  // /[locale]/valuation/[reportId]
  [/^(\/[^/]+\/valuation\/)([^/]+)$/, '$1[reportId]'],
  // /[locale]/academy/[courseSlug]
  [/^(\/[^/]+\/academy\/)([^/]+)$/, '$1[courseSlug]'],
  // /[locale]/guide/[category]/[slug]
  [/^(\/[^/]+\/guide\/)([^/]+)\/([^/]+)$/, '$1[category]/[slug]'],
  // /[locale]/guide/[category]
  [/^(\/[^/]+\/guide\/)([^/]+)$/, '$1[category]'],
  // /[locale]/b/[slug]
  [/^(\/[^/]+\/b\/)([^/]+)$/, '$1[slug]'],
  // /[locale]/blog/[slug]
  [/^(\/[^/]+\/blog\/)([^/]+)$/, '$1[slug]'],
];

function sanitizePathname(pathname: string): string {
  for (const [pattern, replacement] of ROUTE_PATTERNS) {
    if (pattern.test(pathname)) {
      return pathname.replace(pattern, replacement);
    }
  }

  return pathname;
}

/**
 * Sanitizes a URL for Vercel Analytics by:
 * 1. Stripping query parameters and hash fragments to avoid leaking PII.
 * 2. Replacing known dynamic route segments (IDs, tokens, slugs) with their
 *    bracket-notation placeholders so aggregate metrics stay meaningful.
 *
 * Supports both absolute URLs (which Vercel may provide) and relative paths.
 */
export function sanitizeAnalyticsUrl(url: string): string {
  try {
    // Vercel may provide a complete absolute URL.
    const parsedUrl = new URL(url);

    parsedUrl.pathname = sanitizePathname(parsedUrl.pathname);
    parsedUrl.search = '';
    parsedUrl.hash = '';

    return parsedUrl.toString();
  } catch {
    // Continue supporting relative paths such as /en/business/123.
    const pathname = url.split(/[?#]/, 1)[0];

    return sanitizePathname(pathname);
  }
}

/**
 * beforeSend handler for <Analytics />. Sanitizes the event URL and passes
 * the event through unchanged otherwise.
 */
export function createBeforeSend() {
  return function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
    return { ...event, url: sanitizeAnalyticsUrl(event.url) };
  };
}
