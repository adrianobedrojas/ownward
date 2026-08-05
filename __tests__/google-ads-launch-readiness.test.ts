import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Google Ads launch readiness guards', () => {
  it('keeps private utility routes out of the sitemap route list', () => {
    const sitemap = read('app/sitemap.ts');

    expect(sitemap).toContain("'/business-idea-readiness-check'");
    expect(sitemap).not.toContain("'/documents'");
    expect(sitemap).not.toContain("'/upload'");
  });

  it('adds crawl disallow rules for private utility/auth routes', () => {
    const robots = read('app/robots.ts');

    expect(robots).toContain("'/api/'");
    expect(robots).toContain("'/dashboard'");
    expect(robots).toContain("'/check-email'");
    expect(robots).toContain("'/es/dashboard'");
  });

  it('tracks signup conversions only after successful signup redirect', () => {
    const signupRoute = read('app/api/signup/route.ts');
    const checkEmailPage = read('app/[locale]/check-email/page.tsx');
    const signupTracker = read('components/analytics/SignupSuccessTracker.tsx');

    expect(signupRoute).toContain('/check-email?signup=success&nonce=');
    expect(signupRoute).toContain('Set-Cookie');
    expect(checkEmailPage).toContain('ownward_signup_success_nonce');
    expect(signupTracker).toContain('verifiedNonce');
    expect(signupTracker).toContain('trackGoogleAnalyticsConversion(');
    expect(signupTracker).toContain("'sign_up'");
    expect(signupTracker).toContain('localStorage');
  });

  it('keeps check-email as a noindex utility page', () => {
    const checkEmailPage = read('app/[locale]/check-email/page.tsx');

    expect(checkEmailPage).toContain('robots: {');
    expect(checkEmailPage).toContain('index: false');
    expect(checkEmailPage).toContain('follow: false');
  });
});
