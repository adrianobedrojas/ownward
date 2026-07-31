import { hasPrivacyConsent } from '@/lib/privacy-consent';

const VISITOR_TOKEN_KEY = 'ownward_visitor_token';
const LEGACY_VISITOR_TOKEN_KEY = 'onward_visitor_token';
let temporaryVisitorToken: string | null = null;

function getTemporaryVisitorToken(): string {
  if (!temporaryVisitorToken) {
    temporaryVisitorToken = crypto.randomUUID();
  }

  return temporaryVisitorToken;
}

export function getOrCreateVisitorToken(): string {
  if (typeof window === 'undefined') return '';

  if (!hasPrivacyConsent('functionality')) {
    localStorage.removeItem(VISITOR_TOKEN_KEY);
    localStorage.removeItem(LEGACY_VISITOR_TOKEN_KEY);
    return getTemporaryVisitorToken();
  }

  let token = localStorage.getItem(VISITOR_TOKEN_KEY);

  if (!token) {
    const legacyToken = localStorage.getItem(LEGACY_VISITOR_TOKEN_KEY);

    if (legacyToken) {
      token = legacyToken;
      localStorage.setItem(VISITOR_TOKEN_KEY, token);
      localStorage.removeItem(LEGACY_VISITOR_TOKEN_KEY);
    }
  }

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VISITOR_TOKEN_KEY, token);
  }

  return token;
}
