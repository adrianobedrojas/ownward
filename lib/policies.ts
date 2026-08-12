export const POLICY_EFFECTIVE_DATE = '2026-08-03';
export const POLICY_LAST_UPDATED_DATE = '2026-08-03';

export const CURRENT_TERMS_VERSION = '2026-08-02.1';
export const CURRENT_PRIVACY_VERSION = '2026-08-03.1';

export const CURRENT_PARTNER_COMMUNICATIONS_VERSION = '2026-08-10.1';
export const PARTNER_COMMUNICATIONS_PATH = '/partner-communications';

export const TERMS_POLICY_PATH = '/terms';
export const PRIVACY_POLICY_PATH = '/privacy';

export function isCurrentPolicyVersion(version: string | null | undefined, currentVersion: string): boolean {
  return typeof version === 'string' && version.trim() === currentVersion;
}

export interface PolicyVersionProfile {
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  terms_version?: string | null;
  privacy_version?: string | null;
}

export function getPolicyAcceptanceRequirements(profile: PolicyVersionProfile | null | undefined) {
  const needsTermsAcceptance =
    !profile?.terms_accepted_at || !isCurrentPolicyVersion(profile?.terms_version, CURRENT_TERMS_VERSION);
  const needsPrivacyAcknowledgment =
    !profile?.privacy_accepted_at || !isCurrentPolicyVersion(profile?.privacy_version, CURRENT_PRIVACY_VERSION);

  return { needsTermsAcceptance, needsPrivacyAcknowledgment };
}
