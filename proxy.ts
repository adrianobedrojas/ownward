import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/proxy';

export const BYPASS_PATTERNS = [
  /^\/api\//,
  /^\/auth\//,
  /^\/_next\//,
  /^\/_vercel\//,
  /\.[^.]+$/,
];

const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: true,
});

export function isBypassedPath(pathname: string) {
  return BYPASS_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function shouldUsePanamaSpanish(request: Pick<NextRequest, 'cookies' | 'headers'>) {
  return !request.cookies.get('NEXT_LOCALE') && request.headers.get('x-vercel-ip-country') === 'PA';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBypassedPath(pathname)) {
    return updateSession(request, NextResponse.next({ request }));
  }

  const localeCookie = request.cookies.get('NEXT_LOCALE');
  const usePanamaSpanish = shouldUsePanamaSpanish(request);

  if (usePanamaSpanish) {
    request.cookies.set('NEXT_LOCALE', 'es');
  }

  const response = intlMiddleware(request);

  if (!localeCookie && usePanamaSpanish) {
    response.cookies.set('NEXT_LOCALE', 'es', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return updateSession(request, response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
