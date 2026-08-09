import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createNoIndexMetadata } from '@/lib/seo';
import { requestPasswordReset } from './actions';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return createNoIndexMetadata({ locale, pathname: '/forgot-password', title: t('forgotPassword.title'), description: t('forgotPassword.description') });
}

interface SearchParams { sent?: string; error?: string; }

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations('Authentication.forgotPassword');
  const forms = await getTranslations('Forms');
  const params = await searchParams;
  const sent = params.sent === '1';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('badge')}</p><h1 className="mt-2 text-2xl font-bold text-white">{t('title')}</h1><p className="mt-2 text-sm text-slate-400">{t('description')}</p></div>
        {sent ? (
          <div className="mt-8"><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center"><p className="font-semibold text-emerald-300">{t('checkEmailTitle')}</p><p className="mt-2 text-sm text-emerald-400/80">{t('checkEmailDescription')}</p></div><Link href="/login" className="mt-6 block text-center text-sm font-semibold text-cyan-300 hover:text-cyan-200">{t('returnToLogin')}</Link></div>
        ) : (
          <form action={requestPasswordReset} className="mt-8 space-y-6">
            {params.error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{params.error === 'missing-email' ? t('missingEmail') : t('genericError')}</div> : null}
            <div><label htmlFor="email" className="block text-sm font-semibold text-slate-300">{forms('emailAddress')}</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
            <button type="submit" className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('submit')}</button>
          </form>
        )}
        <div className="mt-8 border-t border-slate-800 pt-6 text-center"><Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white">{t('returnToLogin')}</Link></div>
      </section>
    </div>
  );
}
