import { Link } from '@/i18n/navigation';
import ListingInterestPanel from "@/components/ListingInterestPanel";

export type PublicListingData = {
  id: string;
  slug: string;
  publicTitle: string; // teaser or business_name
  category: string | null;
  location: string | null;
  summary: string | null;
  headline: string | null;
  highlights: string | null;
  growth_opportunities: string | null;
  reason_for_selling: string | null;
  asking_price: number | null;
  annual_revenue: number | null;
  cash_flow: number | null;
  year_established: number | null;
  currency: string;
  seller_financing: boolean;
  inventory_included: boolean;
  real_estate_included: boolean;
  owner_involvement_hours: number | null;
  number_of_employees: number | null;
  featured_until: string | null;
  published_at: string | null;
  // user_id intentionally excluded
};

export type MediaItem = {
  id: string;
  signedUrl: string | null;
  altTextEn?: string;
  altTextEs?: string;
  captionEn?: string;
  captionEs?: string;
  isCover: boolean;
  sortOrder: number;
};

interface Props {
  listing: PublicListingData;
  media: MediaItem[];
  locale: string;
  isOwner?: boolean;
  isSignedIn?: boolean;
  initialSaved?: boolean;
  isOwnerPreview?: boolean;
}


function getLocalizedMediaText(
  locale: string,
  englishValue: string | undefined,
  spanishValue: string | undefined,
  fallback: string
): string {
  const preferred = locale === 'es'
    ? (spanishValue ?? englishValue)
    : (englishValue ?? spanishValue);

  return preferred?.trim() || fallback;
}

