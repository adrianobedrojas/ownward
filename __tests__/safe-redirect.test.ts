import { getSafeRedirect } from '@/lib/auth/safe-redirect';

describe('getSafeRedirect', () => {
  // ─── Safe paths ──────────────────────────────────────────────────────────
  it('accepts /pricing', () => {
    expect(getSafeRedirect('/pricing')).toBe('/pricing');
  });

  it('accepts /b/example', () => {
    expect(getSafeRedirect('/b/example')).toBe('/b/example');
  });

  it('accepts /es/pricing', () => {
    expect(getSafeRedirect('/es/pricing')).toBe('/es/pricing');
  });

  it('accepts /dashboard', () => {
    expect(getSafeRedirect('/dashboard')).toBe('/dashboard');
  });

  it('accepts /sell/new', () => {
    expect(getSafeRedirect('/sell/new')).toBe('/sell/new');
  });

  // ─── Unsafe / attack paths ────────────────────────────────────────────────
  it('rejects absolute URL https://evil.example', () => {
    expect(getSafeRedirect('https://evil.example')).toBe('/dashboard');
  });

  it('rejects protocol-relative //evil.example', () => {
    expect(getSafeRedirect('//evil.example')).toBe('/dashboard');
  });

  it('rejects backslash /\\\\evil.example', () => {
    expect(getSafeRedirect('/\\evil.example')).toBe('/dashboard');
  });

  it('rejects encoded double-slash %2F%2Fevil.example', () => {
    expect(getSafeRedirect('%2F%2Fevil.example')).toBe('/dashboard');
  });

  it('rejects path-encoded double-slash /%2F%2Fevil', () => {
    expect(getSafeRedirect('/%2F%2Fevil')).toBe('/dashboard');
  });

  it('rejects /login (auth loop)', () => {
    expect(getSafeRedirect('/login')).toBe('/dashboard');
  });

  it('rejects /signup (auth loop)', () => {
    expect(getSafeRedirect('/signup')).toBe('/dashboard');
  });

  it('rejects /logout (auth loop)', () => {
    expect(getSafeRedirect('/logout')).toBe('/dashboard');
  });

  it('rejects /api/auth/callback (auth loop)', () => {
    expect(getSafeRedirect('/api/auth/callback')).toBe('/dashboard');
  });

  it('rejects /auth/confirm', () => {
    expect(getSafeRedirect('/auth/confirm')).toBe('/dashboard');
  });

  it('rejects /check-email', () => {
    expect(getSafeRedirect('/check-email')).toBe('/dashboard');
  });

  it('falls back on null', () => {
    expect(getSafeRedirect(null)).toBe('/dashboard');
  });

  it('falls back on undefined', () => {
    expect(getSafeRedirect(undefined)).toBe('/dashboard');
  });

  it('falls back on empty string', () => {
    expect(getSafeRedirect('')).toBe('/dashboard');
  });

  it('rejects paths without leading slash', () => {
    expect(getSafeRedirect('evil.example')).toBe('/dashboard');
  });

  it('rejects URL with colon in path', () => {
    expect(getSafeRedirect('/evil:path')).toBe('/dashboard');
  });
});
