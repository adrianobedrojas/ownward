import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import PublicListingPresentation from '@/components/listing-studio/PublicListingPresentation';
import {
  buildBusinessListingSeoTitle,
  createMetadata,
  getAbsoluteUrl,
  serializeJsonLd,
} from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

type PublicListingRow = {
  id: string;
  slug: string;
  business_name: string;
  is_confidential: boolean | null;
  teaser_title: string | null;
  category: string | null;
  location: string | null;
  headline_en: string | null;
  headline_es: string | null;
  summary: string | null;
  summary_en: string | null;
  summary_es: string | null;
  highlights_en: string | null;
  highlights_es: string | null;
  growth_opportunities_en: string | null;
  growth_opportunities_es: string | null;
  reason_for_selling_en: string | null;
  reason_for_selling_es: string | null;
  asking_price: number | null;
  annual_revenue: number | null;
  cash_flow: number | null;
  year_established: number | null;
  currency: string | null;
  seller_financing: boolean | null;
  inventory_included: boolean | null;
  real_estate_included: boolean | null;
  owner_involvement_hours: number | null;
  number_of_employees: number | null;
  featured_until: string | null;
  published_at: string | null;
};

const getPublicListingRow = cache(async (slug: string): Promise<PublicListingRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('business_listing_public_detail')
    .select(
      'id, slug, business_name, is_confidential, teaser_title, category, location, headline_en, headline_es, summary, summary_en, summary_es, highlights_en, highlights_es, growth_opportunities_en, growth_opportunities_es, reason_for_selling_en, reason_for_selling_es, asking_price, annual_revenue, cash_flow, year_established, currency, seller_financing, inventory_included, real_estate_included, owner_involvement_hours, number_of_employees, featured_until, published_at'
    )
    .eq('slug', slug)
    .maybeSingle();

  return data ?? null;
});

function getLocalizedValue(locale: string, englishValue: string | null, spanishValue: string | null, fallback?: string | null) {
  if (locale === 'es') {
    return spanishValue ?? englishValue ?? fallback ?? null;
  }

  return englishValue ?? spanishValue ?? fallback ?? null;
}

function getPublicTitle(listing: PublicListingRow) {
  return listing.is_confidential
    ? (listing.teaser_title ?? listing.business_name ?? '')
    : listing.business_name;
}

function buildListingDescription(locale: string, listing: PublicListingRow) {
  return getLocalizedValue(
    locale,
    listing.summary_en,
    listing.summary_es,
    listing.summary ?? getLocalizedValue(locale, listing.headline_en, listing.headline_es)
  ) ?? (locale === 'es' ? 'Explora este negocio publicado en Ownward Hub.' : 'Explore this public business listing on Ownward Hub.');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const listing = await getPublicListingRow(slug);

  if (!listing) {
    return {};
  }

  return createMetadata({
    locale,
    pathname: `/b/${listing.slug}`,
    title: buildBusinessListingSeoTitle(locale, getPublicTitle(listing), listing.location),
    description: buildListingDescription(locale, listing),
  });
}

export default async function PublicBusinessPage({ params }: Props) {
  const { locale, slug } = await params;
  const supabase = await createClient();
  const listing = await getPublicListingRow(slug);

  if (!listing) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialSaved = false;
  if (user) {
    const { data: saved } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing.id)
      .maybeSingle();
    initialSaved = !!saved;
  }

  const isOwner = false;

  const { data: rawMedia } = await supabase
    .from('listing_media')
    .select('id, storage_path, alt_text_en, alt_text_es, caption_en, caption_es, sort_order, is_cover')
    .eq('listing_id', listing.id)
    .order('sort_order', { ascending: true });

  const adminClient = createAdminClient();
  const media = await Promise.all(
    (rawMedia ?? []).map(async (m) => {
      try {
        const { data: signed } = await adminClient.storage
          .from('listing-images')
          .createSignedUrl(m.storage_path, 3600);
        return {
          id: m.id,
          signedUrl: signed?.signedUrl ?? null,
          altTextEn: m.alt_text_en ?? undefined,
          altTextEs: m.alt_text_es ?? undefined,
          captionEn: m.caption_en ?? undefined,
          captionEs: m.caption_es ?? undefined,
          isCover: m.is_cover,
          sortOrder: m.sort_order,
        };
      } catch {
        return {
          id: m.id,
          signedUrl: null,
          altTextEn: m.alt_text_en ?? undefined,
          altTextEs: m.alt_text_es ?? undefined,
          captionEn: m.caption_en ?? undefined,
          captionEs: m.caption_es ?? undefined,
          isCover: m.is_cover,
          sortOrder: m.sort_order,
        };
      }
    })
  );

  const publicTitle = getPublicTitle(listing);
  const headline = getLocalizedValue(locale, listing.headline_en, listing.headline_es);
  const summary = getLocalizedValue(locale, listing.summary_en, listing.summary_es, listing.summary);
  const highlights = getLocalizedValue(locale, listing.highlights_en, listing.highlights_es);
  const growthOpportunities = getLocalizedValue(locale, listing.growth_opportunities_en, listing.growth_opportunities_es);
  const reasonForSelling = getLocalizedValue(locale, listing.reason_for_selling_en, listing.reason_for_selling_es);
  const canonicalUrl = getAbsoluteUrl(`/b/${listing.slug}`, locale === 'es' ? 'es' : 'en');
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'es' ? 'Comprar negocios' : 'Buy businesses',
        item: getAbsoluteUrl('/buy', locale === 'es' ? 'es' : 'en'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: publicTitle,
        item: canonicalUrl,
      },
    ],
  };

  const listingData = {
    id: listing.id,
    slug: listing.slug,
    publicTitle,
    category: listing.category,
    location: listing.location,
    summary,
    headline,
    highlights,
    growth_opportunities: growthOpportunities,
    reason_for_selling: reasonForSelling,
    asking_price: listing.asking_price,
    annual_revenue: listing.annual_revenue,
    cash_flow: listing.cash_flow,
    year_established: listing.year_established,
    currency: listing.currency ?? 'USD',
    seller_financing: listing.seller_financing ?? false,
    inventory_included: listing.inventory_included ?? false,
    real_estate_included: listing.real_estate_included ?? false,
    owner_involvement_hours: listing.owner_involvement_hours,
    number_of_employees: listing.number_of_employees,
    featured_until: listing.featured_until,
    published_at: listing.published_at,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <PublicListingPresentation
        listing={listingData}
        media={media}
        locale={locale}
        isOwner={isOwner}
        isSignedIn={!!user}
        initialSaved={initialSaved}
      />
    </>
  );
}
