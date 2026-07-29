export const ONBOARDING_CONFIRM_REDIRECT_PATH = "/auth/confirm?next=/onboarding";

export function getOnboardingConfirmRedirectUrl(siteUrl: string) {
  return `${siteUrl}${ONBOARDING_CONFIRM_REDIRECT_PATH}`;
}
