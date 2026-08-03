import {
  GoogleAnalyticsController,
  buildConsentInitScript,
  sanitizeGoogleAnalyticsPage,
  sanitizeGoogleAnalyticsReferrer,
} from '@/lib/google-analytics';
import { LEGACY_PRIVACY_CONSENT_STORAGE_KEY, PRIVACY_CONSENT_STORAGE_KEY } from '@/lib/privacy-consent';

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
    controller.trackPageView('https://ownwardhub.com/en/dashboard?token=def&utm_source=newsletter#changed');
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
    ).toBe('https://example.com/');
    expect(
      sanitizeGoogleAnalyticsReferrer(
        'https://example.com/en/dashboard?token=private&utm_source=x#fragment',
        'https://ownwardhub.com',
      ),
    ).toBe('https://example.com/');
    expect(sanitizeGoogleAnalyticsReferrer('', 'https://ownwardhub.com')).toBe('');
    expect(sanitizeGoogleAnalyticsReferrer('https://', 'https://ownwardhub.com')).toBe('');
  });

  it('always sends explicit page_referrer and deduplicates by sanitized page location only', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);
    controller.setConsent({ analytics: true, functionality: false });

    controller.trackPageView('https://ownwardhub.com/en/dashboard?token=one&utm_source=x', '');
    controller.trackPageView('https://ownwardhub.com/en/dashboard?token=two&utm_source=x', 'https://');
    controller.trackPageView(
      'https://ownwardhub.com/en/dashboard?token=three&utm_source=x',
      'https://example.com/path?private=value#fragment',
    );

    const pageViews = mock.gtagCalls.filter((call) => call[0] === 'event' && call[1] === 'page_view');
    expect(pageViews).toHaveLength(1);

    const firstPayload = pageViews[0][2] as Record<string, string>;
    expect(firstPayload.page_referrer).toBe('');
    expect(firstPayload.page_location).toBe('https://ownwardhub.com/en/dashboard?utm_source=x');

    controller.trackPageView(
      'https://ownwardhub.com/en/pricing?utm_source=x',
      'https://example.com/path?private=value#fragment',
    );
    const updatedPageViews = mock.gtagCalls.filter((call) => call[0] === 'event' && call[1] === 'page_view');
    const externalPayload = updatedPageViews[1][2] as Record<string, string>;
    expect(externalPayload.page_referrer).toBe('https://example.com/');
  });
});

// ---------------------------------------------------------------------------
// Helper: run the inline consent-init script in an isolated mock environment
// so we can assert on the gtag calls it makes without touching real globals.
// ---------------------------------------------------------------------------
function runConsentInitScript(
  script: string,
  localStorageData: Record<string, string> = {},
): Array<unknown[]> {
  const dataLayer: IArguments[] = [];

  // The IIFE uses `window.dataLayer`, `window.gtag`, and `localStorage`.
  // We shadow those globals via a thin wrapper function.
  const wrapped = `var window=_w;var localStorage=_ls;${script}`;
  // eslint-disable-next-line no-new-func
  const fn = new Function('_w', '_ls', wrapped);

  const mockWindow = { dataLayer };
  const mockLocalStorage = { getItem: (key: string) => localStorageData[key] ?? null };

  fn(mockWindow, mockLocalStorage);

  // Each dataLayer entry is an Arguments object pushed by the gtag stub.
  return dataLayer.map((entry) => Array.from(entry));
}

