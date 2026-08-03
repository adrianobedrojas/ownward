import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { capitalizeFirst } from '@/lib/documents';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('buy.title'), description: t('buy.description') };
}

interface SearchParams {
  search?: string;
  category?: string;
  location?: string;
}

export default async function MarketplacePage({ params: pageParams, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await pageParams;
  const t = await getTranslations('Buy');
  const params = await searchParams;
  const searchQuery = params.search?.trim() || '';
  const categoryQuery = params.category || '';
  const locationQuery = params.location?.trim() || '';

  const supabase = await createClient();
  const now = new Date().toISOString();
  let query = supabase
    .from('marketplace_public_listings')
    .select('id,slug,business_name,category,location,summary_en,summary_es,asking_price,annual_revenue,year_established,featured_until,published_at');

  if (searchQuery) query = query.ilike('business_name', `%${searchQuery}%`);
  if (categoryQuery) query = query.eq('category', categoryQuery);
  if (locationQuery) query = query.ilike('location', `%${locationQuery}%`);

  const { data: allListings = [], error } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) console.error('Error fetching marketplace listings:', error.message);

  const listings = allListings ?? [];
  const featuredListings = listings.filter((listing) => listing.featured_until && new Date(listing.featured_until) > new Date(now));
  const featuredIds = new Set(featuredListings.map((listing) => listing.id));
  const normalListings = listings.filter((listing) => !featuredIds.has(listing.id));
  const buyerPoints = t.raw('buyersPoints') as string[];
  const sellerPoints = t.raw('sellersPoints') as string[];

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('heroBadge')}</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{t('heroTitle')}</h1>
          <p className="mt-3 max-w-2xl text-slate-400">{t('heroDescription')}</p>
        </div>
        <Link href="/sell" className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300">{t('sellCta')}</Link>
      </div>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">{t('searchTitle')}</h2>
        <form method="get" className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="search" className="block text-sm font-semibold text-slate-300">{t('businessLabel')}</label>
            <input id="search" name="search" type="search" defaultValue={searchQuery} placeholder={t('businessPlaceholder')} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600" />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-slate-300">{t('categoryLabel')}</label>
            <select id="category" name="category" defaultValue={categoryQuery} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300">
              <option value="">{t('categories.all')}</option>
              <option value="services">{t('categories.services')}</option>
              <option value="food">{t('categories.food')}</option>
              <option value="retail">{t('categories.retail')}</option>
              <option value="construction">{t('categories.construction')}</option>
              <option value="marketing">{t('categories.marketing')}</option>
              <option value="technology">{t('categories.technology')}</option>
              <option value="other">{t('categories.other')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-slate-300">{t('locationLabel')}</label>
            <input id="location" name="location" type="text" defaultValue={locationQuery} placeholder={t('locationPlaceholder')} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{t('searchButton')}</button>
          </div>
        </form>
      </section>

      {featuredListings.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{t('featuredTitle')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('featuredDescription')}</p>
            </div>
            <p className="text-sm text-slate-500">{t('featuredCount', { count: featuredListings.length })}</p>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">{featuredListings.map((business) => renderListing(business, true))}</div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('allTitle')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('allDescription')}</p>
          </div>
          <p className="text-sm text-slate-500">{t('listingCount', { count: listings.length, plural: listings.length === 1 ? '' : 's' })}</p>
        </div>
        {listings.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-lg font-semibold text-white">{t('noBusinessesTitle')}</p>
            <p className="mt-2 text-sm text-slate-400">{t('noBusinessesDescription')}</p>
          </div>
        ) : normalListings.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">{t('allFeatured')}</p>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-3">{normalListings.map((business) => renderListing(business, false))}</div>
        )}
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('buyersBadge')}</p>
          <h2 className="mt-3 text-2xl font-bold text-white">{t('buyersTitle')}</h2>
          <ul className="mt-5 space-y-3 text-sm text-slate-300">{buyerPoints.map((point) => <li key={point}>{point}</li>)}</ul>
          <Link href="/guide/buy/sba-loan-qualification" className="mt-6 inline-block text-sm font-semibold text-cyan-300 hover:underline">{t('buyersCta')}</Link>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('sellersBadge')}</p>
          <h2 className="mt-3 text-2xl font-bold text-white">{t('sellersTitle')}</h2>
          <ul className="mt-5 space-y-3 text-sm text-slate-300">{sellerPoints.map((point) => <li key={point}>{point}</li>)}</ul>
          <Link href="/sell" className="mt-6 inline-block rounded-lg border border-cyan-400 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10">{t('sellersCta')}</Link>
        </article>
      </section>
    </section>
  );

  function renderListing(
    business: {
      id: string;
      slug: string | null;
      business_name: string | null;
      category: string | null;
      location: string | null;
      summary_en: string | null;
      summary_es: string | null;
      asking_price: number | null;
      annual_revenue: number | null;
      year_established: number | null;
    },
    featured: boolean,
  ) {
    const summary = locale === 'es'
      ? (business.summary_es ?? business.summary_en)
      : (business.summary_en ?? business.summary_es);
    return (
      <article key={business.id} className={`flex flex-col rounded-xl p-6 transition ${featured ? 'border border-amber-500/40 bg-slate-900 ring-1 ring-amber-500/10 hover:border-amber-400' : 'border border-slate-800 bg-slate-900 hover:border-cyan-400'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">{business.category ? capitalizeFirst(business.category) : t('categoryFallback')}</span>
          {featured ? <div className="flex items-center gap-2"><span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">★ {t('featuredTitle').split(' ')[0]}</span><span className="text-xs text-slate-500">{t('promoted')}</span></div> : null}
        </div>
        <h3 className="mt-5 text-xl font-semibold text-white">{business.business_name}</h3>
        <p className="mt-1 text-sm text-slate-400">{business.location}</p>
        <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">{summary || t('noSummary')}</p>
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-slate-800 py-4">
          <div>
            <p className="text-xs text-slate-500">{t('askingPrice')}</p>
            <p className="mt-1 text-sm font-semibold text-white">{business.asking_price ? `$${Number(business.asking_price).toLocaleString()}` : t('notSet')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('revenue')}</p>
            <p className="mt-1 text-sm font-semibold text-white">{business.annual_revenue ? `$${Number(business.annual_revenue).toLocaleString()}` : t('notSet')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('established')}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-400">{business.year_established || t('na')}</p>
          </div>
        </div>
        <Link href={`/b/${business.slug}`} className={`mt-5 rounded-lg px-4 py-3 text-center text-sm font-semibold transition ${featured ? 'bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-slate-950' : 'bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950'}`}>{t('viewDetails')}</Link>
      </article>
    );
  }
}
