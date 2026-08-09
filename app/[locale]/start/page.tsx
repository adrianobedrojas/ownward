import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import StartBusinessPlanner from './StartBusinessPlanner';
import { getGuideArticlesByCategory } from '@/lib/guide-content';
import { createMetadata } from '@/lib/seo';

interface StartPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
}

export async function generateMetadata({ params }: StartPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return createMetadata({ locale, pathname: '/start', title: t('start.title'), description: t('start.description') });
}

export default async function StartPage({ params, searchParams }: StartPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const showWelcome = sp.welcome === '1';
  const t = await getTranslations({ locale, namespace: 'StartBusiness' });

  // Check sign-in state (non-blocking — public page)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isSignedIn = !!user;

  // Fetch startup guide articles for the guide CTA section
  const startArticles = getGuideArticlesByCategory('start').slice(0, 4);

  const stages: string[] = t.raw('stages') as string[];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('heroBadge')}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('heroTitle')}</h1>
          <p className="mt-4 text-lg leading-7 text-slate-300">{t('heroDescription')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#planner"
              className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {t('primaryCta')}
            </a>
            <Link
              href="/guide/start"
              className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800"
            >
              {t('secondaryCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Startup readiness overview */}
      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('stagesTitle')}</p>
          <p className="mt-2 text-slate-300">{t('stagesDescription')}</p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={t('stagesTitle')}>
          {stages.map((stage, idx) => (
            <li key={idx} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">
                {idx + 1}
              </span>
              <span className="text-sm leading-6 text-slate-300">{stage}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Planner */}
      <section id="planner" className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6 scroll-mt-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('plannerTitle')}</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{t('plannerDescription')}</h2>
        </div>
        <div className="mt-8 max-w-2xl">
          <StartBusinessPlanner
            locale={locale}
            isSignedIn={isSignedIn}
            showWelcome={showWelcome}
          />
        </div>
      </section>

      {/* Startup Guide articles */}
      {startArticles.length > 0 && (
        <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('guidesTitle')}</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{t('guidesDescription')}</h2>
            </div>
            <Link href="/guide/start" className="shrink-0 text-sm font-semibold text-cyan-400 hover:underline">
              {t('guidesCta')}
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {startArticles.map((article) => (
              <article
                key={article.slug}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div>
                  <span className="text-xs font-semibold uppercase text-cyan-400">Start a Business</span>
                  <h3 className="mt-2 font-bold text-white">{article.cardTitle ?? article.title}</h3>
                  <p className="mt-2 text-xs text-slate-400">{article.description}</p>
                </div>
                <Link
                  href={`/guide/start/${article.slug}`}
                  className="mt-4 text-xs font-semibold text-cyan-300 hover:underline"
                >
                  Read article →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
