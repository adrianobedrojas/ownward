jest.mock('next-intl/routing', () => ({
  defineRouting: (config: unknown) => config,
}));

jest.mock('next-intl/navigation', () => ({
  createNavigation: (routing: { defaultLocale: string }) => ({
    getPathname: ({ locale, href }: { locale: string; href: string }) =>
      locale === routing.defaultLocale ? href : `/${locale}${href}`,
  }),
}));

jest.mock('next-intl/middleware', () => () => () => null);

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

import { NextRequest, NextResponse } from 'next/server';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { isBypassedPath, shouldUsePanamaSpanish } from '@/proxy';
import { updateSession } from '@/lib/supabase/proxy';
import { createServerClient } from '@supabase/ssr';

const mockedCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe('i18n routing', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('defaults PA visitors without a locale cookie to Spanish', () => {
    const request = new NextRequest('https://example.com/pricing', {
      headers: { 'x-vercel-ip-country': 'PA' },
    });
    expect(shouldUsePanamaSpanish(request)).toBe(true);
  });

  it('keeps an existing English preference for PA visitors', () => {
    const request = new NextRequest('https://example.com/pricing', {
      headers: { cookie: 'NEXT_LOCALE=en', 'x-vercel-ip-country': 'PA' },
    });
    expect(shouldUsePanamaSpanish(request)).toBe(false);
  });

  it('builds Spanish route prefixes', () => {
    expect(getPathname({ locale: 'es', href: '/pricing' })).toBe('/es/pricing');
  });

  it('keeps English routes without an /en prefix', () => {
    expect(getPathname({ locale: 'en', href: '/pricing' })).toBe('/pricing');
  });

  it('preserves dynamic pathnames when switching locales', () => {
    expect(getPathname({ locale: 'es', href: '/messages/abc123' })).toBe('/es/messages/abc123');
    expect(getPathname({ locale: 'en', href: '/messages/abc123' })).toBe('/messages/abc123');
  });

  it('does not localize API routes', () => {
    expect(isBypassedPath('/api/checkout')).toBe(true);
    expect(isBypassedPath('/api/documents/download')).toBe(true);
  });

  it('does not localize auth callback routes', () => {
    expect(isBypassedPath('/auth/confirm')).toBe(true);
  });

  it('merges Supabase cookies onto an existing i18n response', async () => {
    mockedCreateServerClient.mockImplementation((url, key, options) => {
      options.cookies.setAll?.(
        [{ name: 'sb-access-token', value: 'token', options: { path: '/' } }],
        {},
      );
      return {
        auth: {
          getClaims: jest.fn().mockResolvedValue({ data: null }),
        },
      } as never;
    });

    const request = new NextRequest('https://example.com/es/pricing');
    const response = NextResponse.next({ request });
    response.cookies.set('NEXT_LOCALE', 'es', { path: '/' });

    const merged = await updateSession(request, response);

    expect(merged.cookies.get('NEXT_LOCALE')?.value).toBe('es');
    expect(merged.cookies.get('sb-access-token')?.value).toBe('token');
  });

  it('keeps locale cookies when Supabase refresh runs', async () => {
    mockedCreateServerClient.mockImplementation((url, key, options) => {
      options.cookies.setAll?.(
        [{ name: 'sb-refresh-token', value: 'refresh', options: { path: '/' } }],
        { 'x-test': '1' },
      );
      return {
        auth: {
          getClaims: jest.fn().mockResolvedValue({ data: null }),
        },
      } as never;
    });

    const request = new NextRequest('https://example.com/pricing', {
      headers: { cookie: 'NEXT_LOCALE=es' },
    });
    const response = NextResponse.next({ request });
    response.cookies.set('NEXT_LOCALE', 'es', { path: '/' });

    const merged = await updateSession(request, response);

    expect(merged.cookies.get('NEXT_LOCALE')?.value).toBe('es');
    expect(merged.cookies.get('sb-refresh-token')?.value).toBe('refresh');
    expect(merged.headers.get('x-test')).toBe('1');
  });

  it('rejects unsupported locales', () => {
    expect(routing.locales.includes('fr' as never)).toBe(false);
  });

  it('supports dynamic guide routes for both locales', () => {
    expect(getPathname({ locale: 'es', href: '/guide/buy/sba-loan-qualification' })).toBe('/es/guide/buy/sba-loan-qualification');
    expect(getPathname({ locale: 'en', href: '/guide/buy/sba-loan-qualification' })).toBe('/guide/buy/sba-loan-qualification');
  });

  it('supports /start route for English', () => {
    expect(getPathname({ locale: 'en', href: '/start' })).toBe('/start');
  });

  it('supports /es/start route for Spanish', () => {
    expect(getPathname({ locale: 'es', href: '/start' })).toBe('/es/start');
  });

  it('supports /guide/start for English', () => {
    expect(getPathname({ locale: 'en', href: '/guide/start' })).toBe('/guide/start');
  });

  it('supports /es/guide/start for Spanish', () => {
    expect(getPathname({ locale: 'es', href: '/guide/start' })).toBe('/es/guide/start');
  });

  it('keeps checkout and download endpoints operational', () => {
    expect(isBypassedPath('/api/checkout')).toBe(true);
    expect(isBypassedPath('/api/documents/download')).toBe(true);
    expect(isBypassedPath('/api/billing/portal')).toBe(true);
  });
});
