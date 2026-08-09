import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createNoIndexMetadata } from '@/lib/seo';
import { updatePassword } from './actions';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return createNoIndexMetadata({ locale, pathname: '/reset-password', title: t('resetPassword.title'), description: t('resetPassword.description') });
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations('Authentication.resetPassword');
  const params = await searchParams;
  const errorCode = params.error;
  const message = errorCode ? t(`errors.${errorCode}` as never) : null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('badge')}</p><h1 className="mt-2 text-2xl font-bold text-white">{t('title')}</h1><p className="mt-2 text-sm text-slate-400">{t('description')}</p></div>
        <form action={updatePassword} className="mt-8 space-y-6">
          {message ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{message}</div> : null}
          <div><label htmlFor="password" className="block text-sm font-semibold text-slate-300">{t('newPassword')}</label><input id="password" name="password" type="password" autoComplete="new-password" placeholder={t('newPasswordPlaceholder')} minLength={8} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
          <div><label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-300">{t('confirmNewPassword')}</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder={t('confirmNewPasswordPlaceholder')} minLength={8} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
          <p className="text-xs text-slate-500">{t('passwordHint')}</p>
          <button type="submit" className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('submit')}</button>
        </form>
        <div className="mt-8 border-t border-slate-800 pt-6 text-center"><Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white">{t('returnToLogin')}</Link></div>
      </section>
    </div>
  );
}
