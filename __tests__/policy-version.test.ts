import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
  getPolicyAcceptanceRequirements,
  isCurrentPolicyVersion,
} from '@/lib/policies';

describe('policy version checks', () => {
  it('matches only current versions', () => {
    expect(isCurrentPolicyVersion(CURRENT_TERMS_VERSION, CURRENT_TERMS_VERSION)).toBe(true);
    expect(isCurrentPolicyVersion('older-version', CURRENT_TERMS_VERSION)).toBe(false);
  });

  it('requires terms acceptance on terms version mismatch', () => {
    const result = getPolicyAcceptanceRequirements({
      terms_accepted_at: '2026-01-01T00:00:00Z',
      terms_version: '2026-01-01',
      privacy_accepted_at: '2026-01-01T00:00:00Z',
      privacy_version: CURRENT_PRIVACY_VERSION,
    });
    expect(result.needsTermsAcceptance).toBe(true);
    expect(result.needsPrivacyAcknowledgment).toBe(false);
  });

  it('requires privacy acknowledgment on privacy version mismatch', () => {
    const result = getPolicyAcceptanceRequirements({
      terms_accepted_at: '2026-01-01T00:00:00Z',
      terms_version: CURRENT_TERMS_VERSION,
      privacy_accepted_at: '2026-01-01T00:00:00Z',
      privacy_version: '2026-01-01',
    });
    expect(result.needsTermsAcceptance).toBe(false);
    expect(result.needsPrivacyAcknowledgment).toBe(true);
  });
});
