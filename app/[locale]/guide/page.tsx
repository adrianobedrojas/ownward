import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const categorySlugs = ['run', 'grow', 'value', 'sell', 'buy', 'stories'] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('guide.title'), description: t('guide.description') };
}

export default async function GuideIndexPage() {
  const t = await getTranslations('Guide');
  const situations = t.raw('situations') as Array<Record<string, string>>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-slate-100 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('heroBadge')}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('heroTitle')}</h1>
        <p className="mt-4 text-lg leading-7 text-slate-300">{t('heroDescription')}</p>
      </div>

      <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white">{t('situationsTitle')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {situations.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-white">
              <span>{item.label}</span>
              <span className="text-cyan-400">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold text-white">{t('categoriesTitle')}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categorySlugs.map((slug) => {
            const category = t.raw(`categories.${slug}`) as Record<string, string>;
            return (
              <article key={slug} className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700 hover:bg-slate-900">
                <div>
                  <h3 className="text-xl font-semibold text-white">{category.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{category.description}</p>
                </div>
                <div className="mt-6 border-t border-slate-800 pt-4">
                  <p className="text-xs font-medium text-cyan-400">{category.cta}</p>
                  <div className="mt-3 flex items-center gap-4">
                    {slug !== 'stories' ? <Link href={`/guide/${slug}`} className="inline-block text-sm font-semibold text-white hover:text-cyan-300">{t('browseCategory')}</Link> : null}
                    <Link href={slug === 'run' ? '/dashboard' : slug === 'grow' ? '/grow' : slug === 'value' ? '/valuation' : slug === 'sell' ? '/sell' : slug === 'buy' ? '/buy' : '/guide/stories'} className="inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200">{category.ctaLabel} →</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
