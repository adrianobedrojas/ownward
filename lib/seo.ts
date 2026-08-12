import type { Metadata, MetadataRoute } from 'next';
import type { ProductStatus } from '@/lib/commerce/products';

export const SITE_NAME = 'Ownward Hub';
export const SITE_ORIGIN_FALLBACK = 'https://ownwardhub.com';
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image';
export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export type AbsoluteUrlInput = `/${string}` | '';

export const PUBLIC_STATIC_PATHS = [
  '',
  '/buy',
  '/sell',
  '/start',
  '/business-idea-readiness-check',
  '/grow',
  '/valuation',
  '/sale-readiness',
  '/customer-concentration',
  '/solutions',
  '/guide',
  '/academy',
  '/blog',
  '/pricing',
  '/trust',
  '/privacy',
  '/privacy-choices',
  '/partner-communications',
  '/contact',
  '/terms',
] as const;

export const AUTH_NOINDEX_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/check-email',
  '/confirm-email',
  '/auth-error',
] as const;

export const ROBOTS_DISALLOW_PREFIXES = [
  '/api',
  '/auth',
  '/admin',
  '/account',
  '/dashboard',
  '/messages',
  '/documents',
  '/upload',
  '/settings',
  '/deals',
  '/money',
  '/business',
  '/customers',
  '/profile',
  '/portfolio',
  '/saved',
  '/seller',
  '/support',
  '/tasks',
  '/team',
  '/onboarding',
  '/health',
  '/invoices',
] as const;

export const ROBOTS_DISALLOW_PATTERNS = [
  '/sell/*/edit',
  '/sell/*/preview',
  '/valuation/*',
  '/deals/invite/*',
  '/team/invite/*',
] as const;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '') || '/';
}

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value?: string): AppLocale {
  return value === 'es' ? 'es' : 'en';
}

export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || SITE_ORIGIN_FALLBACK;
  return trimTrailingSlash(new URL(raw).toString());
}

export function normalizePathname(pathname: string): AbsoluteUrlInput {
  if (!pathname || pathname === '/') {
    return '';
  }

  return (`/${pathname.replace(/^\/+/, '').replace(/\/+$/, '')}`) as AbsoluteUrlInput;
}

export function getLocalizedPath(pathname: string, locale: AppLocale): string {
  const normalizedPath = normalizePathname(pathname);
  if (locale === 'en') {
    return normalizedPath || '/';
  }

  return normalizedPath ? `/es${normalizedPath}` : '/es';
}

export function getAbsoluteUrl(pathname: string, locale?: AppLocale): string {
  const path = locale ? getLocalizedPath(pathname, locale) : normalizePathname(pathname) || '/';
  return new URL(path, getSiteOrigin()).toString();
}

export function buildLanguageAlternates(pathname: string): Record<string, string> {
  return {
    en: getAbsoluteUrl(pathname, 'en'),
    es: getAbsoluteUrl(pathname, 'es'),
    'x-default': getAbsoluteUrl(pathname, 'en'),
  };
}

function stripBranding(title: string): string {
  return title
    .replace(/^Ownward Hub\s*[|｜—-]\s*/i, '')
    .replace(/^Ownward\s+[|｜—-]?\s*/i, '')
    .replace(/\s*[|｜]\s*Ownward Hub$/i, '')
    .replace(/\s*[|｜]\s*Ownward$/i, '')
    .trim();
}

export function buildTitle(title: string): string {
  const normalized = stripBranding(title);
  return normalized || SITE_NAME;
}

export function createMetadata(options: {
  locale: string;
  pathname: string;
  title: string;
  description: string;
  imagePath?: string;
  type?: 'website' | 'article';
  index?: boolean;
  follow?: boolean;
}): Metadata {
  const locale = normalizeLocale(options.locale);
  const title = buildTitle(options.title);
  const description = options.description.trim();
  const canonical = getAbsoluteUrl(options.pathname, locale);
  const languages = buildLanguageAlternates(options.pathname);
  const imageUrl = getAbsoluteUrl(options.imagePath ?? DEFAULT_OG_IMAGE_PATH);
  const index = options.index ?? true;
  const follow = options.follow ?? true;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: options.type ?? 'website',
      url: canonical,
      title,
      description,
      siteName: SITE_NAME,
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} preview image`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index,
      follow,
    },
  };
}

export function buildBusinessListingSeoTitle(locale: string, publicTitle: string, location?: string | null): string {
  const trimmedTitle = publicTitle.trim();
  const trimmedLocation = location?.trim();
  if (!trimmedLocation) {
    return locale === 'es' ? `${trimmedTitle} en venta` : `${trimmedTitle} for Sale`;
  }

  return locale === 'es'
    ? `${trimmedTitle} en venta en ${trimmedLocation}`
    : `${trimmedTitle} for Sale in ${trimmedLocation}`;
}

export function createNoIndexMetadata(options: {
  locale: string;
  pathname: string;
  title: string;
  description: string;
}): Metadata {
  return createMetadata({ ...options, index: false, follow: false });
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function isMeaningfulLocalizedContent(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function shouldExposeSpanishListing(alternatives: Array<string | null | undefined>): boolean {
  return alternatives.some(isMeaningfulLocalizedContent);
}

export function isSolutionIndexable(status: ProductStatus): boolean {
  return status === 'active' || status === 'included';
}

export function isExplicitNoIndexPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname) || '/';
  const basePath = normalized.startsWith('/es/') ? normalized.slice(3) : normalized === '/es' ? '/' : normalized;
  return (AUTH_NOINDEX_PATHS as readonly string[]).includes(basePath);
}

export function shouldRobotsDisallow(pathname: string): boolean {
  const normalized = normalizePathname(pathname) || '/';
  const basePath = normalized.startsWith('/es/') ? normalized.slice(3) : normalized === '/es' ? '/' : normalized;

  return ROBOTS_DISALLOW_PREFIXES.some((prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`))
    || isExplicitNoIndexPath(basePath);
}

export function createRobots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();
  const disallow = [
    ...AUTH_NOINDEX_PATHS,
    ...AUTH_NOINDEX_PATHS.map((path) => `/es${path}`),
    ...ROBOTS_DISALLOW_PREFIXES,
    ...ROBOTS_DISALLOW_PREFIXES.map((path) => `/es${path}`),
    ...ROBOTS_DISALLOW_PATTERNS,
    ...ROBOTS_DISALLOW_PATTERNS.map((path) => `/es${path}`),
  ];

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}

export function createSitemapAlternates(pathname: string): MetadataRoute.Sitemap[number]['alternates'] {
  return {
    languages: buildLanguageAlternates(pathname),
  };
}