function formatCurrency(amount: number | null, currency: string): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PublicListingPresentation({
  listing,
  media,
  locale,
  isOwner = false,
  isSignedIn = false,
  initialSaved = false,
  isOwnerPreview = false,
}: Props) {
  const isActiveFeatured =
    listing.featured_until && new Date(listing.featured_until) > new Date();

  const coverPhoto = media.find((m) => m.isCover) ?? media[0] ?? null;
  const galleryPhotos = media.filter((m) => !m.isCover).slice(0, 8);
  const coverPhotoAlt = coverPhoto
    ? getLocalizedMediaText(locale, coverPhoto.altTextEn, coverPhoto.altTextEs, listing.publicTitle)
    : listing.publicTitle;
  const breadcrumbLabel = locale === 'es' ? 'Comprar negocios' : 'Buy businesses';
  const galleryLabel = locale === 'es' ? 'Galería' : 'Gallery';
  const noPhotosLabel = locale === 'es' ? 'No se proporcionaron fotos' : 'No photos provided';

  const revenueMultiple =
    listing.asking_price && listing.annual_revenue && listing.annual_revenue > 0
      ? (listing.asking_price / listing.annual_revenue).toFixed(2)
      : null;

  const cashFlowMultiple =
    listing.asking_price && listing.cash_flow && listing.cash_flow > 0
      ? (listing.asking_price / listing.cash_flow).toFixed(2)
      : null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 text-slate-100">
      {isOwnerPreview && (
        <div className="mb-6 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-300">
          This is a private owner preview. Buyers will see this exact view when your listing is published.
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/buy" className="transition hover:text-white">{breadcrumbLabel}</Link>
        <span aria-hidden="true">›</span>
        <span className="text-slate-200">{listing.publicTitle}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <article className="lg:col-span-2 space-y-6">
          {/* Cover photo */}
          {coverPhoto?.signedUrl ? (
            <div className="rounded-2xl overflow-hidden border border-slate-800">
              <img
                src={coverPhoto.signedUrl}
                alt={coverPhotoAlt}
                className="w-full aspect-video object-cover"
                loading="eager"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center">
              <p className="text-slate-600 text-sm">{noPhotosLabel}</p>
            </div>
          )}

          {/* Header */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              {listing.category && (
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300 capitalize">
                  {listing.category}
                </span>
              )}
              {isActiveFeatured && (
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">
                  ★ Featured
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {listing.publicTitle}
            </h1>
            {listing.location && (
              <p className="mt-2 text-sm text-slate-400">{listing.location}</p>
            )}

            {/* Headline */}
            {listing.headline && (
              <p className="mt-4 text-lg font-medium text-slate-200">{listing.headline}</p>
            )}

            {/* Summary */}
            {listing.summary ? (
              <p className="mt-4 text-base leading-7 text-slate-300 whitespace-pre-line">
                {listing.summary}
              </p>
            ) : (
              <p className="mt-4 text-base text-slate-500 italic">No description provided.</p>
            )}

            {/* Financial metrics */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3 border-t border-slate-800 pt-6">
              <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Asking price</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrency(listing.asking_price, listing.currency)}
                </p>
              </article>
              <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Annual revenue</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrency(listing.annual_revenue, listing.currency)}
                </p>
              </article>
              <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Cash flow / SDE</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrency(listing.cash_flow, listing.currency)}
                </p>
              </article>
            </div>

            {/* Valuation multiples (informational only) */}
            {(revenueMultiple || cashFlowMultiple) && (
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">
                  Informational context only — not a valuation, appraisal, or recommendation.
                </p>
                <div className="flex flex-wrap gap-4">
                  {revenueMultiple && (
                    <span className="text-xs text-slate-400">Price/Revenue: {revenueMultiple}×</span>
                  )}
                  {cashFlowMultiple && (
                    <span className="text-xs text-slate-400">Price/Cash Flow: {cashFlowMultiple}×</span>
                  )}
                </div>
              </div>
            )}

            {/* Details grid */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm border-t border-slate-800 pt-6">
              {listing.year_established && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Established</span>
                  <span className="text-slate-200">{listing.year_established}</span>
                </div>
              )}
              {typeof listing.number_of_employees === "number" && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Employees</span>
                  <span className="text-slate-200">{listing.number_of_employees}</span>
                </div>
              )}
              {typeof listing.owner_involvement_hours === "number" && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Owner involvement</span>
                  <span className="text-slate-200">{listing.owner_involvement_hours} hrs/week</span>
                </div>
              )}
              {listing.seller_financing && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Seller financing</span>
                  <span className="text-emerald-400">Available</span>
                </div>
              )}
              {listing.inventory_included && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Inventory</span>
                  <span className="text-slate-200">Included</span>
                </div>
              )}
              {listing.real_estate_included && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Real estate</span>
                  <span className="text-slate-200">Included</span>
                </div>
              )}
            </div>
          </div>

          {/* Highlights */}
          {listing.highlights && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-bold text-white mb-3">Operational highlights</h2>
              <p className="text-slate-300 leading-7 whitespace-pre-line">{listing.highlights}</p>
            </section>
          )}

          {/* Growth opportunities */}
          {listing.growth_opportunities && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-bold text-white mb-3">Growth opportunities</h2>
              <p className="text-slate-300 leading-7 whitespace-pre-line">{listing.growth_opportunities}</p>
            </section>
          )}

          {/* Reason for selling */}
          {listing.reason_for_selling && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-bold text-white mb-3">Reason for selling</h2>
              <p className="text-slate-300 leading-7">{listing.reason_for_selling}</p>
            </section>
          )}

          {/* Photo gallery */}
          {galleryPhotos.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-4">{galleryLabel}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {galleryPhotos.map((photo) => (
                  photo.signedUrl ? (
                    <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-800">
                      <img
                        src={photo.signedUrl}
                        alt={getLocalizedMediaText(locale, photo.altTextEn, photo.altTextEs, listing.publicTitle)}
                        className="w-full aspect-video object-cover"
                        loading="lazy"
                      />
                      {getLocalizedMediaText(locale, photo.captionEn, photo.captionEs, '').trim() ? (
                        <p className="px-3 py-2 text-xs text-slate-400">{getLocalizedMediaText(locale, photo.captionEn, photo.captionEs, '')}</p>
                      ) : null}
                    </div>
                  ) : null
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Interest panel sidebar */}
        <aside className="lg:col-span-1">
          {!isOwner && !isOwnerPreview ? (
            <div className="sticky top-6">
              <ListingInterestPanel
                listingId={listing.id}
                listingName={listing.publicTitle}
                listingSlug={listing.slug}
                isSignedIn={isSignedIn}
                initialSaved={initialSaved}
              />
              <p className="mt-4 text-center text-xs text-slate-500">
                Need more information?{" "}
                <span className="text-slate-400">
                  Ask the seller a question or request additional details.
                </span>
              </p>
            </div>
          ) : isOwnerPreview ? (
            <div className="sticky top-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
              <p className="text-sm font-semibold text-cyan-300">Owner preview</p>
              <p className="mt-2 text-xs text-slate-400">
                Buyers will see a contact and interest panel here when your listing is published.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
