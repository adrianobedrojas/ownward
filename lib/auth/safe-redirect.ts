/**
 * Safe login-redirect helper.
 *
 * Accepts a `next` query-parameter value and returns a validated, safe
 * internal path. Falls back to `/dashboard` when the value is absent,
 * unsafe, or would create an authentication loop.
 *
 * Rules:
 *  1. Value must be a non-empty string.
 *  2. Must begin with exactly one `/` (no `//`).
 *  3. Rejects absolute URLs (must not contain `:`).
 *  4. Rejects backslashes.
 *  5. Rejects common percent-encoded bypass sequences.
 *  6. Rejects auth-loop destinations: /login, /signup, /logout,
 *     /auth/*, /api/auth/*, /check-email, /confirm-email, /forgot-password.
 */

const FALLBACK = "/dashboard";

/** Paths that would create an authentication loop. */
const LOOP_PREFIXES = [
  "/login",
  "/signup",
  "/logout",
  "/auth/",
  "/api/auth/",
  "/check-email",
  "/confirm-email",
  "/forgot-password",
];

/**
 * Returns a safe internal redirect path derived from `next`.
 * Always returns a string that begins with `/`.
 */
export function getSafeRedirect(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return FALLBACK;

  // Reject encoded bypass sequences before any other checks
  const lower = next.toLowerCase();
  if (
    lower.includes("%2f%2f") ||   // encoded //
    lower.includes("%5c") ||      // encoded backslash
    lower.includes("%00") ||      // null byte
    lower.includes("%0d") ||      // carriage return
    lower.includes("%0a")         // newline
  ) {
    return FALLBACK;
  }

  // Reject backslashes (windows path bypass)
  if (next.includes("\\")) return FALLBACK;

  // Must begin with exactly one "/"
  if (!next.startsWith("/")) return FALLBACK;

  // Reject protocol-relative URLs (//)
  if (next.startsWith("//")) return FALLBACK;

  // Reject absolute URLs — colons indicate a scheme (e.g. https:)
  if (next.includes(":")) return FALLBACK;

  // Reject auth-loop destinations (case-insensitive prefix match)
  const normalized = next.toLowerCase();
  for (const prefix of LOOP_PREFIXES) {
    if (prefix.endsWith("/")) {
      // Prefix already includes trailing slash — any sub-path matches
      if (normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)) {
        return FALLBACK;
      }
    } else {
      // Exact match, or followed by / or ?
      if (
        normalized === prefix ||
        normalized.startsWith(prefix + "/") ||
        normalized.startsWith(prefix + "?")
      ) {
        return FALLBACK;
      }
    }
  }

  return next;
}
