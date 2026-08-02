/* eslint-disable @next/next/no-img-element */

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useTranslations: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string; fill?: boolean }) => {
    const { alt, src, fill: _fill, ...rest } = props;
    void _fill;
    return <img alt={alt} src={src} {...rest} />;
  },
}));

jest.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/server';
import Footer from '@/components/Footer';
import ContactPage from '@/app/[locale]/contact/page';
import HomePage from '@/app/[locale]/page';
import InstagramLink, { INSTAGRAM_URL } from '@/components/InstagramLink';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';

type Messages = typeof enMessages;

const mockedGetTranslations = getTranslations as jest.MockedFunction<typeof getTranslations>;
const mockedUseTranslations = useTranslations as jest.MockedFunction<typeof useTranslations>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

let currentLocale: 'en' | 'es' = 'en';

function getNamespaceMessages(namespace: keyof Messages, locale: 'en' | 'es') {
  const messages = locale === 'en' ? enMessages : esMessages;
  return messages[namespace];
}

function translator(namespace: keyof Messages, locale: 'en' | 'es') {
  const namespaceMessages = getNamespaceMessages(namespace, locale) as Record<string, unknown>;

  const t = ((key: string, values?: Record<string, string | number>) => {
    const resolved = key.split('.').reduce<unknown>((value, part) => {
      if (value && typeof value === 'object' && part in value) {
        return (value as Record<string, unknown>)[part];
      }
      return undefined;
    }, namespaceMessages);

    if (typeof resolved !== 'string') {
      throw new Error(`Missing string translation for ${String(namespace)}.${key}`);
    }

    if (!values) {
      return resolved;
    }

    return Object.entries(values).reduce(
      (message, [token, replacement]) => message.replaceAll(`{${token}}`, String(replacement)),
      resolved,
    );
  }) as ((key: string, values?: Record<string, string | number>) => string) & {
    raw: (key: string) => unknown;
  };

  t.raw = (key: string) =>
    key.split('.').reduce<unknown>((value, part) => {
      if (value && typeof value === 'object' && part in value) {
        return (value as Record<string, unknown>)[part];
      }
      return undefined;
    }, namespaceMessages);

  return t;
}

function createQueryBuilder() {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    not: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(async () => ({ data: [] })),
  };

  return builder;
}

async function renderFooter(locale: 'en' | 'es' = 'en') {
  currentLocale = locale;
  return renderToStaticMarkup(await Footer());
}

async function renderHome(locale: 'en' | 'es' = 'en') {
  currentLocale = locale;
  return renderToStaticMarkup(await HomePage());
}

function renderContact(locale: 'en' | 'es' = 'en') {
  currentLocale = locale;
  return renderToStaticMarkup(<ContactPage />);
}

describe('Instagram presence', () => {
  beforeEach(() => {
    mockedGetTranslations.mockImplementation((((namespace: keyof Messages) =>
      Promise.resolve(translator(namespace, currentLocale))) as unknown) as typeof getTranslations);
    mockedUseTranslations.mockImplementation(((namespace: keyof Messages) =>
      translator(namespace, currentLocale)) as typeof useTranslations);
    mockedCreateClient.mockResolvedValue({
      from: jest.fn(() => createQueryBuilder()),
    } as never);
  });

  it('uses the official Instagram URL with secure external-link attributes', () => {
    const markup = renderToStaticMarkup(
      <InstagramLink text="Follow @ownwardhub on Instagram" ariaLabel="Follow Ownward Hub on Instagram" />,
    );

    expect(INSTAGRAM_URL).toBe('https://www.instagram.com/ownwardhub/');
    expect(markup).toContain(`href="${INSTAGRAM_URL}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('aria-label="Follow Ownward Hub on Instagram"');
    expect(markup).toContain('<svg');
  });

  it('adds the footer Instagram link without removing existing footer links', async () => {
    const markup = await renderFooter('en');

    expect(markup).toContain('href="/guide"');
    expect(markup).toContain('href="/academy"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/privacy-choices"');
    expect(markup).toContain('href="/terms"');
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain(`href="${INSTAGRAM_URL}"`);
    expect(markup).toContain('@ownwardhub');
  });

  it('renders the homepage Instagram callout between articles and process in English and Spanish', async () => {
    const englishMarkup = await renderHome('en');
    const spanishMarkup = await renderHome('es');

    expect(englishMarkup).toContain('BEHIND OWNWARD');
    expect(englishMarkup).toContain('Follow Ownward as it grows');
    expect(englishMarkup).toContain('See behind-the-scenes progress, practical business ideas, founder lessons, and new Ownward Hub features.');
    expect(englishMarkup).toContain('Follow @ownwardhub on Instagram');
    expect(englishMarkup.indexOf('Practical guidance and real-world lessons')).toBeLessThan(
      englishMarkup.indexOf('Follow Ownward as it grows'),
    );
    expect(englishMarkup.indexOf('Follow Ownward as it grows')).toBeLessThan(
      englishMarkup.indexOf('How Ownward Hub works'),
    );

    expect(spanishMarkup).toContain('DETRÁS DE OWNWARD');
    expect(spanishMarkup).toContain('Sigue el crecimiento de Ownward');
    expect(spanishMarkup).toContain('Descubre avances detrás de escena, ideas prácticas para negocios, lecciones del fundador y nuevas funciones de Ownward Hub.');
    expect(spanishMarkup).toContain('Sigue a @ownwardhub en Instagram');
  });

  it('renders the contact page Instagram CTA and localized founder image alt text without changing the form CTA', () => {
    const englishMarkup = renderContact('en');
    const spanishMarkup = renderContact('es');

    expect(englishMarkup).toContain('alt="Adrian, founder of Ownward Hub"');
    expect(englishMarkup).toContain('Follow the journey of building Ownward Hub');
    expect(englishMarkup).toContain('@ownwardhub');
    expect(englishMarkup).toContain('Send Message');

    expect(spanishMarkup).toContain('alt="Adrian, fundador de Ownward Hub"');
    expect(spanishMarkup).toContain('Sigue el proceso de construir Ownward Hub');
    expect(spanishMarkup).toContain('@ownwardhub');
    expect(spanishMarkup).toContain('Enviar mensaje');
  });

  it('keeps the new translation keys synchronized across English and Spanish', () => {
    expect(Object.keys(enMessages.Footer).sort()).toEqual(Object.keys(esMessages.Footer).sort());
    expect(Object.keys(enMessages.Home.instagramPresence).sort()).toEqual(
      Object.keys(esMessages.Home.instagramPresence).sort(),
    );
    expect(Object.keys(enMessages.Contact).sort()).toEqual(Object.keys(esMessages.Contact).sort());
  });

  it('does not add Instagram embeds, tracking scripts, pixels, or API integrations', () => {
    const files = [
      '/home/runner/work/ownward/ownward/components/InstagramLink.tsx',
      '/home/runner/work/ownward/ownward/components/Footer.tsx',
      '/home/runner/work/ownward/ownward/app/[locale]/page.tsx',
      '/home/runner/work/ownward/ownward/app/[locale]/contact/page.tsx',
      '/home/runner/work/ownward/ownward/messages/en.json',
      '/home/runner/work/ownward/ownward/messages/es.json',
    ];

    const combined = files
      .map((file) => fs.readFileSync(path.resolve(file), 'utf8'))
      .join('\n')
      .toLowerCase();

    expect(combined).not.toContain('<iframe');
    expect(combined).not.toContain('instagram.com/embed');
    expect(combined).not.toContain('platform.instagram.com');
    expect(combined).not.toContain('tracking pixel');
    expect(combined).not.toContain('api.instagram');
  });
});
