import {
  GoogleAnalyticsController,
  sanitizeGoogleAnalyticsPage,
  sanitizeGoogleAnalyticsReferrer,
} from '@/lib/google-analytics';

function createMockWindow(initialCookie = '_ga=abc; _ga_123=xyz; session=1') {
  const scriptElements: Array<{ src: string; async: boolean }> = [];
  const cookieWrites: string[] = [];
  const gtagCalls: unknown[][] = [];
  let cookieValue = initialCookie;
  const session = new Map<string, string>();

  const document = {
    head: {
      appendChild: (node: { src: string; async: boolean }) => {
        scriptElements.push(node);
      },
    },
    createElement: () => ({ async: false, src: '' }),
    get cookie() {
      return cookieValue;
    },
    set cookie(value: string) {
      cookieWrites.push(value);
    },
    referrer: '',
  } as unknown as Document;

  const win = {
    location: {
      origin: 'https://ownwardhub.com',
      hostname: 'ownwardhub.com',
      href: 'https://ownwardhub.com/en/dashboard',
      reload: jest.fn(),
    },
    sessionStorage: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => {
        session.set(key, value);
      },
      removeItem: (key: string) => {
        session.delete(key);
      },
    },
    document,
    dataLayer: [] as unknown[],
    gtag: (...args: unknown[]) => {
      gtagCalls.push(args);
    },
  };

  return { win, scriptElements, cookieWrites, gtagCalls, setCookieValue: (next: string) => { cookieValue = next; } };
}

describe('Google Analytics consent mode', () => {
  it('does not load the Google tag before analytics consent', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);

    controller.setConsent({ analytics: false, functionality: false });

    expect(mock.scriptElements).toHaveLength(0);
  });

  it('keeps advertising consent denied while allowing analytics', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);

    controller.setConsent({ analytics: true, functionality: true });
    const consentUpdate = mock.gtagCalls.find(
      (call) => call[0] === 'consent' && call[1] === 'update',
    )?.[2] as Record<string, string>;

    expect(consentUpdate.analytics_storage).toBe('granted');
    expect(consentUpdate.ad_storage).toBe('denied');
    expect(consentUpdate.ad_user_data).toBe('denied');
    expect(consentUpdate.ad_personalization).toBe('denied');
    expect(consentUpdate.personalization_storage).toBe('denied');

    const configCall = mock.gtagCalls.find((call) => call[0] === 'config') as unknown[] | undefined;
    expect(configCall?.[2]).toMatchObject({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  });

  it('is a no-op for missing or invalid measurement IDs', () => {
    const missing = createMockWindow();
    const invalid = createMockWindow();
    const missingController = new GoogleAnalyticsController(undefined, missing.win as never);
    const invalidController = new GoogleAnalyticsController('invalid-id', invalid.win as never);

    missingController.setConsent({ analytics: true, functionality: true });
    invalidController.setConsent({ analytics: true, functionality: true });
    missingController.trackPageView('https://ownwardhub.com/en/dashboard');
    invalidController.trackPageView('https://ownwardhub.com/en/dashboard');

    expect(missing.scriptElements).toHaveLength(0);
    expect(invalid.scriptElements).toHaveLength(0);
    expect(missing.gtagCalls).toHaveLength(0);
    expect(invalid.gtagCalls).toHaveLength(0);
  });

  it('loads the Google tag exactly once after consent', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);

    controller.setConsent({ analytics: true, functionality: false });
    controller.setConsent({ analytics: true, functionality: false });
    controller.setConsent({ analytics: false, functionality: false });
    controller.setConsent({ analytics: true, functionality: false });

    expect(mock.scriptElements).toHaveLength(1);
  });

  it('sends exactly one sanitized page_view event per route', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);
    controller.setConsent({ analytics: true, functionality: false });

    controller.trackPageView('https://ownwardhub.com/en/dashboard?token=abc&utm_source=newsletter#private');
    controller.trackPageView('https://ownwardhub.com/en/dashboard?token=abc&utm_source=newsletter#private');
    controller.trackPageView('https://ownwardhub.com/en/dashboard?utm_source=newsletter&utm_campaign=launch');

    const pageViews = mock.gtagCalls.filter((call) => call[0] === 'event' && call[1] === 'page_view');
    expect(pageViews).toHaveLength(2);
    expect((pageViews[0][2] as Record<string, string>).page_path).toBe('/en/dashboard?utm_source=newsletter');
    expect((pageViews[1][2] as Record<string, string>).page_path).toBe(
      '/en/dashboard?utm_source=newsletter&utm_campaign=launch',
    );
  });

  it('denies future collection on withdrawal and removes GA cookies', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);
    controller.setConsent({ analytics: true, functionality: false });
    controller.trackPageView('https://ownwardhub.com/en/dashboard');
    controller.setConsent({ analytics: false, functionality: false });
    controller.trackPageView('https://ownwardhub.com/en/dashboard?utm_source=blocked');

    const pageViews = mock.gtagCalls.filter((call) => call[0] === 'event' && call[1] === 'page_view');
    const denialUpdate = mock.gtagCalls
      .filter((call) => call[0] === 'consent' && call[1] === 'update')
      .pop()?.[2] as Record<string, string>;

    expect(denialUpdate.analytics_storage).toBe('denied');
    expect(pageViews).toHaveLength(1);
    expect(mock.cookieWrites.some((entry) => entry.startsWith('_ga='))).toBe(true);
    expect(mock.cookieWrites.some((entry) => entry.startsWith('_ga_123='))).toBe(true);
    expect(mock.win.location.reload).toHaveBeenCalledTimes(1);
  });
});

