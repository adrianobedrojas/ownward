import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('sell.title'), description: t('sell.description') };
}

export default async function SellBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params; // locale not needed here; i18n Link handles prefixing
  const t = await getTranslations('Sell');
  const tStudio = await getTranslations('ListingStudio');
  const steps = t.raw('prepSteps') as Array<Record<string, string>>;
  const areas = t.raw('reviewAreas') as Array<Record<string, string>>;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('heroBadge')}</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{t('heroTitle')}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">{t('heroDescription')}</p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Studio CTA */}
        <section className="rounded-xl border border-cyan-400/30 bg-slate-900 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{tStudio('intro.badge')}</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{tStudio('intro.title')}</h2>
            <p className="mt-2 text-sm text-slate-400">{tStudio('intro.description')}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sell/new"
              className="flex-1 rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {tStudio('intro.startCta')}
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-slate-700 px-5 py-3 text-center font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              {t('resumeCta')}
            </Link>
          </div>

          <div className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="font-semibold text-amber-300">{t('protectTitle')}</p>
            <p className="mt-1 text-sm text-slate-300">{t('protectDescription')}</p>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('prepBadge')}</p>
            <h2 className="mt-2 text-xl font-bold text-white">{t('prepTitle')}</h2>
            <div className="mt-6 space-y-5">{steps.map((step) => <div key={step.number} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">{step.number}</span><div><h3 className="font-semibold text-white">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{step.description}</p></div></div>)}</div>
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold text-white">{t('recordsTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{t('recordsDescription')}</p>
            <Link href="/documents" className="mt-5 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10">{t('recordsCta')}</Link>
          </section>
        </aside>
      </div>

      <section className="mt-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('reviewBadge')}</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{t('reviewTitle')}</h2>
          <p className="mt-2 max-w-3xl text-slate-400">{t('reviewDescription')}</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{areas.map((area) => <article key={area.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><h3 className="font-semibold text-white">{area.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{area.description}</p></article>)}</div>
      </section>

      <section className="mt-12 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="font-semibold text-white">{t('importantTitle')}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{t('importantDescription')}</p>
      </section>
    </section>
  );
}
