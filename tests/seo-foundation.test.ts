import {
  buildBusinessListingSeoTitle,
  createMetadata,
  createRobots,
  getLocalizedPath,
  getSiteOrigin,
  isExplicitNoIndexPath,
  isSolutionIndexable,
  serializeJsonLd,
  shouldRobotsDisallow,
} from '@/lib/seo';
import {
  buildBlogSitemapEntries,
  buildGuideSitemapEntries,
  buildListingSitemapEntries,
  buildStaticSitemapEntries,
  buildSolutionSitemapEntries,
} from '@/app/sitemap';

describe('SEO foundation helpers', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it('falls back to the production site URL', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteOrigin()).toBe('https://ownwardhub.com');
  });

  it('builds English and Spanish localized paths correctly', () => {
    expect(getLocalizedPath('/pricing', 'en')).toBe('/pricing');
    expect(getLocalizedPath('/pricing', 'es')).toBe('/es/pricing');
    expect(getLocalizedPath('', 'en')).toBe('/');
    expect(getLocalizedPath('', 'es')).toBe('/es');
  });

  it('creates self-referential canonicals with hreflang alternates and matching OG URLs', () => {
    const metadata = createMetadata({
      locale: 'es',
      pathname: '/start',
      title: 'Start a Business | Ownward Hub',
      description: 'Validate your idea.',
    });

    expect(metadata.alternates?.canonical).toBe('https://ownwardhub.com/es/start');
    expect(metadata.alternates?.languages).toMatchObject({
      en: 'https://ownwardhub.com/start',
      es: 'https://ownwardhub.com/es/start',
      'x-default': 'https://ownwardhub.com/start',
    });
    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
  });

  it('returns conservative robots decisions for auth and private routes', () => {
    const robots = createRobots();
    expect(robots.sitemap).toBe('https://ownwardhub.com/sitemap.xml');
    expect(isExplicitNoIndexPath('/login')).toBe(true);
    expect(isExplicitNoIndexPath('/es/reset-password')).toBe(true);
    expect(shouldRobotsDisallow('/dashboard')).toBe(true);
    expect(shouldRobotsDisallow('/es/messages')).toBe(true);
    expect(shouldRobotsDisallow('/pricing')).toBe(false);
  });

  it('applies solution indexing rules conservatively', () => {
    expect(isSolutionIndexable('active')).toBe(true);
    expect(isSolutionIndexable('included')).toBe(true);
    expect(isSolutionIndexable('planned')).toBe(false);
    expect(isSolutionIndexable('coming_soon')).toBe(false);
  });

  it('escapes JSON-LD safely', () => {
    expect(serializeJsonLd({ text: '<script>alert(1)</script>' })).toContain('\\u003cscript>');
  });

  it('keeps static sitemap entries date-free while guide/blog entries use real dates', () => {
    const staticEntry = buildStaticSitemapEntries().find((entry) => entry.url === 'https://ownwardhub.com/start');
    expect(staticEntry?.lastModified).toBeUndefined();

    const guideEntry = buildGuideSitemapEntries().find((entry) => entry.url.includes('/guide/start/how-to-start-an-llc'));
    expect(guideEntry?.lastModified).toBeInstanceOf(Date);

    const blogEntries = buildBlogSitemapEntries([
      { slug: 'hello-world', created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-02T00:00:00.000Z' },
    ]);
    expect(blogEntries[0].lastModified).toBeInstanceOf(Date);
    expect(blogEntries[0].url).toBe('https://ownwardhub.com/blog/hello-world');
    expect(blogEntries[1].url).toBe('https://ownwardhub.com/es/blog/hello-world');
  });

  it('includes only indexable solution URLs in the sitemap', () => {
    const solutionEntries = buildSolutionSitemapEntries().map((entry) => entry.url);
    expect(solutionEntries.some((url) => url.includes('/solutions/exit-intelligence-bundle'))).toBe(true);
    expect(solutionEntries.some((url) => url.includes('/solutions/market-spotlight'))).toBe(false);
  });

  it('keeps blog and listing locale paths aware of /es variants', () => {
    expect(getLocalizedPath('/blog/sample-post', 'es')).toBe('/es/blog/sample-post');

    const listingEntries = buildListingSitemapEntries([
      {
        slug: 'confidential-services-firm',
        published_at: '2026-08-01T00:00:00.000Z',
        headline_es: null,
        summary_es: null,
        highlights_es: null,
        growth_opportunities_es: null,
        reason_for_selling_es: null,
      },
      {
        slug: 'panaderia-local',
        published_at: '2026-08-01T00:00:00.000Z',
        headline_es: 'Panadería con clientela recurrente',
        summary_es: null,
        highlights_es: null,
        growth_opportunities_es: null,
        reason_for_selling_es: null,
      },
    ]);

    expect(listingEntries.filter((entry) => entry.url.includes('confidential-services-firm'))).toHaveLength(1);
    expect(listingEntries.filter((entry) => entry.url.includes('panaderia-local'))).toHaveLength(2);
  });

  it('builds listing titles from public information only', () => {
    expect(buildBusinessListingSeoTitle('en', 'Confidential Services Firm', 'Austin, TX')).toBe(
      'Confidential Services Firm for Sale in Austin, TX'
    );
    expect(buildBusinessListingSeoTitle('es', 'Panadería local', 'Sevilla')).toBe(
      'Panadería local en venta en Sevilla'
    );
  });
});
