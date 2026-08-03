import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import InstagramLink from '@/components/InstagramLink';
import { createClient } from '@/lib/supabase/server';
import { capitalizeFirst } from '@/lib/documents';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('home.title'),
    description: t('home.description'),
  };
}

export default async function HomePage() {
  const t = await getTranslations('Home');
  const supabase = await createClient();
  const now = new Date().toISOString();
  const journeyCards = t.raw('journey.cards') as Array<Record<string, string>>;
  const tabs = t.raw('preview.tabs') as string[];
  const capabilityCards = t.raw('capabilities.cards') as Array<Record<string, string>>;
  const articleCards = t.raw('articles.cards') as Array<Record<string, string>>;
  const processSteps = t.raw('process.steps') as Array<Record<string, string>>;
  const pricingPlans = t.raw('pricingPreview.plans') as Array<Record<string, string>>;

  const { data: featuredListings = [] } = await supabase
    .from('business_listings')
    .select('id, slug, business_name, category, location, summary, asking_price, annual_revenue, featured_until')
    .eq('is_public', true)
    .eq('status', 'published')
    .gt('featured_until', now)
    .order('featured_until', { ascending: false })
    .limit(3);

  const featuredIds = new Set((featuredListings ?? []).map((listing) => listing.id));
  let fillListings: typeof featuredListings = [];

  if ((featuredListings ?? []).length < 3) {
    const needed = 3 - (featuredListings ?? []).length;
    const { data: newer = [] } = await supabase
      .from('business_listings')
      .select('id, slug, business_name, category, location, summary, asking_price, annual_revenue, featured_until')
      .eq('is_public', true)
      .eq('status', 'published')
      .not('id', 'in', `(${[...featuredIds, '00000000-0000-0000-0000-000000000000'].join(',')})`)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(needed);
    fillListings = newer ?? [];
  }

  const previewListings = [...(featuredListings ?? []), ...fillListings];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('hero.badge')}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">{t('hero.title')}</h1>
            <p className="mt-4 text-lg leading-7 text-slate-300">{t('hero.description')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/buy" className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('hero.primaryCta')}</Link>
              <Link href="/sell" className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800">{t('hero.secondaryCta')}</Link>
              <Link href="/dashboard" className="rounded-lg border border-slate-800 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white">{t('hero.tertiaryCta')}</Link>
            </div>
            <div className="mt-5">
              <Link href="/guide" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:underline">{t('hero.guideCta')}</Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono text-slate-400">{t('preview.browserLabel')}</span>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-2 rounded-lg bg-slate-950 p-1 text-center text-xs font-semibold text-slate-400">
              {tabs.map((tab, index) => (
                <span key={tab} className={index === 0 ? 'rounded-md bg-cyan-400/10 py-2 text-cyan-300' : 'py-2 hover:text-white'}>{tab}</span>
              ))}
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">{t('preview.valueLabel')}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">{t('preview.valueAmount')}</p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                  <span>{t('preview.valueMeta')}</span>
                  <span className="font-medium text-cyan-400">{t('preview.valueStatus')}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-400">{t('preview.monthlyRevenueLabel')}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{t('preview.monthlyRevenueValue')}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-400">{t('preview.documentsLabel')}</p>
                  <p className="mt-1 text-lg font-semibold text-cyan-300">{t('preview.documentsValue')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('journey.badge')}</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{t('journey.title')}</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {journeyCards.map((card) => (
            <div key={card.title} className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-cyan-400">
              <div>
                <span className="inline-block rounded-lg bg-cyan-400/10 p-3 text-2xl">{card.emoji}</span>
                <h3 className="mt-4 text-xl font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
              </div>
              <Link href={card.href} className="mt-6 inline-block rounded-lg bg-slate-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700">{card.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('marketplace.badge')}</p>
            <h2 className="mt-2 text-3xl font-bold text-white">{t('marketplace.title')}</h2>
          </div>
          <Link href="/buy" className="text-sm font-semibold text-cyan-400 hover:underline">{t('marketplace.viewAll')}</Link>
        </div>

        {previewListings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-lg font-semibold text-white">{t('marketplace.emptyTitle')}</p>
            <p className="mt-2 text-sm text-slate-400">{t('marketplace.emptyDescription')}</p>
            <Link href="/sell" className="mt-6 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('marketplace.emptyCta')}</Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {previewListings.map((listing) => {
              const isFeatured = listing.featured_until && new Date(listing.featured_until) > new Date(now);
              return (
                <article key={listing.id} className={`rounded-2xl border bg-slate-900/60 p-6 ${isFeatured ? 'border-amber-500/40 ring-1 ring-amber-500/10' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">{listing.category ? capitalizeFirst(listing.category) : t('marketplace.categoryFallback')}</span>
                    {isFeatured ? <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">{t('marketplace.featured')}</span> : null}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">{listing.business_name}</h3>
                  {listing.location ? <p className="mt-1 text-xs text-slate-400">{listing.location}</p> : null}
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{listing.summary || ''}</p>
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">{t('marketplace.askingPrice')}</p>
                      <p className="font-semibold text-white">{listing.asking_price ? `$${Number(listing.asking_price).toLocaleString()}` : t('marketplace.notSet')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t('marketplace.annualRevenue')}</p>
                      <p className="font-semibold text-white">{listing.annual_revenue ? `$${Number(listing.annual_revenue).toLocaleString()}` : t('marketplace.notSet')}</p>
                    </div>
                  </div>
                  {listing.slug ? <Link href={`/b/${listing.slug}`} className="mt-5 block rounded-lg bg-cyan-400/10 px-4 py-2.5 text-center text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950">{t('marketplace.viewDetails')}</Link> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="features" className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('capabilities.badge')}</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{t('capabilities.title')}</h2>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {capabilityCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
              <h3 className="text-xl font-bold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 p-8 text-center shadow-xl sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('assessment.badge')}</p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{t('assessment.title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">{t('assessment.description')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/valuation?mode=quick" className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('assessment.cta')}</Link>
            <Link href="/guide/value/how-much-is-my-business-worth" className="rounded-lg border border-slate-600 px-6 py-3 font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800">{t('assessment.secondaryCta')}</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('articles.badge')}</p>
            <h2 className="mt-2 text-3xl font-bold text-white">{t('articles.title')}</h2>
          </div>
          <Link href="/guide" className="text-sm font-semibold text-cyan-400 hover:underline">{t('articles.viewAll')}</Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {articleCards.map((card) => (
            <article key={card.title} className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div>
                <span className="text-xs font-semibold uppercase text-cyan-400">{card.badge}</span>
                <h3 className="mt-2 font-bold text-white">{card.title}</h3>
                <p className="mt-2 text-xs text-slate-400">{card.description}</p>
              </div>
              <Link href={card.href} className="mt-4 text-xs font-semibold text-cyan-300 hover:underline">{card.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-8 shadow-xl shadow-cyan-950/10 sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">{t('instagramPresence.eyebrow')}</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{t('instagramPresence.title')}</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{t('instagramPresence.description')}</p>
            <InstagramLink
              text={t('instagramPresence.cta')}
              ariaLabel={t('instagramPresence.ariaLabel')}
              className="mt-6 bg-cyan-400/10 px-4 py-3 font-semibold text-cyan-300 hover:bg-cyan-400 hover:text-slate-950"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('process.badge')}</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{t('process.title')}</h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {processSteps.map((step) => (
            <div key={step.number} className="text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-lg font-bold text-cyan-300">{step.number}</span>
              <h3 className="mt-4 text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('pricingPreview.badge')}</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{t('pricingPreview.title')}</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <div key={plan.name} className={`rounded-2xl p-8 flex flex-col justify-between ${index === 1 ? 'border border-cyan-400 bg-slate-900 shadow-xl shadow-cyan-950/20' : 'border border-slate-800 bg-slate-900/60'}`}>
              <div>
                {index === 1 ? <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">{t('pricingPreview.mostPopular')}</span> : null}
                <h3 className="mt-4 text-lg font-bold text-white">{plan.name}</h3>
                <p className="mt-4 text-3xl font-bold text-white">{plan.price}<span className="text-sm font-normal text-slate-400">/mo</span></p>
                <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
              </div>
              <Link href="/pricing" className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${index === 1 ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300' : 'border border-slate-700 text-white hover:border-cyan-400'}`}>{plan.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-slate-900 px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">{t('finalCta.title')}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="rounded-lg bg-cyan-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('finalCta.primary')}</Link>
          <Link href="/buy" className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-3.5 font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800">{t('finalCta.secondary')}</Link>
        </div>
      </section>
    </div>
  );
}
