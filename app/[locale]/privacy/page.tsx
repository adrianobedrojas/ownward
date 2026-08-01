import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { OpenPrivacyChoicesButton } from '@/components/PrivacyConsent';

const effectiveDate = 'July 31, 2026';
const lastUpdatedDate = 'July 31, 2026';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('privacy.title'), description: t('privacy.description') };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('Privacy');
  const sections = t.raw('sections') as Array<{ id: string; label: string; title: string; body?: string[]; bullets?: string[] }>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('pageBadge')}</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{t('pageTitle')}</h1>
        <p className="mt-4 text-sm text-slate-300"><span className="font-semibold text-white">{t('effectiveDateLabel')}</span> {effectiveDate}<span className="mx-2 text-slate-500">•</span><span className="font-semibold text-white">{t('lastUpdatedLabel')}</span> {lastUpdatedDate}</p>
        <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-slate-800 bg-slate-950/70 p-5"><h2 className="text-lg font-semibold text-white">{t('tocTitle')}</h2><ol className="mt-3 grid gap-2 sm:grid-cols-2">{sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="text-cyan-300 transition hover:text-cyan-200">{section.label}</a></li>)}</ol></nav>
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="mt-8 space-y-4">
            <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
            {section.body?.map((paragraph) => <p key={paragraph} className="text-slate-300">{paragraph}</p>)}
            {section.bullets ? <ul className="list-disc space-y-2 pl-6 text-slate-300">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
            {section.id === 'cookies-and-storage' ? <div className="flex flex-wrap gap-3"><OpenPrivacyChoicesButton>{t('openChoices')}</OpenPrivacyChoicesButton><Link href="/privacy-choices" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{t('privacyChoicesPage')}</Link></div> : null}
            {section.id === 'contact' ? <p className="text-slate-300"><Link href={`mailto:${t('contactEmail')}`} className="font-semibold text-cyan-300 hover:text-cyan-200">{t('contactEmail')}</Link>.</p> : null}
          </section>
        ))}
      </article>
    </main>
  );
}
