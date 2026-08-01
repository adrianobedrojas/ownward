import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('terms.title'), description: t('terms.description') };
}

export default async function TermsPage() {
  const t = await getTranslations('Terms');
  const paragraphs = t.raw('paragraphs') as string[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('badge')}</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{t('title')}</h1>
        {paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-slate-300">{paragraph}</p>)}
        <p className="mt-6 text-slate-300">{t('reviewPrivacy')} <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">{t('privacyPolicy')}</Link>.</p>
      </article>
    </main>
  );
}
