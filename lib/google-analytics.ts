export const GA_RELOAD_SESSION_KEY = 'ownward_ga_withdrawal_reload_v1';

/**
 * Builds the inline JavaScript snippet that must be placed in <head> before
 * any gtag/GTM script loads.  It:
 *  1. Initialises window.dataLayer and window.gtag.
 *  2. Calls gtag('consent', 'default', …) with every privacy-sensitive field
 *     set to 'denied' so Google Tag Assistant records proper consent
 *     initialisation.
 *  3. Reads the saved Ownward consent choice from localStorage and, if found,
 *     immediately fires gtag('consent', 'update', …) so returning visitors
 *     don't have to re-consent.
 *
 * Call this once on the server and inject the result via dangerouslySetInnerHTML
 * in the <head> of the root layout.
 */
export function buildConsentInitScript(storageKey: string, legacyStorageKey: string): string {
  // Keys are compile-time constants – no user input, no XSS risk.
  return `(function(){window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}if(!window.gtag){window.gtag=gtag;}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',personalization_storage:'denied',functionality_storage:'granted',security_storage:'granted'});try{var r=localStorage.getItem('${storageKey}')||localStorage.getItem('${legacyStorageKey}');if(r){var c=JSON.parse(r);if(c&&typeof c==='object'){gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',personalization_storage:'denied',functionality_storage:'granted',security_storage:'granted'});}}}catch(e){}})();`;
}

const GA_ALLOWED_QUERY_PARAMETERS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_id',
  'utm_term',
  'utm_content',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
]);

const PRIVATE_ROUTE_PATTERNS: Array<[pattern: RegExp, replacement: string]> = [
  [/^(\/[^/]+\/deals\/invite\/)([^/]+)$/, '$1[token]'],
  [/^(\/[^/]+\/deals\/)(?!invite(?:\/|$))([^/]+)$/, '$1[dealRoomId]'],
  [/^(\/[^/]+\/business\/)(?!new(?:\/|$))([^/]+)$/, '$1[businessId]'],
  [/^(\/[^/]+\/messages\/)([^/]+)$/, '$1[conversationId]'],
  [/^(\/[^/]+\/money\/)(?!export(?:\/|$)|reports(?:\/|$))([^/]+)(\/edit)$/, '$1[transactionId]$3'],
  [/^(\/[^/]+\/money\/)(?!export(?:\/|$)|reports(?:\/|$))([^/]+)$/, '$1[transactionId]'],
  [/^(\/[^/]+\/valuation\/)([^/]+)$/, '$1[reportId]'],
];

export interface GoogleAnalyticsConsentState {
  analytics: boolean;
  functionality: boolean;
}

export interface SanitizedGoogleAnalyticsPage {
  pageLocation: string;
  pagePath: string;
}

interface GoogleAnalyticsWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __ownwardGaTagLoaded?: boolean;
  __ownwardGaConfigured?: boolean;
  location: Location;
  document: Document;
  sessionStorage: Storage;
}

function getCurrentWindow(): GoogleAnalyticsWindow | null {
  return typeof window === 'undefined' ? null : (window as unknown as GoogleAnalyticsWindow);
}

function isIpAddress(hostname: string) {
  return /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

function getParentDomain(hostname: string): string | null {
  if (!hostname || hostname === 'localhost' || isIpAddress(hostname)) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length < 2) {
    return null;
  }

  return parts.slice(-2).join('.');
}

function buildQueryString(searchParams: URLSearchParams): string {
  const filtered = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    if (GA_ALLOWED_QUERY_PARAMETERS.has(key)) {
      filtered.append(key, value);
    }
  }

  const serialized = filtered.toString();
  return serialized ? `?${serialized}` : '';
}

function normalizePrivatePathname(pathname: string): string {
  for (const [pattern, replacement] of PRIVATE_ROUTE_PATTERNS) {
    if (pattern.test(pathname)) {
      return pathname.replace(pattern, replacement);
    }
  }

  return pathname;
}

function sanitizeLocationUrl(parsed: URL): SanitizedGoogleAnalyticsPage {
  parsed.hash = '';
  parsed.pathname = normalizePrivatePathname(parsed.pathname);
  const query = buildQueryString(parsed.searchParams);
  parsed.search = query;

  return {
    pageLocation: parsed.toString(),
    pagePath: `${parsed.pathname}${query}`,
  };
}

function createConsentPayload(consent: GoogleAnalyticsConsentState) {
  return {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    personalization_storage: 'denied',
    // functionality_storage and security_storage are always granted because
    // Ownward requires them for authentication, session handling, and core
    // site functionality regardless of the user's analytics preference.
    functionality_storage: 'granted',
    security_storage: 'granted',
  };
}

export function isValidGaMeasurementId(measurementId: string | null | undefined): measurementId is string {
  return typeof measurementId === 'string' && /^G-[A-Z0-9]{6,}$/.test(measurementId.trim());
}

export function sanitizeGoogleAnalyticsPage(url: string, origin?: string): SanitizedGoogleAnalyticsPage {
  try {
    const parsed = origin ? new URL(url, origin) : new URL(url);
    return sanitizeLocationUrl(parsed);
  } catch {
    const fallbackOrigin = origin ?? 'https://ownwardhub.com';
    const parsed = new URL(url, fallbackOrigin);
    return sanitizeLocationUrl(parsed);
  }
}

