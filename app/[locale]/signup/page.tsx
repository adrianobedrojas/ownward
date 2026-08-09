import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createNoIndexMetadata } from '@/lib/seo';
import { PRIVACY_POLICY_PATH, TERMS_POLICY_PATH } from '@/lib/auth';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return createNoIndexMetadata({ locale, pathname: '/signup', title: t('signup.title'), description: t('signup.description') });
}

export default async function SignupPage() {
  const locale = await getLocale();
  const isSpanish = locale === 'es';
  const t = await getTranslations('Authentication.signup');
  const forms = await getTranslations('Forms');
  const accountTypes = t.raw('accountTypes') as Array<Record<string, string>>;

  return (
    <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('badge')}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('title')}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{t('description')}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">{accountTypes.map((accountType) => <article key={accountType.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold text-white">{accountType.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{accountType.description}</p></article>)}</div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('accountBadge')}</p><h2 className="mt-2 text-2xl font-bold text-white">{t('formTitle')}</h2><p className="mt-2 text-sm text-slate-400">{t('formDescription')}</p></div>
        <div className="mt-8">
          <GoogleSignInButton
            label={t('continueWithGoogle')}
            loadingLabel={t('connectingToGoogle')}
          />

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-800" />

            <span className="text-xs uppercase tracking-wider text-slate-500">
              {t('orUseEmail')}
            </span>

          <div className="h-px flex-1 bg-slate-800" />
        </div>
      </div>
        <form action="/api/signup" method="post" className="space-y-6">
          <div>
            <label htmlFor="account-type" className="block text-sm font-semibold text-slate-300">{t('accountTypeLabel')}</label>
            <select id="account-type" name="accountType" defaultValue="" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400">
              <option value="" disabled>{t('selectAccountType')}</option>
              <option value="owner">{t('accountTypeOptions.owner')}</option>
              <option value="buyer">{t('accountTypeOptions.buyer')}</option>
              <option value="owner-buyer">{t('accountTypeOptions.owner-buyer')}</option>
              <option value="advisor">{t('accountTypeOptions.advisor')}</option>
            </select>
          </div>
          <div><label htmlFor="full-name" className="block text-sm font-semibold text-slate-300">{forms('fullName')}</label><input id="full-name" name="fullName" type="text" autoComplete="name" placeholder={forms('fullName')} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
          <div><label htmlFor="business-name" className="block text-sm font-semibold text-slate-300">{forms('businessName')} <span className="ml-2 font-normal text-slate-500">Optional</span></label><input id="business-name" name="businessName" type="text" autoComplete="organization" placeholder={forms('businessName')} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
          <div><label htmlFor="email" className="block text-sm font-semibold text-slate-300">{forms('emailAddress')}</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="password" className="block text-sm font-semibold text-slate-300">{forms('password')}</label><input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" minLength={8} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
            <div><label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-300">{forms('confirmPassword')}</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" minLength={8} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /></div>
          </div>
          <p className="text-xs text-slate-500">{t('passwordHint')}</p>
          <label className="flex items-start gap-3 text-sm text-slate-300"><input name="agreement" type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400" /><span>{isSpanish ? 'Acepto los ' : 'I agree to the '}<Link href={TERMS_POLICY_PATH} className="font-semibold text-cyan-300 hover:text-cyan-200">{t('terms')}</Link>{isSpanish ? ' y reconozco la ' : ' and acknowledge the '}<Link href={PRIVACY_POLICY_PATH} className="font-semibold text-cyan-300 hover:text-cyan-200">{t('privacy')}</Link>.</span></label>
          <button type="submit" className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('submit')}</button>
          <p className="text-center text-xs text-slate-500">{t('secureNote')}</p>
        </form>
        <div className="mt-8 border-t border-slate-800 pt-6 text-center"><p className="text-sm text-slate-400">{t('haveAccount')}</p><Link href="/login" className="mt-3 inline-block font-semibold text-cyan-300 hover:text-cyan-200">{t('logIn')}</Link></div>
        <Link href="/" className="mt-6 block text-center text-sm font-semibold text-slate-400 hover:text-white">{t('returnHome')}</Link>
      </section>
    </div>
  );
}
