export const PRIVACY_CONSENT_STORAGE_KEY = 'ownward_privacy_consent_v2';
export const LEGACY_PRIVACY_CONSENT_STORAGE_KEY = 'ownward_privacy_consent_v1';
export const PRIVACY_CONSENT_CHANGED_EVENT = 'ownward:privacy-consent-changed';
export const PRIVACY_PANEL_OPEN_EVENT = 'ownward:privacy-panel-open';

const OWNWARD_VISITOR_TOKEN_KEY = 'ownward_visitor_token';
const LEGACY_VISITOR_TOKEN_KEY = 'onward_visitor_token';
const ACADEMY_PROGRESS_STORAGE_KEY = 'ownward_academy_progress_v1';
const START_BUSINESS_STORAGE_KEY = 'ownward_start_business_plan_v1';

export type PrivacyConsentCategory = 'necessary' | 'functionality' | 'analytics';
export type OptionalPrivacyConsentCategory = Exclude<PrivacyConsentCategory, 'necessary'>;

export interface PrivacyConsentState {
  necessary: true;
  functionality: boolean;
  analytics: boolean;
  updatedAt: string;
}

let cachedPrivacyConsentRaw: string | null | undefined;
let cachedPrivacyConsent: PrivacyConsentState | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getDefaultPrivacyConsent(): PrivacyConsentState {
  return {
    necessary: true,
    functionality: false,
    analytics: false,
    updatedAt: '',
  };
}

function normalizePrivacyConsent(value: unknown): PrivacyConsentState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    necessary: true,
    functionality: Boolean(record.functionality),
    analytics: Boolean(record.analytics),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
  };
}

export function readPrivacyConsent(): PrivacyConsentState | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    let stored = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    let parsed: PrivacyConsentState | null = null;

    if (stored === cachedPrivacyConsentRaw) {
      return cachedPrivacyConsent;
    }

    if (stored) {
      parsed = normalizePrivacyConsent(JSON.parse(stored));
    } else {
      const legacyStored = window.localStorage.getItem(LEGACY_PRIVACY_CONSENT_STORAGE_KEY);
      if (legacyStored) {
        parsed = normalizePrivacyConsent(JSON.parse(legacyStored));
        if (parsed) {
          window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(parsed));
          window.localStorage.removeItem(LEGACY_PRIVACY_CONSENT_STORAGE_KEY);
          stored = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
        }
      }
    }

    if (!stored || !parsed) {
      cachedPrivacyConsentRaw = stored;
      cachedPrivacyConsent = null;
      return null;
    }

    cachedPrivacyConsentRaw = stored;
    cachedPrivacyConsent = parsed;

    return parsed;
  } catch {
    cachedPrivacyConsentRaw = undefined;
    cachedPrivacyConsent = null;
    return null;
  }
}

export function resolvePrivacyConsent(): PrivacyConsentState {
  return readPrivacyConsent() ?? getDefaultPrivacyConsent();
}

export function hasPrivacyConsent(category: PrivacyConsentCategory): boolean {
  if (category === 'necessary') {
    return true;
  }

  return resolvePrivacyConsent()[category];
}

export function consentAllowsCategories(
  consent: PrivacyConsentState | null,
  categories: OptionalPrivacyConsentCategory | OptionalPrivacyConsentCategory[],
): boolean {
  const requestedCategories = Array.isArray(categories) ? categories : [categories];
  const resolvedConsent = consent ?? getDefaultPrivacyConsent();

  return requestedCategories.every((category) => resolvedConsent[category]);
}

export function savePrivacyConsent(
  nextConsent: Pick<PrivacyConsentState, 'functionality' | 'analytics'>,
): PrivacyConsentState | null {
  if (!isBrowser()) {
    return null;
  }

  const savedConsent: PrivacyConsentState = {
    necessary: true,
    functionality: Boolean(nextConsent.functionality),
    analytics: Boolean(nextConsent.analytics),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(savedConsent));
  cachedPrivacyConsentRaw = window.localStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
  cachedPrivacyConsent = savedConsent;

  if (!savedConsent.functionality) {
    window.localStorage.removeItem(OWNWARD_VISITOR_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_VISITOR_TOKEN_KEY);
    window.localStorage.removeItem(ACADEMY_PROGRESS_STORAGE_KEY);
    window.localStorage.removeItem(START_BUSINESS_STORAGE_KEY);
  }

  window.dispatchEvent(
    new CustomEvent<PrivacyConsentState>(PRIVACY_CONSENT_CHANGED_EVENT, {
      detail: savedConsent,
    }),
  );

  return savedConsent;
}

export function openPrivacyChoicesPanel() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(PRIVACY_PANEL_OPEN_EVENT));
}