export function sanitizeGoogleAnalyticsReferrer(referrer: string, origin: string): string {
  if (!referrer) {
    return '';
  }

  try {
    const parsed = new URL(referrer, origin);
    if (parsed.origin !== origin) {
      return new URL(parsed.origin).toString();
    }

    return sanitizeGoogleAnalyticsPage(parsed.toString(), origin).pageLocation;
  } catch {
    return '';
  }
}

export function deleteGoogleAnalyticsCookies(cookieString: string, hostname: string): string[] {
  const names = cookieString
    .split(';')
    .map((entry) => entry.trim().split('=')[0])
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));

  const domainVariants = new Set<string | null>([
    null,
    hostname,
    `.${hostname}`,
  ]);

  const parentDomain = getParentDomain(hostname);
  if (parentDomain) {
    domainVariants.add(parentDomain);
    domainVariants.add(`.${parentDomain}`);
  }

  const results: string[] = [];

  for (const name of names) {
    for (const domain of domainVariants) {
      const domainAttribute = domain ? `; domain=${domain}` : '';
      results.push(`${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainAttribute}`);
    }
  }

  return results;
}

export class GoogleAnalyticsController {
  private readonly measurementId: string | null;
  private readonly win: GoogleAnalyticsWindow | null;
  private readonly origin: string | null;
  private currentConsent: GoogleAnalyticsConsentState = { analytics: false, functionality: false };
  private lastPageViewKey: string | null = null;

  constructor(measurementId: string | null | undefined, win = getCurrentWindow()) {
    this.measurementId = isValidGaMeasurementId(measurementId) ? measurementId.trim() : null;
    this.win = win;
    this.origin = this.win?.location.origin ?? null;
  }

  private gtag(...args: unknown[]) {
    if (!this.win) {
      return;
    }

    this.win.dataLayer = this.win.dataLayer ?? [];
    this.win.gtag =
      this.win.gtag ??
      ((...innerArgs: unknown[]) => {
        this.win?.dataLayer?.push(innerArgs);
      });
    this.win.gtag(...args);
  }

  private loadTagIfNeeded() {
    if (!this.win || !this.measurementId || this.win.__ownwardGaTagLoaded) {
      return;
    }

    const script = this.win.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
    this.win.document.head.appendChild(script);
    this.win.__ownwardGaTagLoaded = true;
  }

  private configureIfNeeded() {
    if (!this.win || !this.measurementId || this.win.__ownwardGaConfigured) {
      return;
    }

    this.gtag('js', new Date());
    this.gtag('config', this.measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    this.win.__ownwardGaConfigured = true;
  }

  private clearReloadFlag() {
    try {
      this.win?.sessionStorage.removeItem(GA_RELOAD_SESSION_KEY);
    } catch {}
  }

  private requestWithdrawalReload() {
    if (!this.win) {
      return;
    }

    try {
      if (this.win.sessionStorage.getItem(GA_RELOAD_SESSION_KEY) === '1') {
        return;
      }

      this.win.sessionStorage.setItem(GA_RELOAD_SESSION_KEY, '1');
      this.win.location.reload();
    } catch {}
  }

  private deleteGaCookies() {
    if (!this.win) {
      return;
    }

    const expireCookies = deleteGoogleAnalyticsCookies(
      this.win.document.cookie ?? '',
      this.win.location.hostname,
    );

    for (const cookie of expireCookies) {
      this.win.document.cookie = cookie;
    }
  }

  setConsent(consent: GoogleAnalyticsConsentState) {
    if (!this.measurementId || !this.win) {
      return;
    }

    const nextConsent: GoogleAnalyticsConsentState = {
      analytics: Boolean(consent.analytics),
      functionality: Boolean(consent.functionality),
    };

    const previousConsent = this.currentConsent;
    this.currentConsent = nextConsent;

    // 'consent default' is handled by the inline <head> script (buildConsentInitScript)
    // which runs before any gtag JS loads.  Only send an update here.
    this.gtag('consent', 'update', createConsentPayload(nextConsent));

    if (nextConsent.analytics) {
      this.clearReloadFlag();
      this.loadTagIfNeeded();
      this.configureIfNeeded();
      return;
    }

    this.lastPageViewKey = null;

    if (previousConsent.analytics && this.win.__ownwardGaTagLoaded) {
      this.deleteGaCookies();
      this.requestWithdrawalReload();
    }
  }

  trackPageView(url: string, referrer = '') {
    if (!this.measurementId || !this.win || !this.currentConsent.analytics || !this.origin) {
      return;
    }

    const sanitizedPage = sanitizeGoogleAnalyticsPage(url, this.origin);
    const sanitizedReferrer = sanitizeGoogleAnalyticsReferrer(referrer, this.origin);
    const pageKey = sanitizedPage.pageLocation;

    if (pageKey === this.lastPageViewKey) {
      return;
    }

    this.lastPageViewKey = pageKey;
    const payload = {
      page_location: sanitizedPage.pageLocation,
      page_path: sanitizedPage.pagePath,
      page_referrer: sanitizedReferrer,
    };

    this.gtag('set', payload);
    this.gtag('event', 'page_view', payload);
  }
}