describe('buildConsentInitScript', () => {
  const script = buildConsentInitScript(PRIVACY_CONSENT_STORAGE_KEY, LEGACY_PRIVACY_CONSENT_STORAGE_KEY);

  it('sets default consent with all privacy-sensitive fields denied', () => {
    const calls = runConsentInitScript(script);

    const defaultCall = calls.find((c) => c[0] === 'consent' && c[1] === 'default')?.[2] as
      | Record<string, string>
      | undefined;

    expect(defaultCall).toBeDefined();
    expect(defaultCall?.analytics_storage).toBe('denied');
    expect(defaultCall?.ad_storage).toBe('denied');
    expect(defaultCall?.ad_user_data).toBe('denied');
    expect(defaultCall?.ad_personalization).toBe('denied');
  });

  it('grants functionality_storage and security_storage in the default consent', () => {
    const calls = runConsentInitScript(script);

    const defaultCall = calls.find((c) => c[0] === 'consent' && c[1] === 'default')?.[2] as
      | Record<string, string>
      | undefined;

    expect(defaultCall?.functionality_storage).toBe('granted');
    expect(defaultCall?.security_storage).toBe('granted');
  });

  it('does not fire a consent update when no saved consent exists', () => {
    const calls = runConsentInitScript(script);

    const updateCall = calls.find((c) => c[0] === 'consent' && c[1] === 'update');
    expect(updateCall).toBeUndefined();
  });

  it('restores analytics consent from the v2 storage key', () => {
    const saved = JSON.stringify({ analytics: true, functionality: true });
    const calls = runConsentInitScript(script, { [PRIVACY_CONSENT_STORAGE_KEY]: saved });

    const updateCall = calls.find((c) => c[0] === 'consent' && c[1] === 'update')?.[2] as
      | Record<string, string>
      | undefined;

    expect(updateCall).toBeDefined();
    expect(updateCall?.analytics_storage).toBe('granted');
  });

  it('restores analytics consent from the legacy v1 storage key', () => {
    const saved = JSON.stringify({ analytics: true, functionality: false });
    const calls = runConsentInitScript(script, { [LEGACY_PRIVACY_CONSENT_STORAGE_KEY]: saved });

    const updateCall = calls.find((c) => c[0] === 'consent' && c[1] === 'update')?.[2] as
      | Record<string, string>
      | undefined;

    expect(updateCall?.analytics_storage).toBe('granted');
  });

  it('keeps advertising consent denied in the restored update even when analytics is accepted', () => {
    const saved = JSON.stringify({ analytics: true, functionality: true });
    const calls = runConsentInitScript(script, { [PRIVACY_CONSENT_STORAGE_KEY]: saved });

    const updateCall = calls.find((c) => c[0] === 'consent' && c[1] === 'update')?.[2] as
      | Record<string, string>
      | undefined;

    expect(updateCall?.ad_storage).toBe('denied');
    expect(updateCall?.ad_user_data).toBe('denied');
    expect(updateCall?.ad_personalization).toBe('denied');
  });

  it('restores denied analytics consent when saved preference is analytics=false', () => {
    const saved = JSON.stringify({ analytics: false, functionality: true });
    const calls = runConsentInitScript(script, { [PRIVACY_CONSENT_STORAGE_KEY]: saved });

    const updateCall = calls.find((c) => c[0] === 'consent' && c[1] === 'update')?.[2] as
      | Record<string, string>
      | undefined;

    expect(updateCall?.analytics_storage).toBe('denied');
  });
});

describe('Google Consent Mode v2 update payload', () => {
  it('accept all grants analytics_storage without granting advertising consent', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);

    controller.setConsent({ analytics: true, functionality: true });

    const updateCall = mock.gtagCalls.find(
      (c) => c[0] === 'consent' && c[1] === 'update',
    )?.[2] as Record<string, string> | undefined;

    expect(updateCall?.analytics_storage).toBe('granted');
    expect(updateCall?.ad_storage).toBe('denied');
    expect(updateCall?.ad_user_data).toBe('denied');
    expect(updateCall?.ad_personalization).toBe('denied');
  });

  it('reject nonessential denies analytics and all advertising consent', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);

    controller.setConsent({ analytics: false, functionality: false });

    const updateCall = mock.gtagCalls.find(
      (c) => c[0] === 'consent' && c[1] === 'update',
    )?.[2] as Record<string, string> | undefined;

    expect(updateCall?.analytics_storage).toBe('denied');
    expect(updateCall?.ad_storage).toBe('denied');
    expect(updateCall?.ad_user_data).toBe('denied');
    expect(updateCall?.ad_personalization).toBe('denied');
  });

  it('always grants functionality_storage and security_storage regardless of analytics', () => {
    const mockOn = createMockWindow();
    const controllerOn = new GoogleAnalyticsController('G-ABC12345', mockOn.win as never);
    controllerOn.setConsent({ analytics: true, functionality: true });

    const mockOff = createMockWindow();
    const controllerOff = new GoogleAnalyticsController('G-ABC12345', mockOff.win as never);
    controllerOff.setConsent({ analytics: false, functionality: false });

    for (const mock of [mockOn, mockOff]) {
      const update = mock.gtagCalls.find(
        (c) => c[0] === 'consent' && c[1] === 'update',
      )?.[2] as Record<string, string> | undefined;
      expect(update?.functionality_storage).toBe('granted');
      expect(update?.security_storage).toBe('granted');
    }
  });

  it('does not fire a consent default call from setConsent (handled by inline script)', () => {
    const mock = createMockWindow();
    const controller = new GoogleAnalyticsController('G-ABC12345', mock.win as never);

    controller.setConsent({ analytics: true, functionality: true });

    const defaultCall = mock.gtagCalls.find((c) => c[0] === 'consent' && c[1] === 'default');
    expect(defaultCall).toBeUndefined();
  });
});
