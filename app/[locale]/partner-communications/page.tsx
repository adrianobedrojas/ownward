import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createMetadata } from '@/lib/seo';
import { LEGAL_OPERATOR } from '@/lib/legal-content';
import {
  CURRENT_PARTNER_COMMUNICATIONS_VERSION,
  PARTNER_COMMUNICATIONS_PATH,
} from '@/lib/policies';
import { partnerCommunicationsContent } from '@/lib/partner-communications-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return createMetadata({
    locale,
    pathname: PARTNER_COMMUNICATIONS_PATH,
    title: t('partnerCommunications.title'),
    description: t('partnerCommunications.description'),
  });
}

export default async function PartnerCommunicationsPage() {
  const locale = await getLocale();
  const isSpanish = locale === 'es';

  const content =
    partnerCommunicationsContent[isSpanish ? 'es' : 'en'];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          {content.badge}
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          {content.title}
        </h1>

        <p className="mt-4 text-sm text-slate-300">
          <span className="font-semibold text-white">
            {content.effectiveDateLabel}:
          </span>{' '}
          {content.effectiveDate}

          <span className="mx-2 text-slate-500">•</span>

          <span className="font-semibold text-white">
            {content.lastUpdatedLabel}:
          </span>{' '}
          {content.lastUpdated}

          <span className="mx-2 text-slate-500">•</span>

          <span className="font-semibold text-white">
            {content.versionLabel}:
          </span>{' '}
          {CURRENT_PARTNER_COMMUNICATIONS_VERSION}
        </p>

        <p className="mt-4 text-slate-300">
          {content.notice}
        </p>

        <nav
          aria-label={isSpanish ? 'Tabla de contenidos' : 'Table of contents'}
          className="mt-8 rounded-xl border border-slate-800 bg-slate-950/70 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            {isSpanish ? 'Tabla de contenidos' : 'Table of contents'}
          </h2>

          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {content.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-cyan-300 transition hover:text-cyan-200"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {content.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="mt-8 space-y-3"
          >
            <h2 className="text-2xl font-semibold text-white">
              {section.title}
            </h2>

            <p className="text-slate-300">{section.content}</p>
          </section>
        ))}

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
          <p>
            {isSpanish
              ? 'Enlaces legales relacionados:'
              : 'Related legal links:'}
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/terms"
              className="font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {content.termsLinkText}
            </Link>

            <Link
              href="/privacy"
              className="font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {content.privacyLinkText}
            </Link>

            <Link
              href="/privacy-choices"
              className="font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {isSpanish
                ? 'Opciones de privacidad'
                : 'Privacy choices'}
            </Link>
          </div>

          <p className="mt-3 text-slate-400">
            {isSpanish
              ? 'Contacto legal y de privacidad:'
              : 'Legal and privacy contact:'}{' '}
            <a
              href={`mailto:${LEGAL_OPERATOR.email}`}
              className="text-cyan-300 hover:text-cyan-200"
            >
              {LEGAL_OPERATOR.email}
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
