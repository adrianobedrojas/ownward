/**
 * Vercel Analytics URL Sanitizer Tests
 *
 * Verifies that query parameters, hashes, and dynamic route segments
 * are properly stripped/replaced while static path shapes are preserved.
 */

import { sanitizeAnalyticsUrl } from '@/lib/vercel-analytics';

describe('sanitizeAnalyticsUrl', () => {
  // ── Query params & hashes ────────────────────────────────────────────────

  it('strips query parameters', () => {
    expect(sanitizeAnalyticsUrl('/en/dashboard?tab=overview&ref=email')).toBe('/en/dashboard');
  });

  it('strips hash fragments', () => {
    expect(sanitizeAnalyticsUrl('/en/pricing#pro')).toBe('/en/pricing');
  });

  it('strips both query parameters and hash', () => {
    expect(sanitizeAnalyticsUrl('/en/sell?step=1#top')).toBe('/en/sell');
  });

  // ── Static routes stay unchanged ─────────────────────────────────────────

  it('leaves static routes unchanged', () => {
    expect(sanitizeAnalyticsUrl('/en/dashboard')).toBe('/en/dashboard');
    expect(sanitizeAnalyticsUrl('/en/login')).toBe('/en/login');
    expect(sanitizeAnalyticsUrl('/en/pricing')).toBe('/en/pricing');
    expect(sanitizeAnalyticsUrl('/en/deals')).toBe('/en/deals');
    expect(sanitizeAnalyticsUrl('/en/deals/invite')).toBe('/en/deals/invite');
    expect(sanitizeAnalyticsUrl('/en/money/export')).toBe('/en/money/export');
    expect(sanitizeAnalyticsUrl('/en/money/reports')).toBe('/en/money/reports');
    expect(sanitizeAnalyticsUrl('/en/business/new')).toBe('/en/business/new');
  });

  // ── Dynamic route normalization ───────────────────────────────────────────

  it('normalizes /[locale]/business/[businessId]', () => {
    expect(sanitizeAnalyticsUrl('/en/business/123456')).toBe('/en/business/[businessId]');
    expect(sanitizeAnalyticsUrl('/es/business/abc-def-789')).toBe('/es/business/[businessId]');
  });

  it('normalizes /[locale]/deals/[dealRoomId]', () => {
    expect(sanitizeAnalyticsUrl('/en/deals/room-42')).toBe('/en/deals/[dealRoomId]');
  });

  it('normalizes /[locale]/deals/invite/[token] (more specific than deals/:id)', () => {
    expect(sanitizeAnalyticsUrl('/en/deals/invite/abc123token')).toBe('/en/deals/invite/[token]');
  });

  it('normalizes /[locale]/messages/[conversationId]', () => {
    expect(sanitizeAnalyticsUrl('/en/messages/conv-999')).toBe('/en/messages/[conversationId]');
  });

  it('normalizes /[locale]/money/[transactionId]', () => {
    expect(sanitizeAnalyticsUrl('/en/money/txn-001')).toBe('/en/money/[transactionId]');
  });

  it('normalizes /[locale]/money/[transactionId]/edit', () => {
    expect(sanitizeAnalyticsUrl('/en/money/txn-001/edit')).toBe('/en/money/[transactionId]/edit');
  });

  it('normalizes /[locale]/valuation/[reportId]', () => {
    expect(sanitizeAnalyticsUrl('/en/valuation/rpt-88')).toBe('/en/valuation/[reportId]');
  });

  it('normalizes /[locale]/academy/[courseSlug]', () => {
    expect(sanitizeAnalyticsUrl('/en/academy/intro-to-sba')).toBe('/en/academy/[courseSlug]');
  });

  it('normalizes /[locale]/guide/[category]', () => {
    expect(sanitizeAnalyticsUrl('/en/guide/buying')).toBe('/en/guide/[category]');
  });

  it('normalizes /[locale]/guide/[category]/[slug]', () => {
    expect(sanitizeAnalyticsUrl('/en/guide/buying/due-diligence')).toBe('/en/guide/[category]/[slug]');
  });

  it('normalizes /[locale]/b/[slug]', () => {
    expect(sanitizeAnalyticsUrl('/en/b/my-business-listing')).toBe('/en/b/[slug]');
  });

  it('normalizes /[locale]/blog/[slug]', () => {
    expect(sanitizeAnalyticsUrl('/en/blog/how-to-sell')).toBe('/en/blog/[slug]');
  });

  // ── Combined: dynamic route + query params ────────────────────────────────

  it('normalizes route AND strips query params together', () => {
    expect(sanitizeAnalyticsUrl('/en/business/123456?ref=email')).toBe('/en/business/[businessId]');
    expect(sanitizeAnalyticsUrl('/en/deals/invite/tok?preview=1#section')).toBe(
      '/en/deals/invite/[token]',
    );
  });

  // ── Locale variants ───────────────────────────────────────────────────────

  it('works for Spanish locale', () => {
    expect(sanitizeAnalyticsUrl('/es/business/999')).toBe('/es/business/[businessId]');
    expect(sanitizeAnalyticsUrl('/es/deals/invite/xyz')).toBe('/es/deals/invite/[token]');
  });

  // ── Absolute URLs ─────────────────────────────────────────────────────────

  it('sanitizes an absolute static URL and removes query parameters and hash', () => {
    expect(
      sanitizeAnalyticsUrl(
        'https://ownwardhub.com/en/dashboard?tab=overview#activity',
      ),
    ).toBe('https://ownwardhub.com/en/dashboard');
  });

  it('normalizes a business ID in an absolute URL', () => {
    expect(
      sanitizeAnalyticsUrl(
        'https://ownwardhub.com/en/business/business-123?ref=email',
      ),
    ).toBe('https://ownwardhub.com/en/business/[businessId]');
  });

  it('redacts an invitation token in an absolute URL', () => {
    expect(
      sanitizeAnalyticsUrl(
        'https://ownwardhub.com/en/deals/invite/private-token-123?preview=1',
      ),
    ).toBe('https://ownwardhub.com/en/deals/invite/[token]');
  });

  it('normalizes a money transaction edit URL', () => {
    expect(
      sanitizeAnalyticsUrl(
        'https://ownwardhub.com/en/money/transaction-456/edit?source=dashboard',
      ),
    ).toBe(
      'https://ownwardhub.com/en/money/[transactionId]/edit',
    );
  });
});
