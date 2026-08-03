import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getSafeRedirect } from '@/lib/auth/safe-redirect';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('login.title'), description: t('login.description') };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const t = await getTranslations('Authentication.login');
  const forms = await getTranslations('Forms');
  const { next } = await searchParams;
  // Validate the next param server-side; the hidden input only carries safe values
  const safeNext = getSafeRedirect(next ?? null);

  return (
    <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('badge')}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('title')}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{t('description')}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="font-semibold text-white">{t('ownersTitle')}</p><p className="mt-2 text-sm leading-6 text-slate-400">{t('ownersDescription')}</p></article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="font-semibold text-white">{t('buyersTitle')}</p><p className="mt-2 text-sm leading-6 text-slate-400">{t('buyersDescription')}</p></article>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('accountBadge')}</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{t('formTitle')}</h2>
          <p className="mt-2 text-sm text-slate-400">{t('formDescription')}</p>
        </div>
        <form action="/api/login" method="post" className="mt-8 space-y-6">
          {/* Pass the validated redirect destination through the form */}
          <input type="hidden" name="next" value={safeNext} />
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-300">{forms('emailAddress')}</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" />
          </div>
          <div>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300">{forms('password')}</label>
              <span className="text-xs text-slate-500"><Link href="/forgot-password" className="text-cyan-400 hover:text-cyan-300">{t('forgotPassword')}</Link></span>
            </div>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" />
          </div>
          <button type="submit" className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('submit')}</button>
          <p className="text-center text-xs text-slate-500">{t('secureNote')}</p>
        </form>
        <div className="mt-8 border-t border-slate-800 pt-6 text-center"><p className="text-sm text-slate-400">{t('noAccount')}</p><Link href="/signup" className="mt-3 inline-block font-semibold text-cyan-300 hover:text-cyan-200">{t('createAccount')}</Link></div>
        <Link href="/" className="mt-6 block text-center text-sm font-semibold text-slate-400 hover:text-white">{t('returnHome')}</Link>
      </section>
    </div>
  );
}
