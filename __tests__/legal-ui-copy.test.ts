import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('legal/disclosure UI copy', () => {
  it('uses Terms agreement + Privacy acknowledgment wording on onboarding/signup', () => {
    const onboarding = read('app/[locale]/onboarding/page.tsx');
    const signup = read('app/[locale]/signup/page.tsx');

    expect(onboarding).toContain('I agree to the');
    expect(onboarding).toContain('I acknowledge the');
    expect(signup).toContain('I agree to the');
    expect(signup).toContain('and acknowledge the');
  });

  it('includes pricing disclosure and legal links near checkout controls', () => {
    const pricingCards = read('app/[locale]/pricing/PricingCards.tsx');
    expect(pricingCards).toContain('Billed monthly unless checkout states otherwise');
    expect(pricingCards).toContain('Stripe Customer Portal');
    expect(pricingCards).toContain('href="/terms"');
    expect(pricingCards).toContain('href="/privacy"');
  });

  it('includes featured listing one-time/no-guarantee disclosure and legal links', () => {
    const featuredButton = read('components/FeaturedListingButton.tsx');
    expect(featuredButton).toContain('One-time promotional purchase unless checkout states otherwise');
    expect(featuredButton).toContain('not guaranteed');
    expect(featuredButton).toContain('href="/terms"');
    expect(featuredButton).toContain('href="/privacy"');
  });

  it('keeps marketing consent inactive in privacy panel', () => {
    const privacyConsentComponent = read('components/PrivacyConsent.tsx');
    expect(privacyConsentComponent).not.toContain("key: 'marketing'");
    expect(privacyConsentComponent).not.toContain('marketingDescription');
  });

  it('keeps analytics disabled before consent and mounts only with analytics consent', () => {
    const analyticsComponent = read('components/VercelWebAnalytics.tsx');
    expect(analyticsComponent).toContain('if (!consent?.analytics)');
    expect(analyticsComponent).toContain('return null;');
    expect(analyticsComponent).toContain('<Analytics beforeSend={beforeSend} />');
  });

  it('gates planner persistence by functionality consent and exposes privacy choices control', () => {
    const planner = read('app/[locale]/start/StartBusinessPlanner.tsx');
    expect(planner).toContain('hasFunctionalityConsent');
    expect(planner).toContain('if (!hydrated || !hasFunctionalityConsent) return;');
    expect(planner).toContain('OpenPrivacyChoicesButton');
    expect(planner).toContain('localStorage.removeItem(START_BUSINESS_STORAGE_KEY)');
  });
});
