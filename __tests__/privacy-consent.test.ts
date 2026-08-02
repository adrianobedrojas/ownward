class LocalStorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

function setupBrowserMocks() {
  const localStorage = new LocalStorageMock();
  const listeners = new Map<string, ((event?: unknown) => void)[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = {
    localStorage,
    addEventListener: (name: string, listener: (event?: unknown) => void) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
    },
    removeEventListener: (name: string, listener: (event?: unknown) => void) => {
      listeners.set(name, (listeners.get(name) ?? []).filter((entry) => entry !== listener));
    },
    dispatchEvent: (event: Event) => {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }
      return true;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).localStorage = localStorage;
  return localStorage;
}

describe('privacy consent behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).crypto = { randomUUID: () => 'uuid-test' };
  });

  it('defaults analytics to disabled before consent and enables after consent', async () => {
    setupBrowserMocks();
    const consent = await import('@/lib/privacy-consent');

    expect(consent.hasPrivacyConsent('analytics')).toBe(false);
    consent.savePrivacyConsent({ functionality: false, analytics: true });
    expect(consent.hasPrivacyConsent('analytics')).toBe(true);
  });

  it('migrates legacy v1 consent to v2 and removes marketing from stored schema', async () => {
    const localStorage = setupBrowserMocks();
    localStorage.setItem('ownward_privacy_consent_v1', JSON.stringify({
      necessary: true,
      functionality: true,
      analytics: false,
      marketing: true,
      updatedAt: '2026-01-01T00:00:00Z',
    }));
    const consent = await import('@/lib/privacy-consent');

    const value = consent.readPrivacyConsent();
    expect(value?.functionality).toBe(true);
    expect(localStorage.getItem('ownward_privacy_consent_v2')).toContain('"functionality":true');
    expect(localStorage.getItem('ownward_privacy_consent_v1')).toBeNull();
    expect(localStorage.getItem('ownward_privacy_consent_v2')).not.toContain('marketing');
  });

  it('revoking functionality clears optional local data and visitor token persistence', async () => {
    const localStorage = setupBrowserMocks();
    localStorage.setItem('ownward_academy_progress_v1', '{"ok":true}');
    localStorage.setItem('ownward_start_business_plan_v1', '{"ok":true}');
    localStorage.setItem('ownward_visitor_token', 'visitor-token');

    const consent = await import('@/lib/privacy-consent');
    const visitor = await import('@/lib/visitor');

    consent.savePrivacyConsent({ functionality: false, analytics: false });
    const token = visitor.getOrCreateVisitorToken();

    expect(localStorage.getItem('ownward_academy_progress_v1')).toBeNull();
    expect(localStorage.getItem('ownward_start_business_plan_v1')).toBeNull();
    expect(localStorage.getItem('ownward_visitor_token')).toBeNull();
    expect(token).toBe('uuid-test');
  });
});
