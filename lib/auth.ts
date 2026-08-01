export const ONBOARDING_CONFIRM_REDIRECT_PATH = "/auth/confirm?next=/onboarding";
export const RECOVERY_CONFIRM_REDIRECT_PATH = "/auth/confirm?next=/reset-password";
export const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard";
export const CURRENT_POLICY_VERSION = "2026-07-31";
export const TERMS_POLICY_PATH = "/terms";
export const PRIVACY_POLICY_PATH = "/privacy";

export function getOnboardingConfirmRedirectUrl(siteUrl: string) {
  return `${siteUrl}${ONBOARDING_CONFIRM_REDIRECT_PATH}`;
}

export function getRecoveryConfirmRedirectUrl(siteUrl: string) {
  return `${siteUrl}${RECOVERY_CONFIRM_REDIRECT_PATH}`;
}

export function getSafeNextPath(
  next: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT_PATH
) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}