describe('GA URL sanitization', () => {
  it('removes sensitive query parameters and fragments while keeping allowed campaign params', () => {
    const sanitized = sanitizeGoogleAnalyticsPage(
      'https://ownwardhub.com/en/pricing?token=abc&email=user@example.com&utm_source=x&gclid=1#frag',
    );

    expect(sanitized.pagePath).toBe('/en/pricing?utm_source=x&gclid=1');
    expect(sanitized.pageLocation).toBe('https://ownwardhub.com/en/pricing?utm_source=x&gclid=1');
  });

  it('normalizes private dynamic identifiers and preserves public slugs', () => {
    expect(
      sanitizeGoogleAnalyticsPage('https://ownwardhub.com/en/deals/invite/private-token?utm_medium=email')
        .pagePath,
    ).toBe('/en/deals/invite/[token]?utm_medium=email');
    expect(sanitizeGoogleAnalyticsPage('https://ownwardhub.com/en/business/secret-id').pagePath).toBe(
      '/en/business/[businessId]',
    );
    expect(sanitizeGoogleAnalyticsPage('https://ownwardhub.com/en/messages/c-123').pagePath).toBe(
      '/en/messages/[conversationId]',
    );
    expect(sanitizeGoogleAnalyticsPage('https://ownwardhub.com/en/blog/how-to-sell').pagePath).toBe(
      '/en/blog/how-to-sell',
    );
    expect(
      sanitizeGoogleAnalyticsPage('https://ownwardhub.com/en/academy/intro-to-acquisitions').pagePath,
    ).toBe('/en/academy/intro-to-acquisitions');
    expect(
      sanitizeGoogleAnalyticsPage('https://ownwardhub.com/en/guide/buying/due-diligence').pagePath,
    ).toBe('/en/guide/buying/due-diligence');
    expect(sanitizeGoogleAnalyticsPage('https://ownwardhub.com/en/b/some-business').pagePath).toBe(
      '/en/b/some-business',
    );
  });

  it('never sends user identifiers, private IDs, or form values in page payloads', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);
    controller.setConsent({ analytics: true, functionality: false });
    controller.trackPageView(
      'https://ownwardhub.com/en/business/biz-123?email=user@example.com&token=secret&notes=private&utm_source=launch',
    );

    const pageViewPayload = mock.gtagCalls.find(
      (call) => call[0] === 'event' && call[1] === 'page_view',
    )?.[2] as Record<string, string | undefined>;

    expect(pageViewPayload.page_location).toContain('/en/business/[businessId]');
    expect(pageViewPayload.page_location).toContain('utm_source=launch');
    expect(pageViewPayload.page_location).not.toContain('email=');
    expect(pageViewPayload.page_location).not.toContain('token=');
    expect(pageViewPayload.page_location).not.toContain('notes=');
    expect(pageViewPayload.user_id).toBeUndefined();
  });

  it('keeps referrers same-origin only and sanitized', () => {
    expect(
      sanitizeGoogleAnalyticsReferrer(
        'https://ownwardhub.com/en/deals/invite/token?token=private#frag',
        'https://ownwardhub.com',
      ),
    ).toBe('https://ownwardhub.com/en/deals/invite/[token]');
    expect(
      sanitizeGoogleAnalyticsReferrer('https://example.com/en/dashboard?utm_source=x', 'https://ownwardhub.com'),
    ).toBeUndefined();
  });
});
