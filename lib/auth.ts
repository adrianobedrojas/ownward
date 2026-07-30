export const ONBOARDING_CONFIRM_REDIRECT_PATH = "/auth/confirm?next=/onboarding";
export const RECOVERY_CONFIRM_REDIRECT_PATH = "/auth/confirm?next=/reset-password";

export function getOnboardingConfirmRedirectUrl(siteUrl: string) {
  return `${siteUrl}${ONBOARDING_CONFIRM_REDIRECT_PATH}`;
}

export function getRecoveryConfirmRedirectUrl(siteUrl: string) {
  return `${siteUrl}${RECOVERY_CONFIRM_REDIRECT_PATH}`;
}
