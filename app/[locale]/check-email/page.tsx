import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('checkEmail.title'), description: t('checkEmail.description') };
}

export default async function CheckEmailPage() {
  const t = await getTranslations('Authentication.checkEmail');
  const helpPoints = t.raw('helpPoints') as string[];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-slate-950">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-3xl">✉️</div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('badge')}</p>
        <h1 className="mt-3 text-3xl font-bold text-white">{t('title')}</h1>
        <p className="mt-4 leading-7 text-slate-300">{t('description')}</p>
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5 text-left"><h2 className="font-semibold text-white">{t('helpTitle')}</h2><ul className="mt-3 space-y-2 text-sm text-slate-400">{helpPoints.map((point) => <li key={point}>• {point}</li>)}</ul></div>
        <Link href="/login" className="mt-8 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('returnToLogin')}</Link>
        <Link href="/" className="mt-5 block text-sm font-semibold text-slate-400 hover:text-white">{t('returnHome')}</Link>
      </section>
    </div>
  );
}
