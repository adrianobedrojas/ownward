import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { OpenPrivacyChoicesButton } from '@/components/PrivacyConsent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('privacyChoices.title'), description: t('privacyChoices.description') };
}

export default async function PrivacyChoicesPage() {
  const t = await getTranslations('Privacy');

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('choicesPageBadge')}</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{t('choicesPageTitle')}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-300">{t('choicesPageDescription')} <code className="rounded bg-slate-950 px-2 py-1 text-sm text-cyan-300">ownward_privacy_consent_v1</code>.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"><h2 className="font-semibold text-white">{t('choicesPageNecessaryTitle')}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{t('choicesPageNecessaryDescription')}</p></article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"><h2 className="font-semibold text-white">{t('choicesPageFunctionalityTitle')}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{t('choicesPageFunctionalityDescription')}</p></article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"><h2 className="font-semibold text-white">{t('choicesPageAnalyticsTitle')}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{t('choicesPageAnalyticsDescription')}</p></article>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <OpenPrivacyChoicesButton className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('choicesPageOpenPanel')}</OpenPrivacyChoicesButton>
          <Link href="/privacy" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{t('pageBadge')}</Link>
          <Link href={`mailto:${t('contactEmail')}`} className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{t('contactEmail')}</Link>
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-400">{t('choicesPageFooter')}</p>
      </section>
    </main>
  );
}
